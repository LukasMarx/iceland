import { Injectable, computed, inject, signal } from '@angular/core';
import type { TripResponse, VehicleProfile } from '@islandhub/domain';
import { AuthService } from './auth.service';

export type SetupPlanningMode = 'draft' | 'hub' | 'road-trip';

interface SetupScreen {
  kicker: string;
  title: string;
  body: string;
}

interface StoredSetupState {
  done: boolean;
  step: number;
  planningMode?: SetupPlanningMode;
  vehicle?: VehicleProfile;
  rangeStart?: string;
  rangeEnd?: string;
}

const SETUP_STORAGE_KEY = 'islandhub.mobile.setup';

const baseSetupScreenContent: Omit<SetupScreen, 'kicker'>[] = [
  { title: "See what's open today.", body: 'Iceland changes by the hour. IslandHub merges road, weather, vehicle and daylight status into one daily decision surface.' },
  { title: 'Where are you in planning?', body: 'Pick the shortest setup path. You can switch later.' },
  { title: 'When are you going?', body: 'Your trip dates come from the active API trip and drive daylight and route checks.' },
  { title: 'What will you be driving?', body: '2WD hides F-roads by default. 4WD unlocks them, but river crossings still need judgement.' },
];

const hubSetupScreenContent: Omit<SetupScreen, 'kicker'> = {
  title: 'Where are you staying?',
  body: 'Your hub is the centre of every daily reach calculation. We use your active trip hub from the API.',
};

function buildSetupScreens(includeHubStep: boolean): SetupScreen[] {
  const screens = includeHubStep ? [...baseSetupScreenContent, hubSetupScreenContent] : baseSetupScreenContent;
  const total = screens.length;
  return screens.map((screen, index) => ({
    ...screen,
    kicker: `${String(index + 1).padStart(2, '0')} - ${String(total).padStart(2, '0')}`,
  }));
}

/** Pure helper moved out of the class so it can be used by computed signals. */
function deriveSetupPlanningMode(trip: TripResponse['trip']): SetupPlanningMode {
  if ((trip.totalRoutes ?? 0) > 0) return 'road-trip';
  if (trip.hub.id) return 'hub';
  return trip.status === 'draft' ? 'draft' : 'hub';
}

function buildSetupDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (current <= last) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function formatSetupDateRange(start: string, end: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${formatter.format(new Date(`${start}T00:00:00.000Z`))} - ${formatter.format(new Date(`${end}T00:00:00.000Z`))}`;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isSetupPlanningMode(value: unknown): value is SetupPlanningMode {
  return value === 'draft' || value === 'hub' || value === 'road-trip';
}

function isSetupVehicle(value: unknown): value is VehicleProfile {
  return value === 'car_2wd' || value === 'car_4wd' || value === 'unknown';
}

/**
 * Manages the onboarding wizard flow: steps, planning mode, vehicle, date range.
 * Persisted to localStorage for authenticated users.
 */
@Injectable({ providedIn: 'root' })
export class SetupStateService {
  private readonly auth = inject(AuthService);
  private readonly storage = this.resolveStorage();

  readonly setupStep = signal(0);
  readonly setupDone = signal(false);
  readonly setupPlanningSelection = signal<SetupPlanningMode | null>(null);
  readonly setupVehicleSelection = signal<VehicleProfile | null>(null);
  readonly setupSelectedStartDate = signal<string | null>(null);
  readonly setupSelectedEndDate = signal<string | null>(null);

  readonly setupScreens = computed(() => buildSetupScreens(this.setupPlanningSelection() === 'hub'));

  readonly setupPlanningMode = computed<SetupPlanningMode>(
    () => this.setupPlanningSelection() ?? deriveSetupPlanningMode(this.trip?.()?.trip ?? { title: '', dates: '', vehicle: 'unknown', pace: '', hub: { id: '', name: '', location: { lat: 0, lon: 0 }, dateRange: '', nights: 0 }, days: [] }),
  );

  readonly setupVehicle = computed<VehicleProfile>(
    () => this.setupVehicleSelection() ?? this.trip?.()?.trip?.vehicle ?? 'unknown',
  );

  readonly setupSelectedDates = computed(() => {
    const start = this.setupSelectedStartDate();
    const end = this.setupSelectedEndDate();
    if (!start || !end) return [];
    return buildSetupDateRange(start, end);
  });

  readonly setupCalendar = computed(() => {
    const selectedDates = this.setupSelectedDates();
    const tripDays = this.trip?.()?.trip?.days ?? [];
    const datedDays = tripDays.filter((d) => d.date);
    const dates = selectedDates.length > 0 ? selectedDates : datedDays.map((d) => d.date!).filter(Boolean);
    const firstDate = dates[0];
    const monthLabel = firstDate
      ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${firstDate}T00:00:00.000Z`))
      : this.trip?.()?.trip?.dates ?? '';
    const leadingEmptyCells = firstDate ? (new Date(`${firstDate}T00:00:00.000Z`).getUTCDay() + 6) % 7 : 0;
    return {
      monthLabel,
      dates,
      weekDays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      cells: [
        ...Array.from({ length: leadingEmptyCells }, (_, i) => ({ id: `empty-${i}`, label: '', inRange: false, edge: false })),
        ...dates.map((date, i) => ({ id: date, label: Number(date.slice(-2)), inRange: true, edge: i === 0 || i === dates.length - 1 })),
      ],
    };
  });

  readonly setupDateSummary = computed(() => {
    const selectedDates = this.setupSelectedDates();
    if (selectedDates.length > 0) {
      return {
        nights: Math.max(selectedDates.length - 1, 0),
        label: formatSetupDateRange(selectedDates[0], selectedDates[selectedDates.length - 1]),
        source: 'Setup' as const,
      };
    }
    const hub = this.trip?.()?.trip;
    return {
      nights: hub?.hub?.nights ?? 0,
      label: hub?.hub?.dateRange || hub?.dates || '',
      source: 'API trip' as const,
    };
  });

  // trip is set externally by the facade so SetupState doesn't need to import the facade.
  private trip: (() => TripResponse) | null = null;

  /** Called once by the facade after construction. */
  bindTrip(tripSignal: () => TripResponse): void {
    this.trip = tripSignal;
  }

  // ---- Setup flow --------------------------------------------------------

  continueSetup(onComplete: () => void): void {
    if (this.setupStep() >= this.lastStepIndex()) {
      this.complete();
      onComplete();
      return;
    }
    this.setupStep.update((s) => s + 1);
    this.persist();
  }

  backSetup(): void {
    if (this.setupStep() <= 0) return;
    this.setupStep.update((s) => s - 1);
    this.persist();
  }

  skipSetup(onComplete: () => void): void {
    this.complete();
    onComplete();
  }

  selectPlanningMode(mode: SetupPlanningMode): void {
    this.setupPlanningSelection.set(mode);
    if (this.setupStep() > this.lastStepIndex()) {
      this.setupStep.set(this.lastStepIndex());
    }
    this.persist();
  }

  selectVehicle(vehicle: VehicleProfile): void {
    this.setupVehicleSelection.set(vehicle);
    this.persist();
  }

  setDateRange(startDate: string, endDate: string): void {
    const [normalizedStart, normalizedEnd] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];
    if (!isIsoDate(normalizedStart) || !isIsoDate(normalizedEnd)) return;
    this.setupSelectedStartDate.set(normalizedStart);
    this.setupSelectedEndDate.set(normalizedEnd);
    this.persist();
  }

  restore(): void {
    const rawState = this.storage?.getItem(SETUP_STORAGE_KEY);
    if (!rawState) return;
    try {
      const state = JSON.parse(rawState) as Partial<StoredSetupState>;
      this.setupPlanningSelection.set(isSetupPlanningMode(state.planningMode) ? state.planningMode : null);
      this.setupVehicleSelection.set(isSetupVehicle(state.vehicle) ? state.vehicle : null);
      this.setupSelectedStartDate.set(isIsoDate(state.rangeStart) ? state.rangeStart : null);
      this.setupSelectedEndDate.set(isIsoDate(state.rangeEnd) ? state.rangeEnd : null);
      const maxIdx = this.lastStepIndex();
      const normalizedStep = Math.max(0, Math.min(maxIdx, Number.isFinite(state.step) ? Number(state.step) : 0));
      const done = Boolean(state.done);
      this.setupDone.set(done);
      this.setupStep.set(done ? maxIdx : normalizedStep);
    } catch {
      this.storage?.removeItem(SETUP_STORAGE_KEY);
    }
  }

  reset(): void {
    this.setupDone.set(false);
    this.setupStep.set(0);
    this.setupPlanningSelection.set(null);
    this.setupVehicleSelection.set(null);
    this.setupSelectedStartDate.set(null);
    this.setupSelectedEndDate.set(null);
    this.storage?.removeItem(SETUP_STORAGE_KEY);
  }

  // ---- Internal -----------------------------------------------------------

  private lastStepIndex(): number {
    return this.setupScreens().length - 1;
  }

  private complete(): void {
    this.setupDone.set(true);
    this.setupStep.set(this.lastStepIndex());
    this.persist();
  }

  private persist(): void {
    if (!this.storage || !this.auth.isAuthenticated()) return;
    const state: StoredSetupState = {
      done: this.setupDone(),
      step: this.setupDone() ? this.lastStepIndex() : this.setupStep(),
      planningMode: this.setupPlanningSelection() ?? undefined,
      vehicle: this.setupVehicleSelection() ?? undefined,
      rangeStart: this.setupSelectedStartDate() ?? undefined,
      rangeEnd: this.setupSelectedEndDate() ?? undefined,
    };
    this.storage.setItem(SETUP_STORAGE_KEY, JSON.stringify(state));
  }

  private resolveStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }
}
