import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { I18nService } from '@islandhub/domain';
import type {
  HealthResponse,
  InsertPreviewResponse,
  MeResponse,
  SaveSpotResponse,
  Spot,
  SpotContextResponse,
  TripResponse,
} from '@islandhub/domain';
import { filter } from 'rxjs';
import { AuthService } from './auth.service';
import { IslandhubApiService } from './islandhub-api.service';
import { ExploreStateService } from './explore-state.service';
import { FilterStateService } from './filter-state.service';
import { TodayStateService } from './today-state.service';
import { RouteStateService } from './route-state.service';
import { SetupStateService } from './setup-state.service';
import { SpotActionWizardService } from '../spot-action-screen/spot-action-wizard.service';

type RouteSheetMode = 'insert' | 'create' | 'alternatives' | 'stale';
type MainTab = 'explore' | 'routes' | 'today' | 'trip' | 'profile';
type ApiState = 'checking' | 'online' | 'offline';

const emptyTrip: TripResponse = {
  trip: {
    title: 'Loading trip',
    dates: '',
    vehicle: 'unknown',
    pace: '',
    hub: { id: '', name: 'Loading hub', location: { lat: 64.9, lon: -18.5 }, dateRange: '', nights: 0 },
    days: [],
  },
};

/**
 * Thin coordination facade for cross-cutting concerns:
 * auth readiness, active tab, action notices, API orchestration,
 * and spot action routing.
 *
 * Injected by the root App component; individual screens inject the
 * specific state services they need (ExploreStateService, etc.).
 */
@Injectable({ providedIn: 'root' })
export class AppStateFacade {
  // ---- Sub-services (public so screens can access directly) --------------

  readonly exploreState = inject(ExploreStateService);
  readonly filterState = inject(FilterStateService);
  readonly todayState = inject(TodayStateService);
  readonly routeState = inject(RouteStateService);
  readonly setupState = inject(SetupStateService);

  // ---- Private deps ------------------------------------------------------

  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly api = inject(IslandhubApiService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);
  readonly spotActionWizard = inject(SpotActionWizardService);

  // ---- Cross-cutting signals ---------------------------------------------

  readonly activeTab = signal<MainTab>('explore');
  readonly authRoute = signal(false);
  readonly selectedSpot = signal<SpotContextResponse | null>(null);
  readonly filterOpen = signal(false);
  readonly routeSheet = signal<{ mode: RouteSheetMode; context: SpotContextResponse; preview?: InsertPreviewResponse } | null>(null);
  readonly returnSheet = signal(false);
  readonly actionNotice = signal<string | null>(null);
  readonly offlineMode = signal(false);
  readonly apiHealth = signal<HealthResponse | null>(null);
  readonly apiState = signal<ApiState>('checking');
  readonly me = signal<MeResponse | null>(null);
  readonly trip = signal<TripResponse>(emptyTrip);
  readonly savedSpotIds = signal<string[]>([]);

  // ---- Computed -----------------------------------------------------------

  readonly savedCount = computed(() => this.savedSpotIds().length);
  readonly savedSpots = computed(() =>
    this.savedSpotIds()
      .map((id) => this.exploreState.findSpot(id))
      .filter((s): s is Spot => Boolean(s)),
  );

  readonly insertPreviewLabels = computed(() => {
    const sheet = this.routeSheet();
    const preview = sheet?.preview;
    return {
      after: this.todayState.stopTitle(preview?.recommendedAfterStopId) ?? this.todayState.nextStop()?.title ?? this.exploreState.explore().hub.name,
      before: this.todayState.stopTitle(preview?.recommendedBeforeStopId),
    };
  });

  readonly saferAlternatives = computed(() => {
    const excludedSpotId = this.routeSheet()?.context.spot.id;
    return this.exploreState.visibleSpots()
      .filter((s) => s.id !== excludedSpotId && (s.status.status === 'green' || s.status.status === 'yellow'))
      .slice(0, 2);
  });

  private lastLoadedSessionKey: string | null = null;

  constructor() {
    this.setupState.bindTrip(() => this.trip());
    this.setupState.restore();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncRouteState());
    this.syncRouteState();

    effect(() => {
      if (!this.auth.ready()) return;
      const mode = this.auth.mode();
      const accessToken = this.auth.accessToken();
      if (mode === 'none') {
        this.setupState.reset();
        this.me.set(null);
        this.lastLoadedSessionKey = null;
        return;
      }
      this.setupState.restore();
      const sessionKey = `${mode}:${accessToken ?? 'guest'}`;
      if (sessionKey === this.lastLoadedSessionKey) return;
      this.lastLoadedSessionKey = sessionKey;
      this.me.set(null);
      void this.loadApi();
    });
  }

  // ---- Navigation ---------------------------------------------------------

  navigateToTab(tab: MainTab): void {
    this.activeTab.set(tab);
    void this.router.navigateByUrl(`/${tab}`);
  }

  // ---- API orchestration --------------------------------------------------

  retryApi(): void {
    this.offlineMode.set(false);
    void this.loadApi();
  }

  // ---- Setup delegates ----------------------------------------------------

  continueSetup(): void {
    this.setupState.continueSetup(() => this.navigateToTab('explore'));
  }

  backSetup(): void {
    this.setupState.backSetup();
  }

  skipSetup(): void {
    this.setupState.skipSetup(() => this.navigateToTab('explore'));
  }

  // ---- Spot actions -------------------------------------------------------

  async openSpot(spot: Spot): Promise<void> {
    const context = await this.exploreState.openSpot(spot, this.activeTripDate(), (msg) => this.markApiOffline(msg));
    this.selectedSpot.set(context);
  }

  openMapPoint(pointId: string): void {
    if (pointId === 'hub') return;
    const spot = this.exploreState.explore().spots.find((s) => s.id === pointId);
    if (spot) void this.openSpot(spot);
  }

  closeSpot(): void {
    this.selectedSpot.set(null);
  }

  async handleSpotPrimaryAction(): Promise<void> {
    const context = this.selectedSpot();
    if (!context) return;

    const modeByStatus: Record<string, RouteSheetMode> = {
      green: this.todayState.activeRoute() ? 'insert' : 'create',
      yellow: this.todayState.activeRoute() ? 'insert' : 'create',
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

  async insertRouteStop(position: 'recommended' | 'end'): Promise<void> {
    const sheet = this.routeSheet();
    if (!sheet) return;
    const { spot } = sheet.context;
    const ok = await this.todayState.insertRouteStop(spot.id, position, this.activeTripDate(), (msg) => this.markApiOffline(msg));
    if (ok) {
      this.routeSheet.set(null);
      this.navigateToTab('today');
    }
  }

  async createRouteFromSpot(): Promise<void> {
    const sheet = this.routeSheet();
    if (!sheet) return;
    const { spot } = sheet.context;
    const today = await this.todayState.createRouteFromSpot(spot.id, spot.name, this.activeTripDate(), (msg) => this.markApiOffline(msg));
    if (today) {
      this.routeSheet.set(null);
      this.navigateToTab('today');
      this.actionNotice.set(today.update);
    }
  }

  async markActiveStopDone(): Promise<void> {
    const ok = await this.todayState.markActiveStopDone(this.activeTripDate(), (msg) => this.markApiOffline(msg));
    if (ok) this.returnSheet.set(false);
  }

  createTodayRoute(): void {
    this.selectedSpot.set(null);
    this.navigateToTab('today');
  }

  // ---- Save / Plan --------------------------------------------------------

  async saveSelectedSpot(): Promise<void> {
    const context = this.selectedSpot();
    if (!context) return;
    await this.saveSpot(context.spot);
  }

  async saveSelectedSpotFromList(spot: Spot): Promise<void> {
    await this.saveSpot(spot);
  }

  async saveRouteSheetSpot(): Promise<void> {
    const sheet = this.routeSheet();
    if (!sheet) return;
    await this.saveSpot(sheet.context.spot);
    this.routeSheet.set(null);
  }

  async planRouteSheetSpotForLater(): Promise<void> {
    const sheet = this.routeSheet();
    if (!sheet) return;
    const { spot } = sheet.context;
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

  // ---- Route delegates ----------------------------------------------------

  openBestRoute(): void {
    const url = this.routeState.openBestRoute();
    if (url) void this.router.navigateByUrl(url);
  }

  addCustomRoute(): void {
    const url = this.routeState.addCustomRoute();
    void this.router.navigateByUrl(url);
  }

  openRouteDetail(route: ReturnType<RouteStateService['routeSuggestions']>[number]): void {
    const url = this.routeState.openRouteDetail(route);
    void this.router.navigateByUrl(url);
  }

  editRoute(route: ReturnType<RouteStateService['routeSuggestions']>[number]): void {
    const url = this.routeState.editRoute(route);
    void this.router.navigateByUrl(url);
  }

  closeRouteDetail(): void {
    const url = this.routeState.closeRouteDetail();
    void this.router.navigateByUrl(url);
  }

  async startRoute(route: ReturnType<RouteStateService['routeSuggestions']>[number]): Promise<void> {
    const url = await this.routeState.startRoute(
      route,
      this.activeTripDate(),
      (msg) => { this.actionNotice.set(msg); },
      (msg) => this.markApiOffline(msg),
    );
    if (url) this.navigateToTab('today');
  }

  async addSpotToExistingRoute(routeId: string): Promise<void> {
    const spot = this.spotActionWizard.targetSpot();
    if (!spot) return;
    const url = await this.routeState.addSpotToExistingRoute(
      routeId, spot.id, spot.name,
      (msg) => { this.actionNotice.set(msg); },
      (msg) => this.markApiOffline(msg),
    );
    if (url) void this.router.navigateByUrl(url);
  }

  async applyWizardRouteEdit(): Promise<void> {
    const url = await this.routeState.applyWizardRouteEdit(
      (msg) => { this.actionNotice.set(msg); },
      (msg) => this.markApiOffline(msg),
    );
    if (url) void this.router.navigateByUrl(url);
  }

  async setWizardTodayRoute(params: {
    baseName: string;
    destinationName: string;
    selectedStops: Spot[];
    directDriveMinutes: number;
    totalDriveMinutes: number;
  }): Promise<void> {
    const url = await this.routeState.setWizardTodayRoute(
      params,
      this.activeTripDate(),
      (msg) => { this.actionNotice.set(msg); },
      (msg) => this.markApiOffline(msg),
    );
    if (url) this.navigateToTab('today');
  }

  async saveWizardDraftDay(title: string): Promise<void> {
    const url = await this.routeState.saveWizardDraftDay(
      title,
      this.activeTripDate(),
      (msg) => { this.actionNotice.set(msg); },
      (msg) => this.markApiOffline(msg),
      async () => {
        await this.loadTrip();
        await this.routeState.loadSuggestions(this.activeTripDate(), (msg) => this.markApiOffline(msg));
      },
    );
    if (url) this.navigateToTab('trip');
  }

  setRouteEditorComingSoonNotice(): void {
    this.actionNotice.set(this.routeState.routeEditorComingSoonMessage());
  }

  openSpotAction(spot: Spot): void {
    this.spotActionWizard.init(spot);
    void this.router.navigateByUrl('/spot-action/step1');
  }

  openNavigation(): void {
    this.returnSheet.set(true);
  }

  isSaved(spotId: string): boolean {
    return this.savedSpotIds().includes(spotId);
  }

  dismissActionNotice(): void {
    this.actionNotice.set(null);
  }

  // ---- Profile delegates --------------------------------------------------

  async cacheCurrentTripMap(): Promise<void> {
    if (!this.requireSignedIn('Sign in to sync offline maps across devices.')) return;
    const hub = this.exploreState.explore().hub;
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
    if (!this.requireSignedIn('Sign in to save profile preferences.')) return;
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
    if (!this.requireSignedIn('Sign in to save safety preferences.')) return;
    const current = this.me();
    if (!current) return;
    try {
      const update = await this.api.updatePreferences({ safety: { [key]: !current.safety[key] } });
      this.me.set({ ...current, preferences: update.preferences, safety: update.safety });
    } catch {
      this.markApiOffline('Could not update safety preferences.');
    }
  }

  // ---- Private helpers ----------------------------------------------------

  private activeTripDate(): string | undefined {
    return this.trip().trip.days.find((d) => d.today)?.date;
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

    try { await this.loadTrip(); } catch { this.actionNotice.set('Could not load the trip.'); }

    const date = this.activeTripDate();

    try {
      await this.exploreState.load(date, (msg) => {
        this.actionNotice.set(msg);
        this.markApiOffline(msg);
      });
      this.apiState.set('online');
    } catch {
      this.actionNotice.set('Could not load Explore.');
    }

    try {
      const today = await this.api.getToday(date);
      this.todayState.today.set(today);
    } catch {
      // keep empty
    }

    if (this.auth.isAuthenticated()) {
      try { await this.loadMe(); } catch { this.actionNotice.set('Could not load profile.'); }
    } else {
      this.me.set(null);
    }

    try {
      const saved = await this.api.getSavedSpots();
      this.savedSpotIds.set(saved.savedSpotIds);
    } catch { this.actionNotice.set('Could not load saved spots.'); }

    try {
      const savedIds = await this.routeState.loadSuggestions(date, (msg) => this.markApiOffline(msg));
      if (savedIds.length > 0) this.savedSpotIds.set(savedIds);
    } catch { this.actionNotice.set('Could not load route suggestions.'); }

    this.apiState.set('online');
    this.offlineMode.set(false);
  }

  private async loadTrip(): Promise<void> {
    const trip = await this.api.getTrip();
    this.trip.set(trip);
  }

  private async loadMe(): Promise<void> {
    const me = await this.api.getMe();
    this.me.set(me);
  }

  private async saveSpot(spot: Spot): Promise<void> {
    try {
      const response: SaveSpotResponse = await this.api.saveSpot(spot.id);
      this.actionNotice.set(response.message);
      this.savedSpotIds.set(response.savedSpotIds);
      await this.routeState.loadSuggestions(this.activeTripDate(), (msg) => this.markApiOffline(msg));
    } catch {
      this.markApiOffline(`Could not save ${spot.name}.`);
    }
  }

  private syncRouteState(): void {
    const path = this.router.url.split('?')[0].replace(/^\//, '') || 'setup';
    this.authRoute.set(path === 'auth');
    const tabRoutes: Record<string, MainTab> = {
      explore: 'explore', routes: 'routes', today: 'today', trip: 'trip', profile: 'profile',
    };
    if (path === 'route-detail' || path.startsWith('routes/add')) {
      this.activeTab.set('routes');
    } else if (path.startsWith('spot-action')) {
      this.activeTab.set('explore');
    } else if (tabRoutes[path]) {
      this.activeTab.set(tabRoutes[path]);
    }
  }

  private markApiOffline(message: string): void {
    this.apiState.set('offline');
    this.offlineMode.set(true);
    this.actionNotice.set(message);
  }

  private requireSignedIn(message: string): boolean {
    if (this.auth.isAuthenticated()) return true;
    this.actionNotice.set(message);
    void this.router.navigateByUrl('/auth');
    return false;
  }
}
