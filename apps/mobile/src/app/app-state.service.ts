import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import type {
  AddRouteStopRequest,
  AttractionRouteSummary,
  CreateTodayRouteRequest,
  ExploreQuery,
  ExploreResponse,
  HealthResponse,
  InsertPreviewResponse,
  RouteSuggestionsResponse,
  SaveSpotResponse,
  SpotContextResponse,
  StartSuggestedRouteRequest,
  TodayResponse,
  TripResponse,
} from '@islandhub/api-contracts';
import type { SafetyStatus, Spot } from '@islandhub/domain';
import { projectIcelandPoint } from '@islandhub/map';
import type { LibChipVariant } from '@islandhub/ui';
import { I18nService } from '@islandhub/i18n';
import { filter } from 'rxjs';
import { AddRouteWizardService, WIZARD_BASES } from './add-route-screen/add-route-wizard.service';
import type { WizardBase } from './add-route-screen/add-route-wizard.service';
import { IslandhubApiService } from './islandhub-api.service';
import { RoutePlanningService } from './route-planning.service';
import { seedExplore, seedRouteSuggestions, seedSpots, seedToday, seedTrip, buildSpotContext } from './seed-data';
import { spotImageBackground } from './spot-images';
import { SpotActionWizardService } from './spot-action-screen/spot-action-wizard.service';

type VehicleFilter = 'car_2wd' | 'car_4wd' | 'any';

type RouteSheetMode = 'insert' | 'create' | 'alternatives' | 'stale';

type MainTab = 'explore' | 'routes' | 'today' | 'trip' | 'profile';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly activeTab = signal<MainTab>('explore');
  readonly wizard = inject(AddRouteWizardService);
  readonly spotActionWizard = inject(SpotActionWizardService);
  readonly setupStep = signal(0);
  readonly setupDone = signal(false);
  readonly selectedSpot = signal<SpotContextResponse | null>(null);
  readonly filterOpen = signal(false);
  readonly routeSheet = signal<{ mode: RouteSheetMode; context: SpotContextResponse; preview?: InsertPreviewResponse } | null>(null);
  readonly selectedRoute = signal<AttractionRouteSummary | null>(null);
  readonly returnSheet = signal(false);
  readonly actionNotice = signal<string | null>(null);
  readonly offlineMode = signal(false);
  readonly apiHealth = signal<HealthResponse | null>(null);
  readonly apiState = signal<'checking' | 'online' | 'seed-fallback'>('checking');
  readonly explore = signal<ExploreResponse>(seedExplore);
  readonly today = signal<TodayResponse>(seedToday);
  readonly trip = signal<TripResponse>(seedTrip);
  readonly routeSuggestions = signal<AttractionRouteSummary[]>(seedRouteSuggestions);
  readonly savedSpotIds = signal<string[]>(['geysir', 'gullfoss', 'thingvellir', 'bruarfoss', 'kerid']);
  readonly exploreLoading = signal(false);
  readonly activeRoute = signal(true);
  readonly statusFilters = signal<SafetyStatus[]>(['green', 'yellow', 'unknown', 'red']);
  readonly categoryFilters = signal(['Waterfall', 'Geothermal', 'Nature reserve']);
  readonly categoryOptions = signal(['Waterfall', 'Geothermal', 'Nature reserve']);
  readonly vehicleFilter = signal<VehicleFilter>('car_2wd');
  readonly showFRoads = signal(true);
  readonly maxDriveMinutes = signal(180);

  readonly setupScreens = [
    { kicker: '01 - 05', title: "See what's open today.", body: 'Iceland changes by the hour. IslandHub merges road, weather, vehicle and daylight status into one daily decision surface.' },
    { kicker: '02 - 05', title: 'Where are you in planning?', body: 'Pick the shortest setup path. You can switch later.' },
    { kicker: '03 - 05', title: 'When are you going?', body: 'May 13-22 gives 9 nights, late spring daylight and a useful F-road warning window.' },
    { kicker: '04 - 05', title: 'What will you be driving?', body: '2WD hides F-roads by default. 4WD unlocks them, but river crossings still need judgement.' },
    { kicker: '05 - 05', title: 'Where are you staying?', body: 'Your hub is the centre of every daily reach calculation. Demo hub: Reykholt Cabin.' },
  ];

  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly api = inject(IslandhubApiService);
  private readonly routePlanning = inject(RoutePlanningService);
  private readonly i18n = inject(I18nService);
  private exploreRequestId = 0;

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

      if (!selectedCategories.includes(spot.category)) {
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

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncRouteState());
    this.syncRouteState();
    void this.loadApi();
  }

  continueSetup(): void {
    if (this.setupStep() >= this.setupScreens.length - 1) {
      this.setupDone.set(true);
      this.navigateToTab('explore');
      return;
    }

    this.setupStep.update((step) => step + 1);
  }

  skipSetup(): void {
    this.setupDone.set(true);
    this.navigateToTab('explore');
  }

  openSpot(spot: Spot): void {
    const fallback = buildSpotContext(spot);
    this.selectedSpot.set(fallback);

    void this.api.getSpotContext(spot.id)
      .then((context) => this.selectedSpot.set(context))
      .catch(() => this.selectedSpot.set(fallback));
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
    return this.categoryFilters().length === this.availableCategories().length;
  }

  setCategoryPreset(category: string | null): void {
    this.categoryFilters.set(category ? [category] : this.availableCategories());
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
        const preview = await this.api.previewInsert(context.spot.id);
        this.routeSheet.set({ mode, context, preview });
      } catch {
        this.routeSheet.set({ mode, context, preview: this.routePlanning.fallbackInsertPreview(context.spot) });
      }
    }
  }

  closeRouteSheet(): void {
    this.routeSheet.set(null);
  }

  openRouteDetail(route: AttractionRouteSummary): void {
    this.selectedRoute.set(route);
    void this.router.navigateByUrl('/route-detail');
  }

  editRoute(route: AttractionRouteSummary): void {
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

  createDirectRouteFromSpot(): void {
    const spot = this.spotActionWizard.targetSpot();
    if (!spot) return;

    const newRoute = this.routePlanning.createDirectRouteFromSpot(spot, this.explore().hub);
    this.routeSuggestions.update((routes) => [newRoute, ...routes]);
    this.actionNotice.set(this.i18n.t('route.createdForSpot', { spot: spot.name }));
    void this.router.navigateByUrl('/routes');
  }

  addSpotToExistingRoute(routeId: string): void {
    const spot = this.spotActionWizard.targetSpot();
    if (!spot) return;

    const route = this.routeSuggestions().find((candidate) => candidate.id === routeId);
    if (!route) return;

    const updatedRoute = this.routePlanning.addSpotToRoute(route, spot);
    this.routeSuggestions.update((routes) => routes.map((candidate) => candidate.id === routeId ? updatedRoute : candidate));
    this.actionNotice.set(this.i18n.t('route.spotAdded', { spot: spot.name, route: route.title }));
    void this.router.navigateByUrl('/routes');
  }

  closeRouteDetail(): void {
    this.selectedRoute.set(null);
    void this.router.navigateByUrl('/routes');
  }

  applyWizardRouteEdit(): void {
    const route = this.selectedRoute();

    if (!route) {
      void this.router.navigateByUrl('/routes');
      return;
    }

    const updatedRoute = this.routePlanning.updateRouteFromSpotIds(route, this.wizard.selectedStopIds(), this.explore().spots);
    this.selectedRoute.set(updatedRoute);
    this.routeSuggestions.update((routes) => routes.map((candidate) => candidate.id === updatedRoute.id ? updatedRoute : candidate));
    this.actionNotice.set(this.i18n.t('route.updated'));
    void this.router.navigateByUrl('/route-detail');
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
    const request: AddRouteStopRequest = { spotId: spot.id, position };

    try {
      const response = await this.api.addRouteStop(request);
      this.today.set(response.today);
      this.routeSheet.set(null);
      this.activeRoute.set(true);
      this.navigateToTab('today');
      return;
    } catch {
      this.today.set(this.routePlanning.insertStop(this.today(), spot, position, this.minutesToDrive.bind(this)));
    }

    this.routeSheet.set(null);
    this.activeRoute.set(true);
    this.navigateToTab('today');
  }

  async createRouteFromSpot(): Promise<void> {
    const sheet = this.routeSheet();

    if (!sheet) {
      return;
    }

    const spot = sheet.context.spot;
    const request: CreateTodayRouteRequest = { spotId: spot.id };

    try {
      const response = await this.api.createTodayRoute(request);
      this.today.set(response.today);
      this.routeSheet.set(null);
      this.activeRoute.set(true);
      this.navigateToTab('today');
      this.actionNotice.set(response.today.update);
      return;
    } catch {
      const today = this.routePlanning.todayRouteFromSpot(this.today(), spot, this.explore().hub, this.minutesToDrive.bind(this));
      this.today.set(today);
      this.actionNotice.set(today.update);
    }

    this.routeSheet.set(null);
    this.activeRoute.set(true);
    this.navigateToTab('today');
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
      this.trip.update((tripResponse) => {
        const title = `Draft - ${spot.name}`;

        if (tripResponse.trip.days.some((day) => day.title === title)) {
          return tripResponse;
        }

        return this.routePlanning.addDraftDay(
          tripResponse,
          title,
          `${spot.category} - ${this.minutesToDrive(spot.driveMinutes)} from hub`,
          spot.status.status,
        );
      });
      this.actionNotice.set(this.i18n.t('trip.spotAddedToDraft', { spot: spot.name }));
    }

    this.routeSheet.set(null);
    this.navigateToTab('trip');
  }

  async startRoute(route: AttractionRouteSummary): Promise<void> {
    const request: StartSuggestedRouteRequest = { routeId: route.id };

    try {
      const response = await this.api.startSuggestedRoute(request);
      this.today.set(response.today);
      this.actionNotice.set(this.i18n.t('route.started', { route: route.title }));
    } catch {
      this.today.set(this.routePlanning.todayRouteFromSuggestion(this.today(), route, this.explore(), this.minutesToDrive.bind(this)));
      this.actionNotice.set(this.i18n.t('route.startedLocally', { route: route.title }));
    }

    this.selectedRoute.set(null);
    this.activeRoute.set(true);
    this.navigateToTab('today');
  }

  routeSpotName(spotId: string): string {
    return this.findSpot(spotId)?.name ?? spotId;
  }

  routeSpotImage(spotId: string): string {
    return spotImageBackground(spotId);
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
      const response = await this.api.markStopDone(activeStop.id);
      this.today.set(response.today);
      this.returnSheet.set(false);
      return;
    } catch {
      this.today.set(this.routePlanning.markActiveStopDone(this.today()));
    }

    this.returnSheet.set(false);
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
    this.categoryFilters.set(this.availableCategories());
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

  setWizardTodayRoute(params: {
    baseName: string;
    destinationName: string;
    selectedStops: Spot[];
    directDriveMinutes: number;
    totalDriveMinutes: number;
  }): void {
    this.today.set(this.routePlanning.wizardTodayRoute({
      current: this.today(),
      baseName: params.baseName,
      destinationName: params.destinationName,
      dateLabel: this.explore().dateLabel,
      dataAgeMinutes: this.explore().dataAgeMinutes,
      selectedStops: params.selectedStops,
      directDriveMinutes: params.directDriveMinutes,
      totalDriveMinutes: params.totalDriveMinutes,
      formatMinutes: this.minutesToDrive.bind(this),
    }));
    this.activeRoute.set(true);
    this.actionNotice.set(this.i18n.t('route.draftReadyToday'));
    this.navigateToTab('today');
  }

  saveWizardDraftDay(title: string, summary: string, status: SafetyStatus): void {
    this.trip.update((tripResponse) => this.routePlanning.addDraftDay(tripResponse, title, summary, status));
    this.actionNotice.set(this.i18n.t('route.draftSavedToTrip'));
    this.navigateToTab('trip');
  }

  setRouteEditorComingSoonNotice(): void {
    this.actionNotice.set(this.i18n.t('route.editorComingSoon'));
  }

  private syncRouteState(): void {
    const path = this.router.url.split('?')[0].replace(/^\//, '') || 'setup';

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
    try {
      const [health, explore, today, trip] = await Promise.all([
        this.api.getHealth(),
        this.api.getExplore(this.exploreQuery()),
        this.api.getToday(),
        this.api.getTrip(),
      ]);
      const [saved, routeSuggestions] = await Promise.all([
        this.api.getSavedSpots(),
        this.api.getRouteSuggestions(),
      ]);

      this.apiHealth.set(health);
      this.explore.set(explore);
      this.categoryOptions.set(this.mergeCategories(explore));
      this.today.set(today);
      this.trip.set(trip);
      this.savedSpotIds.set(saved.savedSpotIds);
      this.routeSuggestions.set(routeSuggestions.routes);
      this.apiState.set('online');
    } catch {
      this.apiState.set('seed-fallback');
    }
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
        this.apiState.set('seed-fallback');
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
    };
  }

  private mergeCategories(explore: ExploreResponse): string[] {
    return Array.from(new Set([...this.categoryOptions(), ...explore.spots.map((spot) => spot.category)]));
  }

  private async saveSpot(spot: Spot): Promise<void> {
    try {
      const response: SaveSpotResponse = await this.api.saveSpot(spot.id);
      this.actionNotice.set(response.message);
      this.savedSpotIds.set(response.savedSpotIds);
      await this.loadRouteSuggestions();
    } catch {
      this.savedSpotIds.update((ids) => ids.includes(spot.id) ? ids : [...ids, spot.id]);
      this.actionNotice.set(this.i18n.t('spot.savedLocally', { spot: spot.name }));
      this.routeSuggestions.set(this.routePlanning.localRouteSuggestions());
    }
  }

  private async loadRouteSuggestions(): Promise<void> {
    try {
      const response: RouteSuggestionsResponse = await this.api.getRouteSuggestions();
      this.routeSuggestions.set(response.routes);
      this.savedSpotIds.set(response.savedSpots.map((spot) => spot.id));
    } catch {
      this.routeSuggestions.set(this.routePlanning.localRouteSuggestions());
    }
  }

  private currentWizardBase(): WizardBase {
    const hub = this.explore().hub;
    const matchedBase = WIZARD_BASES.find((base) => base.name === hub.name) ?? null;

    return matchedBase ?? {
      id: hub.id,
      name: hub.name,
      region: 'Current trip',
      type: 'home',
      location: hub.location,
    };
  }

  private findSpot(spotId: string): Spot | undefined {
    return this.explore().spots.find((spot) => spot.id === spotId) ?? seedSpots.find((spot) => spot.id === spotId);
  }
}
