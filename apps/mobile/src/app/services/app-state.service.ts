import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { I18nService, projectIcelandPoint } from '@islandhub/domain';
import type {
  AddRouteStopRequest,
  AttractionRouteSummary,
  CreateTodayRouteRequest,
  ExploreQuery,
  ExploreResponse,
  HealthResponse,
  Hub,
  InsertPreviewResponse,
  MeResponse,
  RouteSuggestion,
  RouteSuggestionsResponse,
  SafetyStatus,
  SaveSpotResponse,
  Spot,
  SpotContextResponse,
  StartSuggestedRouteRequest,
  TodayResponse,
  TripResponse,
  VehicleProfile,
} from '@islandhub/domain';
import type { LibChipVariant } from '@islandhub/ui';
import { filter } from 'rxjs';
import { AddRouteWizardService } from '../add-route-screen/add-route-wizard.service';
import type { WizardBase } from '../add-route-screen/add-route-wizard.service';
import { AuthService } from './auth.service';
import { IslandhubApiService } from './islandhub-api.service';
import { RoutePlanningService } from './route-planning.service';
import { SpotActionWizardService } from '../spot-action-screen/spot-action-wizard.service';

type VehicleFilter = 'car_2wd' | 'car_4wd' | 'any';
type SetupPlanningMode = 'draft' | 'hub' | 'road-trip';

type RouteSheetMode = 'insert' | 'create' | 'alternatives' | 'stale';

type MainTab = 'explore' | 'routes' | 'today' | 'trip' | 'profile';

type ApiState = 'checking' | 'online' | 'offline';

type RouteSummary = AttractionRouteSummary & { suggestionId?: string; expiresAt?: string };

const emptyHub: Hub = {
  id: '',
  name: 'Loading hub',
  location: { lat: 64.9, lon: -18.5 },
  dateRange: '',
  nights: 0,
};

const emptyExplore: ExploreResponse = {
  hub: emptyHub,
  dateLabel: 'Loading',
  vehicle: 'unknown',
  dataAgeMinutes: 0,
  spots: [],
  smartRoutes: [],
};

const emptyToday: TodayResponse = {
  title: 'Loading today',
  dateLabel: 'Today',
  recheckedMinutesAgo: 0,
  stopProgress: '0/0',
  driveMinutes: 0,
  daylightLeft: '',
  update: 'Loading live route data.',
  stops: [],
};

const emptyTrip: TripResponse = {
  trip: {
    title: 'Loading trip',
    dates: '',
    vehicle: 'unknown',
    pace: '',
    hub: emptyHub,
    days: [],
  },
};

const genericSpotBackground = 'linear-gradient(135deg, #dfe7e2 0%, #8da39a 48%, #52655f 100%)';
const SETUP_STORAGE_KEY = 'islandhub.mobile.setup';

interface SetupScreen {
  kicker: string;
  title: string;
  body: string;
}

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

interface StoredSetupState {
  done: boolean;
  step: number;
  planningMode?: SetupPlanningMode;
  vehicle?: VehicleProfile;
  rangeStart?: string;
  rangeEnd?: string;
}

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly activeTab = signal<MainTab>('explore');
  readonly wizard = inject(AddRouteWizardService);
  readonly spotActionWizard = inject(SpotActionWizardService);
  readonly setupStep = signal(0);
  readonly setupDone = signal(false);
  readonly authRoute = signal(false);
  readonly selectedSpot = signal<SpotContextResponse | null>(null);
  readonly filterOpen = signal(false);
  readonly routeSheet = signal<{ mode: RouteSheetMode; context: SpotContextResponse; preview?: InsertPreviewResponse } | null>(null);
  readonly selectedRoute = signal<RouteSummary | null>(null);
  readonly returnSheet = signal(false);
  readonly actionNotice = signal<string | null>(null);
  readonly offlineMode = signal(false);
  readonly apiHealth = signal<HealthResponse | null>(null);
  readonly me = signal<MeResponse | null>(null);
  readonly apiState = signal<ApiState>('checking');
  readonly explore = signal<ExploreResponse>(emptyExplore);
  readonly today = signal<TodayResponse>(emptyToday);
  readonly trip = signal<TripResponse>(emptyTrip);
  readonly routeSuggestions = signal<RouteSummary[]>([]);
  readonly savedSpotIds = signal<string[]>([]);
  readonly exploreLoading = signal(false);
  readonly activeRoute = signal(true);
  readonly setupPlanningSelection = signal<SetupPlanningMode | null>(null);
  readonly setupVehicleSelection = signal<VehicleProfile | null>(null);
  readonly setupSelectedStartDate = signal<string | null>(null);
  readonly setupSelectedEndDate = signal<string | null>(null);
  readonly statusFilters = signal<SafetyStatus[]>(['green', 'yellow', 'unknown', 'red']);
  readonly categoryFilters = signal<string[]>([]);
  readonly categoryOptions = signal<string[]>([]);
  readonly vehicleFilter = signal<VehicleFilter>('car_2wd');
  readonly showFRoads = signal(true);
  readonly maxDriveMinutes = signal(180);

  readonly setupScreens = computed(() => buildSetupScreens(this.setupPlanningSelection() === 'hub'));

  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly api = inject(IslandhubApiService);
  private readonly auth = inject(AuthService);
  private readonly routePlanning = inject(RoutePlanningService);
  private readonly i18n = inject(I18nService);
  private readonly storage = this.resolveStorage();
  private exploreRequestId = 0;
  private lastLoadedSessionKey: string | null = null;

  readonly visibleSpots = computed(() => {
    const order: Record<SafetyStatus, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };
    const selectedStatuses = this.statusFilters();
    const selectedCategories = this.categoryFilters();
    const vehicle = this.vehicleFilter();
    const showFRoads = this.showFRoads();
    const maxDrive = this.maxDriveMinutes();

    return this.explore().spots.filter((spot) => {
      if (!selectedStatuses.includes(spot.status.status)) {
        return false;
      }

      if (selectedCategories.length > 0 && !selectedCategories.includes(spot.category)) {
        return false;
      }

      if (spot.driveMinutes > maxDrive) {
        return false;
      }

      if (vehicle === 'car_2wd' && spot.isFRoad && !showFRoads) {
        return false;
      }

      return true;
    }).sort((left, right) => {
      const statusDelta = order[left.status.status] - order[right.status.status];
      return statusDelta === 0 ? left.driveMinutes - right.driveMinutes : statusDelta;
    });
  });

  readonly mapPoints = computed(() => [
    projectIcelandPoint('hub', this.explore().hub.name, this.explore().hub.location),
    ...this.visibleSpots().map((spot) => projectIcelandPoint(spot.id, spot.name, spot.location)),
  ]);

  readonly statusCounts = computed(() => this.visibleSpots().reduce<Record<SafetyStatus, number>>(
    (counts, spot) => ({ ...counts, [spot.status.status]: counts[spot.status.status] + 1 }),
    { green: 0, yellow: 0, red: 0, unknown: 0 },
  ));

  readonly selectedRouteStops = computed(() => this.routePlanning.selectedRouteStops(this.selectedRoute(), this.explore().spots));

  readonly availableCategories = computed<string[]>(() => Array.from(new Set([...this.categoryOptions(), ...this.explore().spots.map((spot) => spot.category)])));

  readonly nextStop = computed(() => this.today().stops.find((stop) => stop.state === 'active') ?? this.today().stops.find((stop) => stop.state === 'open'));

  readonly navigationLabel = computed(() => `-> Navigate to ${this.nextStop()?.title ?? 'next stop'}`);

  readonly savedCount = computed(() => this.savedSpotIds().length);

  readonly savedSpots = computed(() => this.savedSpotIds().map((spotId) => this.findSpot(spotId)).filter((spot): spot is Spot => Boolean(spot)));

  readonly setupSelectedDates = computed(() => {
    const start = this.setupSelectedStartDate();
    const end = this.setupSelectedEndDate();

    if (!start || !end) {
      return [];
    }

    return this.buildSetupDateRange(start, end);
  });

  readonly setupCalendar = computed(() => {
    const selectedDates = this.setupSelectedDates();
    const datedDays = this.trip().trip.days.filter((day) => day.date);
    const dates = selectedDates.length > 0 ? selectedDates : datedDays.map((day) => day.date!).filter(Boolean);
    const firstDate = dates[0];
    const monthLabel = firstDate
      ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${firstDate}T00:00:00.000Z`))
      : this.trip().trip.dates;
    const leadingEmptyCells = firstDate ? (new Date(`${firstDate}T00:00:00.000Z`).getUTCDay() + 6) % 7 : 0;

    return {
      monthLabel,
      dates,
      weekDays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      cells: [
        ...Array.from({ length: leadingEmptyCells }, (_, index) => ({ id: `empty-${index}`, label: '', inRange: false, edge: false })),
        ...dates.map((date, index) => ({
          id: date,
          label: Number(date.slice(-2)),
          inRange: true,
          edge: index === 0 || index === dates.length - 1,
        })),
      ],
    };
  });

  readonly insertPreviewLabels = computed(() => {
    const sheet = this.routeSheet();
    const preview = sheet?.preview;

    return {
      after: this.stopTitle(preview?.recommendedAfterStopId) ?? this.nextStop()?.title ?? this.explore().hub.name,
      before: this.stopTitle(preview?.recommendedBeforeStopId),
    };
  });

  readonly saferAlternatives = computed(() => {
    const excludedSpotId = this.routeSheet()?.context.spot.id;

    return this.visibleSpots()
      .filter((spot) => spot.id !== excludedSpotId && (spot.status.status === 'green' || spot.status.status === 'yellow'))
      .slice(0, 2);
  });

  readonly setupPlanningMode = computed<SetupPlanningMode>(() => this.setupPlanningSelection() ?? this.deriveSetupPlanningMode());

  readonly setupVehicle = computed<VehicleProfile>(() => this.setupVehicleSelection() ?? this.trip().trip.vehicle ?? 'unknown');

  readonly setupDateSummary = computed(() => {
    const selectedDates = this.setupSelectedDates();

    if (selectedDates.length > 0) {
      return {
        nights: Math.max(selectedDates.length - 1, 0),
        label: this.formatSetupDateRange(selectedDates[0], selectedDates[selectedDates.length - 1]),
        source: 'Setup',
      };
    }

    return {
      nights: this.explore().hub.nights,
      label: this.explore().hub.dateRange || this.trip().trip.dates,
      source: 'API trip',
    };
  });

  constructor() {
    this.restoreSetupState();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncRouteState());
    this.syncRouteState();
    effect(() => {
      if (!this.auth.ready()) {
        return;
      }

      const mode = this.auth.mode();
      const accessToken = this.auth.accessToken();

      if (mode === 'none') {
        this.resetSetupState();
        this.me.set(null);
        this.lastLoadedSessionKey = null;
        return;
      }

      this.restoreSetupState();
      const sessionKey = `${mode}:${accessToken ?? 'guest'}`;
      if (sessionKey === this.lastLoadedSessionKey) {
        return;
      }

      this.lastLoadedSessionKey = sessionKey;
      this.me.set(null);
      void this.loadApi();
    });
  }

  continueSetup(): void {
    if (this.setupStep() >= this.setupLastStepIndex()) {
      this.completeSetup();
      this.navigateToTab('explore');
      return;
    }

    this.setupStep.update((step) => step + 1);
    this.persistSetupState();
  }

  backSetup(): void {
    if (this.setupStep() <= 0) {
      return;
    }

    this.setupStep.update((step) => step - 1);
    this.persistSetupState();
  }

  skipSetup(): void {
    this.completeSetup();
    this.navigateToTab('explore');
  }

  retryApi(): void {
    this.offlineMode.set(false);
    void this.loadApi();
  }

  openSpot(spot: Spot): void {
    void this.api.getSpotContext(spot.id, this.activeTripDate())
      .then((context) => this.selectedSpot.set(context))
      .catch(() => {
        this.markApiOffline(`Could not load ${spot.name}.`);
        this.selectedSpot.set(null);
      });
  }

  openMapPoint(pointId: string): void {
    if (pointId === 'hub') {
      return;
    }

    const spot = this.explore().spots.find((candidate) => candidate.id === pointId);

    if (spot) {
      this.openSpot(spot);
    }
  }

  closeSpot(): void {
    this.selectedSpot.set(null);
  }

  createTodayRoute(): void {
    this.selectedSpot.set(null);
    this.navigateToTab('today');
  }

  navigateToTab(tab: MainTab): void {
    this.activeTab.set(tab);
    void this.router.navigateByUrl(`/${tab}`);
  }

  isSaved(spotId: string): boolean {
    return this.savedSpotIds().includes(spotId);
  }

  isAllCategories(): boolean {
    return this.categoryFilters().length === 0 || this.categoryFilters().length === this.availableCategories().length;
  }

  setCategoryPreset(category: string | null): void {
    this.categoryFilters.set(category ? [category] : []);
    void this.loadExplore();
  }

  async handleSpotPrimaryAction(): Promise<void> {
    const context = this.selectedSpot();

    if (!context) {
      return;
    }

    const modeByStatus: Record<SafetyStatus, RouteSheetMode> = {
      green: this.activeRoute() ? 'insert' : 'create',
      yellow: this.activeRoute() ? 'insert' : 'create',
      red: 'alternatives',
      unknown: 'stale',
    };

    this.selectedSpot.set(null);
    const mode = modeByStatus[context.spot.status.status];
    this.routeSheet.set({ mode, context });

    if (mode === 'insert') {
      try {
        const preview = await this.api.previewInsert(context.spot.id, this.activeTripDate());
        this.routeSheet.set({ mode, context, preview });
      } catch {
        this.markApiOffline('Could not load the route insert preview.');
      }
    }
  }

  closeRouteSheet(): void {
    this.routeSheet.set(null);
  }

  openRouteDetail(route: RouteSummary): void {
    this.selectedRoute.set(route);
    void this.router.navigateByUrl('/route-detail');
  }

  editRoute(route: RouteSummary): void {
    this.selectedRoute.set(route);
    this.wizard.initEdit(this.currentWizardBase(), route.id, route.title, route.spotIds);
    void this.router.navigateByUrl('/routes/add/step4');
  }

  openBestRoute(): void {
    const route = this.routeSuggestions()[0];

    if (route) {
      this.openRouteDetail(route);
    }
  }

  addCustomRoute(): void {
    this.wizard.init(this.currentWizardBase());
    void this.router.navigateByUrl('/routes/add/step1');
  }

  openSpotAction(spot: Spot): void {
    this.spotActionWizard.init(spot);
    void this.router.navigateByUrl('/spot-action/step1');
  }

  async addSpotToExistingRoute(routeId: string): Promise<void> {
    const spot = this.spotActionWizard.targetSpot();
    if (!spot) return;

    const route = this.routeSuggestions().find((candidate) => candidate.id === routeId);
    if (!route) return;

    try {
      const response = await this.api.addPlannedStop(routeId, spot.id);
      this.routeSuggestions.update((routes) => routes.map((candidate) => candidate.id === routeId ? response.route : candidate));
      this.actionNotice.set(this.i18n.t('route.spotAdded', { spot: spot.name, route: route.title }));
      void this.router.navigateByUrl('/routes');
    } catch {
      this.markApiOffline(`Could not add ${spot.name} to ${route.title}.`);
    }
  }

  closeRouteDetail(): void {
    this.selectedRoute.set(null);
    void this.router.navigateByUrl('/routes');
  }

  async applyWizardRouteEdit(): Promise<void> {
    const route = this.selectedRoute();

    if (!route) {
      void this.router.navigateByUrl('/routes');
      return;
    }

    try {
      const response = await this.api.updatePlannedRoute(route.id, {
        title: this.wizard.editingRouteTitle() ?? route.title,
        start: this.wizardBasePayload(this.wizard.base() ?? this.currentWizardBase()),
        spotIds: this.wizard.selectedStopIds(),
      });
      this.selectedRoute.set(response.route);
      this.routeSuggestions.update((routes) => routes.map((candidate) => candidate.id === response.route.id ? response.route : candidate));
      this.actionNotice.set(this.i18n.t('route.updated'));
      void this.router.navigateByUrl('/route-detail');
    } catch {
      this.markApiOffline('Could not update route.');
    }
  }

  routeDetailTotalMinutes(): number {
    const route = this.selectedRoute();

    if (!route) {
      return 0;
    }

    const stayTotal = this.selectedRouteStops().reduce((sum, entry) => sum + entry.spot.stayMinutes, 0);

    return route.driveMinutes + stayTotal;
  }

  removeSpotFromSelectedRoute(spotId: string): void {
    const route = this.selectedRoute();

    if (!route) {
      return;
    }

    const spotIds = route.spotIds.filter((id) => id !== spotId);
    this.selectedRoute.set({ ...route, spotIds, stops: spotIds.length });
  }

  dismissActionNotice(): void {
    this.actionNotice.set(null);
  }

  async insertRouteStop(position: 'recommended' | 'end'): Promise<void> {
    const sheet = this.routeSheet();

    if (!sheet) {
      return;
    }

    const spot = sheet.context.spot;
    const request: AddRouteStopRequest = { spotId: spot.id, position, date: this.activeTripDate() };

    try {
      const response = await this.api.addRouteStop(request);
      this.today.set(response.today);
      this.routeSheet.set(null);
      this.activeRoute.set(true);
      this.navigateToTab('today');
      return;
    } catch {
      this.markApiOffline(`Could not add ${spot.name} to today's route.`);
      return;
    }
  }

  async createRouteFromSpot(): Promise<void> {
    const sheet = this.routeSheet();

    if (!sheet) {
      return;
    }

    const spot = sheet.context.spot;
    const request: CreateTodayRouteRequest = { spotId: spot.id, date: this.activeTripDate(), replaceExisting: true };

    try {
      const response = await this.api.createTodayRoute(request);
      this.today.set(response.today);
      this.routeSheet.set(null);
      this.activeRoute.set(true);
      this.navigateToTab('today');
      this.actionNotice.set(response.today.update);
      return;
    } catch {
      this.markApiOffline(`Could not create today's route for ${spot.name}.`);
      return;
    }
  }

  async saveSelectedSpot(): Promise<void> {
    const context = this.selectedSpot();

    if (!context) {
      return;
    }

    await this.saveSpot(context.spot);
  }

  async saveSelectedSpotFromList(spot: Spot): Promise<void> {
    await this.saveSpot(spot);
  }

  async saveRouteSheetSpot(): Promise<void> {
    const sheet = this.routeSheet();

    if (!sheet) {
      return;
    }

    await this.saveSpot(sheet.context.spot);
    this.routeSheet.set(null);
  }

  async planRouteSheetSpotForLater(): Promise<void> {
    const sheet = this.routeSheet();

    if (!sheet) {
      return;
    }

    const spot = sheet.context.spot;

    try {
      const response = await this.api.planSpotForLater(spot.id);
      this.trip.set({ trip: response.trip });
      this.actionNotice.set(response.message);
    } catch {
      this.markApiOffline(`Could not plan ${spot.name} for later.`);
      return;
    }

    this.routeSheet.set(null);
    this.navigateToTab('trip');
  }

  async startRoute(route: RouteSummary): Promise<void> {
    const request: StartSuggestedRouteRequest = { suggestionId: route.suggestionId ?? route.id, date: this.activeTripDate(), replaceExisting: true };

    try {
      const response = await this.api.startSuggestedRoute(request);
      this.today.set(response.today);
      this.actionNotice.set(this.i18n.t('route.started', { route: route.title }));
    } catch {
      this.markApiOffline(`Could not start ${route.title}.`);
      return;
    }

    this.selectedRoute.set(null);
    this.activeRoute.set(true);
    this.navigateToTab('today');
  }

  routeSpotName(spotId: string): string {
    return this.findSpot(spotId)?.name ?? spotId;
  }

  routeSpotImage(spotId: string): string {
    const spot = this.findSpot(spotId);
    return spot ? this.spotBackground(spot) : genericSpotBackground;
  }

  spotBackground(spot: Spot): string {
    const imageUrl = spot.media?.find((media) => media.type === 'image' && media.url)?.url;

    return imageUrl ? `linear-gradient(145deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.24)), url("${imageUrl}")` : genericSpotBackground;
  }

  routeStatusSummary(route: AttractionRouteSummary): string {
    return route.highestStatus === 'yellow' ? '1 caution' : route.highestStatus === 'red' ? 'Closed stop' : route.highestStatus === 'unknown' ? 'Needs refresh' : 'All open';
  }

  routeCardClass(route: AttractionRouteSummary, index: number): string {
    return index === 0 ? 'recommended' : route.highestStatus === 'yellow' ? 'caution' : '';
  }

  openNavigation(): void {
    this.returnSheet.set(true);
  }

  async markActiveStopDone(): Promise<void> {
    const activeStop = this.today().stops.find((stop) => stop.state === 'active');

    if (!activeStop) {
      this.returnSheet.set(false);
      return;
    }

    try {
      const response = await this.api.markStopDone(activeStop.id, this.activeTripDate());
      this.today.set(response.today);
      this.returnSheet.set(false);
      return;
    } catch {
      this.markApiOffline(`Could not mark ${activeStop.title} as done.`);
      return;
    }
  }

  async cacheCurrentTripMap(): Promise<void> {
    if (!this.requireSignedIn('Sign in to sync offline maps across devices.')) {
      return;
    }

    const hub = this.explore().hub;

    try {
      const response = await this.api.cacheOfflineRegions({
        mode: 'map-area',
        label: `${hub.name} map area`,
        regions: [{ lat: hub.location.lat, lon: hub.location.lon, radiusKm: 60 }],
      });
      this.actionNotice.set(response.message);
      await this.loadMe();
    } catch {
      this.markApiOffline('Could not start offline cache.');
    }
  }

  async setProfilePreference(request: Partial<MeResponse['preferences']>): Promise<void> {
    if (!this.requireSignedIn('Sign in to save profile preferences.')) {
      return;
    }

    const current = this.me();
    if (!current) return;

    try {
      const update = await this.api.updatePreferences(request);
      this.me.set({ ...current, preferences: update.preferences, safety: update.safety });
    } catch {
      this.markApiOffline('Could not update profile preferences.');
    }
  }

  async toggleSafetyPreference(key: 'pushAlertsTomorrowRoute' | 'notifyStatusWorsensEnRoute'): Promise<void> {
    if (!this.requireSignedIn('Sign in to save safety preferences.')) {
      return;
    }

    const current = this.me();
    if (!current) return;

    try {
      const update = await this.api.updatePreferences({ safety: { [key]: !current.safety[key] } });
      this.me.set({ ...current, preferences: update.preferences, safety: update.safety });
    } catch {
      this.markApiOffline('Could not update safety preferences.');
    }
  }

  selectSetupPlanningMode(mode: SetupPlanningMode): void {
    this.setupPlanningSelection.set(mode);

    if (this.setupStep() > this.setupLastStepIndex()) {
      this.setupStep.set(this.setupLastStepIndex());
    }

    this.persistSetupState();
  }

  selectSetupVehicle(vehicle: VehicleProfile): void {
    this.setupVehicleSelection.set(vehicle);
    this.trip.update((trip) => ({
      trip: {
        ...trip.trip,
        vehicle,
      },
    }));
    this.setVehicleFilter(vehicle === 'unknown' ? 'any' : vehicle);
    this.persistSetupState();
  }

  setSetupDateRange(startDate: string, endDate: string): void {
    const [normalizedStart, normalizedEnd] = startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

    if (!this.isIsoDate(normalizedStart) || !this.isIsoDate(normalizedEnd)) {
      return;
    }

    this.setupSelectedStartDate.set(normalizedStart);
    this.setupSelectedEndDate.set(normalizedEnd);
    this.persistSetupState();
  }

  toggleStatusFilter(status: SafetyStatus): void {
    this.statusFilters.update((filters) => {
      if (filters.includes(status)) {
        return filters.length === 1 ? filters : filters.filter((candidate) => candidate !== status);
      }

      return [...filters, status];
    });
    void this.loadExplore();
  }

  toggleCategoryFilter(category: string): void {
    this.categoryFilters.update((filters) => {
      if (filters.includes(category)) {
        return filters.length === 1 ? filters : filters.filter((candidate) => candidate !== category);
      }

      return [...filters, category];
    });
    void this.loadExplore();
  }

  setVehicleFilter(vehicle: VehicleFilter): void {
    this.vehicleFilter.set(vehicle);

    if (vehicle !== 'car_2wd') {
      this.showFRoads.set(true);
      this.maxDriveMinutes.set(180);
    }

    void this.loadExplore();
  }

  setShowFRoads(showFRoads: boolean): void {
    this.showFRoads.set(showFRoads);
    void this.loadExplore();
  }

  setMaxDriveMinutes(maxDriveMinutes: number): void {
    this.maxDriveMinutes.set(maxDriveMinutes);
    void this.loadExplore();
  }

  resetFilters(): void {
    this.statusFilters.set(['green', 'yellow', 'unknown', 'red']);
    this.categoryFilters.set([]);
    this.vehicleFilter.set('car_2wd');
    this.showFRoads.set(true);
    this.maxDriveMinutes.set(180);
    void this.loadExplore();
  }

  statusClass(status: SafetyStatus): string {
    return `status-${status}`;
  }

  statusVariant(status: SafetyStatus): LibChipVariant {
    const map: Record<SafetyStatus, LibChipVariant> = {
      green: 'success',
      yellow: 'warning',
      red: 'danger',
      unknown: 'neutral',
    };
    return map[status];
  }

  mapPointStatus(pointId: string): SafetyStatus | 'unknown' {
    return this.explore().spots.find((spot) => spot.id === pointId)?.status.status ?? 'unknown';
  }

  statusCount(status: SafetyStatus): number {
    return this.statusCounts()[status];
  }

  minutesToDrive(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours > 0 ? `${hours}h ${remainder.toString().padStart(2, '0')}` : `${remainder}m`;
  }

  async setWizardTodayRoute(params: {
    baseName: string;
    destinationName: string;
    selectedStops: Spot[];
    directDriveMinutes: number;
    totalDriveMinutes: number;
  }): Promise<void> {
    try {
      const response = await this.api.createPlannedRoute({
        title: `${params.baseName} to ${params.destinationName}`,
        date: this.activeTripDate(),
        start: this.wizardBasePayload(this.wizard.base() ?? this.currentWizardBase()),
        destination: this.wizard.endHotel() ? this.wizardBasePayload(this.wizard.endHotel()!) : undefined,
        direction: this.wizard.tripType() === 'one-way' ? 'ONE-WAY' : 'LOOP',
        spotIds: params.selectedStops.map((spot) => spot.id),
        source: 'wizard',
        makeActiveToday: true,
        replaceExistingToday: true,
      });
      if (response.today) this.today.set(response.today);
      this.activeRoute.set(true);
      this.actionNotice.set(this.i18n.t('route.draftReadyToday'));
      this.navigateToTab('today');
    } catch {
      this.markApiOffline('Could not start route for today.');
    }
  }

  async saveWizardDraftDay(title: string): Promise<void> {
    try {
      await this.api.createPlannedRoute({
        title,
        start: this.wizardBasePayload(this.wizard.base() ?? this.currentWizardBase()),
        destination: this.wizard.endHotel() ? this.wizardBasePayload(this.wizard.endHotel()!) : undefined,
        direction: this.wizard.tripType() === 'one-way' ? 'ONE-WAY' : 'LOOP',
        spotIds: this.wizard.selectedStopIds(),
        source: 'draft_day',
      });
      await this.loadTrip();
      await this.loadRouteSuggestions();
      this.actionNotice.set(this.i18n.t('route.draftSavedToTrip'));
      this.navigateToTab('trip');
    } catch {
      this.markApiOffline('Could not save draft route.');
    }
  }

  setRouteEditorComingSoonNotice(): void {
    this.actionNotice.set(this.i18n.t('route.editorComingSoon'));
  }

  private syncRouteState(): void {
    const path = this.router.url.split('?')[0].replace(/^\//, '') || 'setup';
    this.authRoute.set(path === 'auth');

    if (path === 'explore' || path === 'routes' || path.startsWith('routes/add') || path === 'route-detail' || path === 'today' || path === 'trip' || path === 'profile' || path.startsWith('spot-action')) {
      let tab: MainTab;
      if (path === 'route-detail' || path.startsWith('routes/add')) {
        tab = 'routes';
      } else if (path.startsWith('spot-action')) {
        tab = 'explore';
      } else {
        tab = path as MainTab;
      }
      this.activeTab.set(tab);
    }
  }

  private async loadApi(): Promise<void> {
    this.apiState.set('checking');

    try {
      const health = await this.api.getHealth();
      this.apiHealth.set(health);
    } catch {
      this.markApiOffline('Could not reach the API.');
      return;
    }

    try {
      await this.loadTrip();
    } catch {
      this.actionNotice.set('Could not load the trip.');
    }

    const date = this.activeTripDate();

    try {
      const explore = await this.api.getExplore(this.exploreQuery());
      this.explore.set(explore);
      this.categoryOptions.set(this.mergeCategories(explore));
    } catch {
      this.actionNotice.set('Could not load Explore.');
    }

    try {
      const today = await this.api.getToday(date);
      this.today.set(today);
    } catch {
      this.today.set(emptyToday);
    }

    if (this.auth.isAuthenticated()) {
      try {
        await this.loadMe();
      } catch {
        this.actionNotice.set('Could not load profile.');
      }
    } else {
      this.me.set(null);
    }

    try {
      const saved = await this.api.getSavedSpots();
      this.savedSpotIds.set(saved.savedSpotIds);
    } catch {
      this.actionNotice.set('Could not load saved spots.');
    }

    try {
      const routeSuggestions = await this.api.getRouteSuggestions(date);
      this.applyRouteSuggestions(routeSuggestions);
    } catch {
      this.actionNotice.set('Could not load route suggestions.');
    }

    this.apiState.set('online');
    this.offlineMode.set(false);
  }

  private async loadExplore(): Promise<void> {
    const requestId = ++this.exploreRequestId;
    this.exploreLoading.set(true);

    try {
      const explore = await this.api.getExplore(this.exploreQuery());

      if (requestId !== this.exploreRequestId) {
        return;
      }

      this.explore.set(explore);
      this.categoryOptions.set(this.mergeCategories(explore));
      this.apiState.set('online');
    } catch {
      if (requestId === this.exploreRequestId) {
        this.markApiOffline('Could not refresh Explore.');
      }
    } finally {
      if (requestId === this.exploreRequestId) {
        this.exploreLoading.set(false);
      }
    }
  }

  private exploreQuery(): ExploreQuery {
    return {
      statuses: this.statusFilters(),
      categories: this.categoryFilters(),
      vehicle: this.vehicleFilter(),
      showFRoads: this.showFRoads(),
      maxDriveMinutes: this.maxDriveMinutes(),
      date: this.activeTripDate(),
    };
  }

  private mergeCategories(explore: ExploreResponse): string[] {
    return Array.from(new Set([...this.categoryOptions(), ...explore.spots.map((spot) => spot.category).filter(Boolean)]));
  }

  private async saveSpot(spot: Spot): Promise<void> {
    try {
      const response: SaveSpotResponse = await this.api.saveSpot(spot.id);
      this.actionNotice.set(response.message);
      this.savedSpotIds.set(response.savedSpotIds);
      await this.loadRouteSuggestions();
    } catch {
      this.markApiOffline(`Could not save ${spot.name}.`);
    }
  }

  private async loadRouteSuggestions(): Promise<void> {
    try {
      const response: RouteSuggestionsResponse = await this.api.getRouteSuggestions(this.activeTripDate());
      this.applyRouteSuggestions(response);
      this.savedSpotIds.set(response.savedSpots.map((spot) => spot.id));
    } catch {
      this.markApiOffline('Could not load route suggestions.');
    }
  }

  private async loadMe(): Promise<void> {
    const me = await this.api.getMe();
    this.me.set(me);
  }

  private async loadTrip(): Promise<void> {
    const trip = await this.api.getTrip();
    this.trip.set(trip);
  }

  private applyRouteSuggestions(response: RouteSuggestionsResponse): void {
    this.routeSuggestions.set(response.routes);
  }

  private stopTitle(stopId?: string): string | null {
    if (!stopId) {
      return null;
    }

    const stop = this.today().stops.find((candidate) => candidate.id === stopId || candidate.spotId === stopId);
    return stop?.title ?? null;
  }

  private activeTripDate(): string | undefined {
    return this.trip().trip.days.find((day) => day.today)?.date;
  }

  private requireSignedIn(message: string): boolean {
    if (this.auth.isAuthenticated()) {
      return true;
    }

    this.actionNotice.set(message);
    void this.router.navigateByUrl('/auth');
    return false;
  }

  private markApiOffline(message: string): void {
    this.apiState.set('offline');
    this.offlineMode.set(true);
    this.actionNotice.set(message);
  }

  currentWizardBase(): WizardBase {
    const hub = this.explore().hub;
    if (!hub.id) {
      return {
        id: 'keflavik-airport',
        name: 'Keflavik Airport',
        region: 'Suðurnes',
        type: 'airport',
        location: { lat: 63.985, lon: -22.6056 },
      };
    }
    return {
      id: hub.id,
      name: hub.name,
      region: 'Current trip',
      type: 'home',
      location: hub.location,
    };
  }

  private wizardBasePayload(place: { id: string; name: string; type?: string; location: { lat: number; lon: number } }): { id: string; name: string; type: string; location: { lat: number; lon: number } } {
    return {
      id: place.id,
      name: place.name,
      type: place.type ?? 'hotel',
      location: place.location,
    };
  }

  private findSpot(spotId: string): Spot | undefined {
    return this.explore().spots.find((spot) => spot.id === spotId);
  }

  private completeSetup(): void {
    this.setupDone.set(true);
    this.setupStep.set(this.setupLastStepIndex());
    this.persistSetupState();
  }

  private resetSetupState(): void {
    this.setupDone.set(false);
    this.setupStep.set(0);
    this.setupPlanningSelection.set(null);
    this.setupVehicleSelection.set(null);
    this.setupSelectedStartDate.set(null);
    this.setupSelectedEndDate.set(null);
    this.storage?.removeItem(SETUP_STORAGE_KEY);
  }

  private restoreSetupState(): void {
    const rawState = this.storage?.getItem(SETUP_STORAGE_KEY);
    if (!rawState) {
      return;
    }

    try {
      const state = JSON.parse(rawState) as Partial<StoredSetupState>;
      this.setupPlanningSelection.set(this.isSetupPlanningMode(state.planningMode) ? state.planningMode : null);
      this.setupVehicleSelection.set(this.isSetupVehicle(state.vehicle) ? state.vehicle : null);
      this.setupSelectedStartDate.set(this.isIsoDate(state.rangeStart) ? state.rangeStart : null);
      this.setupSelectedEndDate.set(this.isIsoDate(state.rangeEnd) ? state.rangeEnd : null);

      const normalizedStep = Math.max(0, Math.min(this.setupLastStepIndex(), Number.isFinite(state.step) ? Number(state.step) : 0));
      const done = Boolean(state.done);

      this.setupDone.set(done);
      this.setupStep.set(done ? this.setupLastStepIndex() : normalizedStep);
    } catch {
      this.storage?.removeItem(SETUP_STORAGE_KEY);
    }
  }

  private persistSetupState(): void {
    if (!this.storage || !this.auth.isAuthenticated()) {
      return;
    }

    const state: StoredSetupState = {
      done: this.setupDone(),
      step: this.setupDone() ? this.setupLastStepIndex() : this.setupStep(),
      planningMode: this.setupPlanningSelection() ?? undefined,
      vehicle: this.setupVehicleSelection() ?? undefined,
      rangeStart: this.setupSelectedStartDate() ?? undefined,
      rangeEnd: this.setupSelectedEndDate() ?? undefined,
    };

    this.storage.setItem(SETUP_STORAGE_KEY, JSON.stringify(state));
  }

  private deriveSetupPlanningMode(): SetupPlanningMode {
    const trip = this.trip().trip;

    if ((trip.totalRoutes ?? 0) > 0) {
      return 'road-trip';
    }

    if (trip.hub.id) {
      return 'hub';
    }

    return trip.status === 'draft' ? 'draft' : 'hub';
  }

  private setupLastStepIndex(): number {
    return this.setupScreens().length - 1;
  }

  private isSetupPlanningMode(value: unknown): value is SetupPlanningMode {
    return value === 'draft' || value === 'hub' || value === 'road-trip';
  }

  private isSetupVehicle(value: unknown): value is VehicleProfile {
    return value === 'car_2wd' || value === 'car_4wd' || value === 'unknown';
  }

  private isIsoDate(value: unknown): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private buildSetupDateRange(start: string, end: string): string[] {
    const dates: string[] = [];
    const current = new Date(`${start}T00:00:00.000Z`);
    const last = new Date(`${end}T00:00:00.000Z`);

    while (current <= last) {
      dates.push(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  }

  private formatSetupDateRange(start: string, end: string): string {
    const formatter = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    return `${formatter.format(new Date(`${start}T00:00:00.000Z`))} - ${formatter.format(new Date(`${end}T00:00:00.000Z`))}`;
  }

  private resolveStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }
}
