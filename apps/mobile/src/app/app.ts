import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AddRouteWizardService, KEFLAVIK_BASE, WIZARD_BASES } from './add-route-screen/add-route-wizard.service';
import type { WizardBase } from './add-route-screen/add-route-wizard.service';
import type {
  AddRouteStopRequest,
  AttractionRouteSummary,
  CreateTodayRouteRequest,
  ExploreQuery,
  ExploreResponse,
  HealthResponse,
  InsertPreviewResponse,
  PlanSpotResponse,
  RouteSuggestionsResponse,
  RouteMutationResponse,
  SavedSpotsResponse,
  SaveSpotResponse,
  SpotContextResponse,
  StartSuggestedRouteRequest,
  TodayResponse,
  TripResponse,
} from '@islandhub/api-contracts';
import type { RouteStop, SafetyStatus, Spot } from '@islandhub/domain';
import { projectIcelandPoint } from '@islandhub/map';
import { LibButtonDirective, LibChipComponent, LucideCalendarDays, LucideCheck, LucideCircleUser, LucideCompass, LucideNavigation, LucideRoute, LucideTriangleAlert, LucideX } from '@islandhub/ui';
import type { LibChipVariant } from '@islandhub/ui';
import { filter } from 'rxjs';
import { spotImageBackground } from './spot-images';
import { SpotActionWizardService } from './spot-action-screen/spot-action-wizard.service';

type VehicleFilter = 'car_2wd' | 'car_4wd' | 'any';

type RouteSheetMode = 'insert' | 'create' | 'alternatives' | 'stale';

@Component({
  imports: [CommonModule, RouterModule, LibButtonDirective, LibChipComponent, LucideCalendarDays, LucideCheck, LucideCircleUser, LucideCompass, LucideNavigation, LucideRoute, LucideTriangleAlert, LucideX],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly activeTab = signal<'explore' | 'routes' | 'today' | 'trip' | 'profile'>('explore');
  protected readonly wizard = inject(AddRouteWizardService);
  protected readonly spotActionWizard = inject(SpotActionWizardService);
  protected readonly setupStep = signal(0);
  protected readonly setupDone = signal(false);
  protected readonly selectedSpot = signal<SpotContextResponse | null>(null);
  protected readonly filterOpen = signal(false);
  protected readonly routeSheet = signal<{ mode: RouteSheetMode; context: SpotContextResponse; preview?: InsertPreviewResponse } | null>(null);
  protected readonly selectedRoute = signal<AttractionRouteSummary | null>(null);
  protected readonly returnSheet = signal(false);
  protected readonly actionNotice = signal<string | null>(null);
  protected readonly offlineMode = signal(false);
  protected readonly apiHealth = signal<HealthResponse | null>(null);
  protected readonly apiState = signal<'checking' | 'online' | 'seed-fallback'>('checking');
  protected readonly explore = signal<ExploreResponse>(seedExplore);
  protected readonly today = signal<TodayResponse>(seedToday);
  protected readonly trip = signal<TripResponse>(seedTrip);
  protected readonly routeSuggestions = signal<AttractionRouteSummary[]>(seedRouteSuggestions);
  protected readonly savedSpotIds = signal<string[]>(['geysir', 'gullfoss', 'thingvellir', 'bruarfoss', 'kerid']);
  protected readonly exploreLoading = signal(false);
  protected readonly activeRoute = signal(true);
  protected readonly statusFilters = signal<SafetyStatus[]>(['green', 'yellow', 'unknown', 'red']);
  protected readonly categoryFilters = signal(['Waterfall', 'Geothermal', 'Nature reserve']);
  protected readonly categoryOptions = signal(['Waterfall', 'Geothermal', 'Nature reserve']);
  protected readonly vehicleFilter = signal<VehicleFilter>('car_2wd');
  protected readonly showFRoads = signal(true);
  protected readonly maxDriveMinutes = signal(180);

  private readonly apiBaseUrl = 'http://localhost:3000/api';
  private readonly router = inject(Router);
  private exploreRequestId = 0;

  protected readonly visibleSpots = computed(() => {
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

  protected readonly mapPoints = computed(() => [
    projectIcelandPoint('hub', this.explore().hub.name, this.explore().hub.location),
    ...this.visibleSpots().map((spot) => projectIcelandPoint(spot.id, spot.name, spot.location)),
  ]);

  protected readonly statusCounts = computed(() => this.visibleSpots().reduce<Record<SafetyStatus, number>>(
    (counts, spot) => ({ ...counts, [spot.status.status]: counts[spot.status.status] + 1 }),
    { green: 0, yellow: 0, red: 0, unknown: 0 },
  ));

  protected readonly selectedRouteStops = computed(() => {
    const route = this.selectedRoute();

    if (!route) {
      return [];
    }

    return route.spotIds.map((spotId, index) => {
      const spot = this.explore().spots.find((s) => s.id === spotId) ?? seedSpots.find((s) => s.id === spotId);
      const driveFromPrevMinutes = index === 0
        ? (spot?.driveMinutes ?? 30)
        : Math.max(12, Math.round((spot?.driveMinutes ?? 45) / 3));
      const distanceKm = index === 0
        ? (spot?.distanceKm ?? 0)
        : Math.max(5, Math.round((spot?.distanceKm ?? 20) / 3));

      return { spot, driveFromPrevMinutes, distanceKm };
    }).filter((entry): entry is { spot: Spot; driveFromPrevMinutes: number; distanceKm: number } => Boolean(entry.spot));
  });

  protected readonly availableCategories = computed<string[]>(() => Array.from(new Set([...this.categoryOptions(), ...this.explore().spots.map((spot) => spot.category)])));

  protected readonly nextStop = computed(() => this.today().stops.find((stop) => stop.state === 'active') ?? this.today().stops.find((stop) => stop.state === 'open'));

  protected readonly navigationLabel = computed(() => `→ Navigate to ${this.nextStop()?.title ?? 'next stop'}`);

  protected readonly savedCount = computed(() => this.savedSpotIds().length);

  protected readonly savedSpots = computed(() => this.savedSpotIds().map((spotId) => this.explore().spots.find((spot) => spot.id === spotId) ?? seedSpots.find((spot) => spot.id === spotId)).filter((spot): spot is Spot => Boolean(spot)));

  protected readonly setupScreens = [
    { kicker: '01 - 05', title: "See what's open today.", body: 'Iceland changes by the hour. IslandHub merges road, weather, vehicle and daylight status into one daily decision surface.' },
    { kicker: '02 - 05', title: 'Where are you in planning?', body: 'Pick the shortest setup path. You can switch later.' },
    { kicker: '03 - 05', title: 'When are you going?', body: 'May 13-22 gives 9 nights, late spring daylight and a useful F-road warning window.' },
    { kicker: '04 - 05', title: 'What will you be driving?', body: '2WD hides F-roads by default. 4WD unlocks them, but river crossings still need judgement.' },
    { kicker: '05 - 05', title: 'Where are you staying?', body: 'Your hub is the centre of every daily reach calculation. Demo hub: Reykholt Cabin.' },
  ];

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => this.syncRouteState());
    this.syncRouteState();
    void this.loadApi();
  }

  protected continueSetup() {
    if (this.setupStep() >= this.setupScreens.length - 1) {
      this.setupDone.set(true);
      this.navigateToTab('explore');
      return;
    }

    this.setupStep.update((step) => step + 1);
  }

  protected skipSetup() {
    this.setupDone.set(true);
    this.navigateToTab('explore');
  }

  protected openSpot(spot: Spot) {
    const fallback = buildSpotContext(spot);
    this.selectedSpot.set(fallback);

    fetch(`${this.apiBaseUrl}/spots/${spot.id}/context`)
      .then((response) => (response.ok ? response.json() : fallback))
      .then((context: SpotContextResponse) => this.selectedSpot.set(context))
      .catch(() => this.selectedSpot.set(fallback));
  }

  protected openMapPoint(pointId: string) {
    if (pointId === 'hub') {
      return;
    }

    const spot = this.explore().spots.find((candidate) => candidate.id === pointId);

    if (spot) {
      this.openSpot(spot);
    }
  }

  protected closeSpot() {
    this.selectedSpot.set(null);
  }

  protected createTodayRoute() {
    this.selectedSpot.set(null);
    this.navigateToTab('today');
  }

  protected navigateToTab(tab: 'explore' | 'routes' | 'today' | 'trip' | 'profile') {
    this.activeTab.set(tab);
    void this.router.navigateByUrl(`/${tab}`);
  }

  protected isSaved(spotId: string) {
    return this.savedSpotIds().includes(spotId);
  }

  protected isAllCategories() {
    return this.categoryFilters().length === this.availableCategories().length;
  }

  protected setCategoryPreset(category: string | null) {
    this.categoryFilters.set(category ? [category] : this.availableCategories());
    void this.loadExplore();
  }

  protected async handleSpotPrimaryAction() {
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
        const preview = await this.postJson<InsertPreviewResponse>(`${this.apiBaseUrl}/routes/today/insert-preview`, { spotId: context.spot.id });
        this.routeSheet.set({ mode, context, preview });
      } catch {
        this.routeSheet.set({
          mode,
          context,
          preview: {
            spot: context.spot,
            recommendedAfterStopId: 'geysir',
            recommendedBeforeStopId: 'gullfoss',
            addedDriveMinutes: context.spot.id === 'seljalandsfoss' ? 18 : Math.max(12, Math.round(context.spot.driveMinutes / 4)),
            statusImpact: context.spot.status.status === 'yellow' ? 'stays amber' : context.spot.status.label.toLowerCase(),
            daylightImpact: context.spot.driveMinutes > 140 ? 'tight' : 'ample',
            warnings: context.spot.status.status === 'green' ? [] : context.spot.status.reasons,
          },
        });
      }
    }
  }

  protected closeRouteSheet() {
    this.routeSheet.set(null);
  }

  protected openRouteDetail(route: AttractionRouteSummary) {
    this.selectedRoute.set(route);
    void this.router.navigateByUrl('/route-detail');
  }

  protected editRoute(route: AttractionRouteSummary) {
    this.selectedRoute.set(route);
    this.wizard.initEdit(this.currentWizardBase(), route.id, route.title, route.spotIds);
    void this.router.navigateByUrl('/routes/add/step4');
  }

  protected openBestRoute() {
    const route = this.routeSuggestions()[0];

    if (route) {
      this.openRouteDetail(route);
    }
  }

  protected addCustomRoute() {
    this.wizard.init(this.currentWizardBase());
    void this.router.navigateByUrl('/routes/add/step1');
  }

  protected openSpotAction(spot: Spot) {
    this.spotActionWizard.init(spot);
    void this.router.navigateByUrl('/spot-action/step1');
  }

  protected createDirectRouteFromSpot() {
    const spot = this.spotActionWizard.targetSpot();
    if (!spot) return;

    const newRoute: AttractionRouteSummary = {
      id: `direct-${spot.id}-${Date.now()}`,
      title: `Route to ${spot.name}`,
      summary: `Direct day trip from ${this.explore().hub.name} to ${spot.name} and back.`,
      driveMinutes: spot.driveMinutes * 2,
      stops: 1,
      distanceKm: spot.distanceKm * 2,
      highestStatus: spot.status.status,
      spotIds: [spot.id],
      daylight: 'ample',
      reason: 'Created from Explore.',
    };

    this.routeSuggestions.update((routes) => [newRoute, ...routes]);
    this.actionNotice.set(`Route to ${spot.name} created.`);
    void this.router.navigateByUrl('/routes');
  }

  protected addSpotToExistingRoute(routeId: string) {
    const spot = this.spotActionWizard.targetSpot();
    if (!spot) return;

    const route = this.routeSuggestions().find((r) => r.id === routeId);
    if (!route) return;

    const spotIds = [...route.spotIds, spot.id];
    const order: Record<SafetyStatus, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };
    const highestStatus = order[spot.status.status] > order[route.highestStatus] ? spot.status.status : route.highestStatus;
    const divisor = Math.max(1, route.stops + 2);
    const addedKm = Math.max(4, Math.round(spot.distanceKm / divisor));
    const addedMinutes = Math.max(8, Math.round(spot.driveMinutes / divisor));

    const updatedRoute: AttractionRouteSummary = {
      ...route,
      spotIds,
      stops: spotIds.length,
      distanceKm: route.distanceKm + addedKm,
      driveMinutes: route.driveMinutes + addedMinutes,
      highestStatus,
      summary: `${spotIds.length} stops including ${spot.name}.`,
    };

    this.routeSuggestions.update((routes) => routes.map((r) => (r.id === routeId ? updatedRoute : r)));
    this.actionNotice.set(`${spot.name} added to "${route.title}".`);
    void this.router.navigateByUrl('/routes');
  }

  protected closeRouteDetail() {
    this.selectedRoute.set(null);
    void this.router.navigateByUrl('/routes');
  }

  protected applyWizardRouteEdit() {
    const route = this.selectedRoute();

    if (!route) {
      void this.router.navigateByUrl('/routes');
      return;
    }

    const spotIds = this.wizard.selectedStopIds();
    const spots = spotIds.map((spotId) => this.explore().spots.find((spot) => spot.id === spotId) ?? seedSpots.find((spot) => spot.id === spotId)).filter((spot): spot is Spot => Boolean(spot));
    const order: Record<SafetyStatus, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };
    const highestStatus = spots.reduce<SafetyStatus>((highest, spot) => order[spot.status.status] > order[highest] ? spot.status.status : highest, 'green');
    const driveMinutes = Math.max(45, spots.reduce((sum, spot) => sum + Math.max(8, Math.round(spot.driveMinutes / 5)), 0) + 90);
    const distanceKm = Math.max(30, spots.reduce((sum, spot) => sum + Math.max(5, Math.round(spot.distanceKm / 3)), 0) + 45);
    const updatedRoute: AttractionRouteSummary = {
      ...route,
      spotIds,
      stops: spotIds.length,
      driveMinutes,
      distanceKm,
      highestStatus,
      summary: spotIds.length ? `${spotIds.length} stops adjusted from the route editor.` : 'Direct route without sightseeing stops.',
    };

    this.selectedRoute.set(updatedRoute);
    this.routeSuggestions.update((routes) => routes.map((candidate) => candidate.id === updatedRoute.id ? updatedRoute : candidate));
    this.actionNotice.set('Route aktualisiert.');
    void this.router.navigateByUrl('/route-detail');
  }

  protected routeDetailTotalMinutes() {
    const route = this.selectedRoute();

    if (!route) {
      return 0;
    }

    const stayTotal = this.selectedRouteStops().reduce((sum, entry) => sum + entry.spot.stayMinutes, 0);

    return route.driveMinutes + stayTotal;
  }

  protected removeSpotFromSelectedRoute(spotId: string) {
    const route = this.selectedRoute();

    if (!route) {
      return;
    }

    const spotIds = route.spotIds.filter((id) => id !== spotId);
    this.selectedRoute.set({ ...route, spotIds, stops: spotIds.length });
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

  protected dismissActionNotice() {
    this.actionNotice.set(null);
  }

  protected async insertRouteStop(position: 'recommended' | 'end') {
    const sheet = this.routeSheet();

    if (!sheet) {
      return;
    }

    const spot = sheet.context.spot;
    const request: AddRouteStopRequest = { spotId: spot.id, position };

    try {
      const response = await this.postJson<RouteMutationResponse>(`${this.apiBaseUrl}/routes/today/stops`, request);
      this.today.set(response.today);
      this.routeSheet.set(null);
      this.activeRoute.set(true);
      this.navigateToTab('today');
      return;
    } catch {
      // Keep the demo usable without the API server.
    }

    const alreadyInRoute = this.today().stops.some((stop) => stop.spotId === spot.id);

    if (!alreadyInRoute) {
      const newStop: RouteStop = {
        id: spot.id,
        spotId: spot.id,
        title: spot.name,
        meta: `${this.minutesToDrive(spot.driveMinutes)} drive - ${spot.stayMinutes} min stay`,
        driveFromPreviousMinutes: spot.driveMinutes,
        stayMinutes: spot.stayMinutes,
        status: spot.status.status,
        state: 'open',
        note: spot.status.status === 'green' ? undefined : spot.status.reasons[0],
      };
      const stops = [...this.today().stops];
      const returnIndex = stops.findIndex((stop) => stop.state === 'return');
      const recommendedIndex = Math.max(0, stops.findIndex((stop) => stop.id === 'gullfoss') + 1);
      const insertIndex = position === 'recommended' ? recommendedIndex : returnIndex;
      stops.splice(insertIndex, 0, newStop);
      this.today.update((today) => ({ ...today, stops, update: `Inserted ${spot.name}. Status rechecked against the same snapshot.` }));
    }

    this.routeSheet.set(null);
    this.activeRoute.set(true);
    this.navigateToTab('today');
  }

  protected async createRouteFromSpot() {
    const sheet = this.routeSheet();

    if (!sheet) {
      return;
    }

    const spot = sheet.context.spot;
    const request: CreateTodayRouteRequest = { spotId: spot.id };

    try {
      const response = await this.postJson<RouteMutationResponse>(`${this.apiBaseUrl}/routes/today`, request);
      this.today.set(response.today);
      this.routeSheet.set(null);
      this.activeRoute.set(true);
      this.navigateToTab('today');
      this.actionNotice.set(response.today.update);
      return;
    } catch {
      // Keep the demo usable without the API server.
    }

    this.today.update((today) => ({
      ...today,
      title: `${spot.name} out-and-back`,
      stopProgress: '0/1',
      driveMinutes: spot.driveMinutes * 2,
      update: `Route created for today from ${this.explore().hub.name} to ${spot.name} and back.`,
      stops: [
        { id: 'start', title: this.explore().hub.name, meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
        { id: spot.id, spotId: spot.id, title: spot.name, meta: `${this.minutesToDrive(spot.driveMinutes)} drive - ${spot.stayMinutes} min stay`, driveFromPreviousMinutes: spot.driveMinutes, stayMinutes: spot.stayMinutes, status: spot.status.status, state: 'active', note: spot.status.reasons[0] },
        { id: 'return', title: this.explore().hub.name, meta: 'return', driveFromPreviousMinutes: spot.driveMinutes, stayMinutes: 0, status: 'green', state: 'return' },
      ],
    }));
    this.routeSheet.set(null);
    this.activeRoute.set(true);
    this.navigateToTab('today');
    this.actionNotice.set(`Route created for today from ${this.explore().hub.name} to ${spot.name} and back.`);
  }

  protected async saveSelectedSpot() {
    const context = this.selectedSpot();

    if (!context) {
      return;
    }

    await this.saveSpot(context.spot);
  }

  protected async saveSelectedSpotFromList(spot: Spot) {
    await this.saveSpot(spot);
  }

  protected async saveRouteSheetSpot() {
    const sheet = this.routeSheet();

    if (!sheet) {
      return;
    }

    await this.saveSpot(sheet.context.spot);
    this.routeSheet.set(null);
  }

  protected async planRouteSheetSpotForLater() {
    const sheet = this.routeSheet();

    if (!sheet) {
      return;
    }

    const spot = sheet.context.spot;

    try {
      const response = await this.postJson<PlanSpotResponse>(`${this.apiBaseUrl}/draft-days`, { spotId: spot.id });
      this.trip.set({ trip: response.trip });
      this.actionNotice.set(response.message);
    } catch {
      this.trip.update((tripResponse) => {
        const title = `Draft - ${spot.name}`;

        if (tripResponse.trip.days.some((day) => day.title === title)) {
          return tripResponse;
        }

        return {
          trip: {
            ...tripResponse.trip,
            days: [
              ...tripResponse.trip.days,
              { weekday: 'Draft', day: `${13 + tripResponse.trip.days.length}`, title, summary: `${spot.category} - ${this.minutesToDrive(spot.driveMinutes)} from hub`, status: spot.status.status },
            ],
          },
        };
      });
      this.actionNotice.set(`${spot.name} added to a draft day.`);
    }

    this.routeSheet.set(null);
    this.navigateToTab('trip');
  }

  protected async startRoute(route: AttractionRouteSummary) {
    const request: StartSuggestedRouteRequest = { routeId: route.id };

    try {
      const response = await this.postJson<RouteMutationResponse>(`${this.apiBaseUrl}/routes/suggestions/start`, request);
      this.today.set(response.today);
      this.actionNotice.set(`${route.title} started. Today is ready.`);
    } catch {
      const windLightMeta = ['12\' drive · 35\' stay', '14\' drive · 40\' stay', '64\' drive · 25\' stay', '52\' drive · 30\' stay'];
      const stops: RouteStop[] = route.spotIds.map((spotId, index) => {
        const spot = this.explore().spots.find((candidate) => candidate.id === spotId) ?? seedSpots.find((candidate) => candidate.id === spotId);
        const state: RouteStop['state'] = route.id === 'wind-light-loop' ? index < 2 ? 'done' : index === 2 ? 'active' : 'open' : index === 0 ? 'active' : 'open';
        const defaultDriveMinutes = index === 0 ? spot?.driveMinutes ?? 30 : Math.max(12, Math.round((spot?.driveMinutes ?? 45) / 3));

        return {
          id: spotId,
          spotId,
          title: spot?.name ?? spotId,
          meta: route.id === 'wind-light-loop' ? windLightMeta[index] : `${this.minutesToDrive(defaultDriveMinutes)} drive - ${spot?.stayMinutes ?? 30} min stay`,
          driveFromPreviousMinutes: defaultDriveMinutes,
          stayMinutes: spot?.stayMinutes ?? 30,
          status: spot?.status.status ?? 'unknown',
          state,
          note: spot?.status.status === 'green' ? undefined : spot?.status.reasons[0],
        };
      });
      this.today.set({
        ...this.today(),
        title: route.title,
        stopProgress: route.id === 'wind-light-loop' ? `2/${route.spotIds.length}` : `0/${route.spotIds.length}`,
        driveMinutes: route.driveMinutes,
        update: route.id === 'wind-light-loop' ? 'Seljalandsfoss wind gusts rising to 24 m/s. Still passable.' : `${route.title} started from saved highlights.`,
        stops: [
          { id: 'start', title: this.explore().hub.name, meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
          ...stops,
          { id: 'return', title: this.explore().hub.name, meta: route.id === 'wind-light-loop' ? `18\' drive` : 'return', driveFromPreviousMinutes: Math.max(18, Math.round(route.driveMinutes / 5)), stayMinutes: 0, status: 'green', state: 'return' },
        ],
      });
      this.actionNotice.set(`${route.title} started locally. Today is ready.`);
    }

    this.selectedRoute.set(null);
    this.activeRoute.set(true);
    this.navigateToTab('today');
  }

  protected routeSpotName(spotId: string) {
    return this.explore().spots.find((spot) => spot.id === spotId)?.name ?? seedSpots.find((spot) => spot.id === spotId)?.name ?? spotId;
  }

  protected routeSpotImage(spotId: string) {
    return spotImageBackground(spotId);
  }

  protected routeStatusSummary(route: AttractionRouteSummary) {
    return route.highestStatus === 'yellow' ? '1 caution' : route.highestStatus === 'red' ? 'Closed stop' : route.highestStatus === 'unknown' ? 'Needs refresh' : 'All open';
  }

  protected routeCardClass(route: AttractionRouteSummary, index: number) {
    return index === 0 ? 'recommended' : route.highestStatus === 'yellow' ? 'caution' : '';
  }

  protected openNavigation() {
    this.returnSheet.set(true);
  }

  protected async markActiveStopDone() {
    const activeIndex = this.today().stops.findIndex((stop) => stop.state === 'active');

    if (activeIndex < 0) {
      this.returnSheet.set(false);
      return;
    }

    const activeStop = this.today().stops[activeIndex];

    try {
      const response = await this.patchJson<RouteMutationResponse>(`${this.apiBaseUrl}/routes/today/stops/${activeStop.id}/done`);
      this.today.set(response.today);
      this.returnSheet.set(false);
      return;
    } catch {
      // Keep the demo usable without the API server.
    }

    const stops = this.today().stops.map((stop, index) => {
      if (index === activeIndex) {
        return { ...stop, state: 'done' as const };
      }

      return stop;
    });
    const nextOpenIndex = stops.findIndex((stop, index) => index > activeIndex && stop.state === 'open');

    if (nextOpenIndex >= 0) {
      stops[nextOpenIndex] = { ...stops[nextOpenIndex], state: 'active' };
    }

    const doneCount = stops.filter((stop) => stop.state === 'done').length;
    const totalStops = stops.filter((stop) => stop.state !== 'start' && stop.state !== 'return').length;

    this.today.update((today) => ({
      ...today,
      stopProgress: `${doneCount}/${totalStops}`,
      update: nextOpenIndex >= 0 ? `${stops[nextOpenIndex].title} is next. Status still ${stops[nextOpenIndex].status}.` : 'All planned stops are complete. Return route is ready.',
      stops,
    }));
    this.returnSheet.set(false);
  }

  protected toggleStatusFilter(status: SafetyStatus) {
    this.statusFilters.update((filters) => {
      if (filters.includes(status)) {
        return filters.length === 1 ? filters : filters.filter((candidate) => candidate !== status);
      }

      return [...filters, status];
    });
    void this.loadExplore();
  }

  protected toggleCategoryFilter(category: string) {
    this.categoryFilters.update((filters) => {
      if (filters.includes(category)) {
        return filters.length === 1 ? filters : filters.filter((candidate) => candidate !== category);
      }

      return [...filters, category];
    });
    void this.loadExplore();
  }

  protected setVehicleFilter(vehicle: VehicleFilter) {
    this.vehicleFilter.set(vehicle);

    if (vehicle !== 'car_2wd') {
      this.showFRoads.set(true);
      this.maxDriveMinutes.set(180);
    }

    void this.loadExplore();
  }

  protected setShowFRoads(showFRoads: boolean) {
    this.showFRoads.set(showFRoads);
    void this.loadExplore();
  }

  protected setMaxDriveMinutes(maxDriveMinutes: number) {
    this.maxDriveMinutes.set(maxDriveMinutes);
    void this.loadExplore();
  }

  protected resetFilters() {
    this.statusFilters.set(['green', 'yellow', 'unknown', 'red']);
    this.categoryFilters.set(this.availableCategories());
    this.vehicleFilter.set('car_2wd');
    this.showFRoads.set(true);
    this.maxDriveMinutes.set(180);
    void this.loadExplore();
  }

  protected statusClass(status: SafetyStatus) {
    return `status-${status}`;
  }

  protected statusVariant(status: SafetyStatus): LibChipVariant {
    const map: Record<SafetyStatus, LibChipVariant> = {
      green: 'success',
      yellow: 'warning',
      red: 'danger',
      unknown: 'neutral',
    };
    return map[status];
  }

  protected mapPointStatus(pointId: string) {
    return this.explore().spots.find((spot) => spot.id === pointId)?.status.status ?? 'unknown';
  }

  protected statusCount(status: SafetyStatus) {
    return this.statusCounts()[status];
  }

  protected minutesToDrive(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours > 0 ? `${hours}h ${remainder.toString().padStart(2, '0')}` : `${remainder}m`;
  }

  private syncRouteState() {
    const path = this.router.url.split('?')[0].replace(/^\//, '') || 'setup';

    if (!this.setupDone() && path !== 'setup') {
      void this.router.navigateByUrl('/setup');
      return;
    }

    if (this.setupDone() && path === 'setup') {
      void this.router.navigateByUrl('/explore');
      return;
    }

    if (path === 'explore' || path === 'routes' || path === 'routes/add' || path === 'route-detail' || path === 'today' || path === 'trip' || path === 'profile' || path.startsWith('spot-action')) {
      let tab: 'explore' | 'routes' | 'today' | 'trip' | 'profile';
      if (path === 'route-detail' || path === 'routes/add') {
        tab = 'routes';
      } else if (path.startsWith('spot-action')) {
        tab = 'explore';
      } else {
        tab = path as 'explore' | 'routes' | 'today' | 'trip' | 'profile';
      }
      this.activeTab.set(tab);
    }
  }

  private async loadApi() {
    try {
      const [health, explore, today, trip] = await Promise.all([
        this.getJson<HealthResponse>(`${this.apiBaseUrl}/health`),
        this.getJson<ExploreResponse>(this.exploreUrl()),
        this.getJson<TodayResponse>(`${this.apiBaseUrl}/today`),
        this.getJson<TripResponse>(`${this.apiBaseUrl}/trip`),
      ]);
      const [saved, routeSuggestions] = await Promise.all([
        this.getJson<SavedSpotsResponse>(`${this.apiBaseUrl}/saved-spots`),
        this.getJson<RouteSuggestionsResponse>(`${this.apiBaseUrl}/routes/suggestions`),
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

  private async loadExplore() {
    const requestId = ++this.exploreRequestId;
    this.exploreLoading.set(true);

    try {
      const explore = await this.getJson<ExploreResponse>(this.exploreUrl());

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

  private exploreUrl() {
    const query = this.exploreQuery();
    const params = new URLSearchParams({
      status: query.statuses?.join(',') ?? '',
      category: query.categories?.join(',') ?? '',
      vehicle: query.vehicle ?? 'car_2wd',
      showFRoads: String(query.showFRoads ?? false),
      maxDriveMinutes: String(query.maxDriveMinutes ?? 90),
    });

    return `${this.apiBaseUrl}/explore?${params.toString()}`;
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

  private mergeCategories(explore: ExploreResponse) {
    return Array.from(new Set([...this.categoryOptions(), ...explore.spots.map((spot) => spot.category)]));
  }

  private async saveSpot(spot: Spot) {
    try {
      const response = await this.postJson<SaveSpotResponse>(`${this.apiBaseUrl}/saved-spots`, { spotId: spot.id });
      this.actionNotice.set(response.message);
      this.savedSpotIds.set(response.savedSpotIds);
      await this.loadRouteSuggestions();
    } catch {
      this.savedSpotIds.update((ids) => ids.includes(spot.id) ? ids : [...ids, spot.id]);
      this.actionNotice.set(`${spot.name} saved locally for this session.`);
      this.routeSuggestions.set(this.localRouteSuggestions());
    }
  }

  private async loadRouteSuggestions() {
    try {
      const response = await this.getJson<RouteSuggestionsResponse>(`${this.apiBaseUrl}/routes/suggestions`);
      this.routeSuggestions.set(response.routes);
      this.savedSpotIds.set(response.savedSpots.map((spot) => spot.id));
    } catch {
      this.routeSuggestions.set(this.localRouteSuggestions());
    }
  }

  private localRouteSuggestions(): AttractionRouteSummary[] {
    return seedRouteSuggestions;
  }

  private async getJson<TResponse>(url: string): Promise<TResponse> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return response.json() as Promise<TResponse>;
  }

  private async postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return response.json() as Promise<TResponse>;
  }

  private async patchJson<TResponse>(url: string): Promise<TResponse> {
    const response = await fetch(url, { method: 'PATCH' });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return response.json() as Promise<TResponse>;
  }
}

const sourceTimes = [
  { source: 'Vedur.is' as const, fetchedAt: '2026-05-25T07:42:00.000Z', ageMinutes: 8 },
  { source: 'Vegagerdin' as const, fetchedAt: '2026-05-25T07:38:00.000Z', ageMinutes: 12 },
];

function status(spotId: string, safety: SafetyStatus, reasons: string[]) {
  return {
    spotId,
    status: safety,
    label: safety === 'green' ? 'Open' : safety === 'yellow' ? 'Caution' : safety === 'red' ? 'Closed' : 'No data',
    reasons,
    roadStatus: safety === 'red' ? 'Closed' : 'Route open',
    weatherStatus: safety === 'yellow' ? 'Strong wind' : 'Current',
    vehicleCompatibility: safety === 'red' ? '4WD required' : '2WD ok',
    sourceTimestamps: sourceTimes,
    calculatedAt: '2026-05-25T07:42:00.000Z',
    validUntil: '2026-05-25T08:42:00.000Z',
    version: 1,
  };
}

const seedSpots: Spot[] = [
  { id: 'geysir', name: 'Geysir', region: 'South Iceland', category: 'Geothermal', location: { lat: 64.313, lon: -20.300 }, driveMinutes: 37, distanceKm: 52, stayMinutes: 35, tags: ['geothermal'], isFRoad: false, status: status('geysir', 'green', ['Roads open and wind below caution threshold.']) },
  { id: 'gullfoss', name: 'Gullfoss', region: 'South Iceland', category: 'Waterfall', location: { lat: 64.327, lon: -20.119 }, driveMinutes: 51, distanceKm: 73, stayMinutes: 40, tags: ['waterfall'], isFRoad: false, status: status('gullfoss', 'green', ['Roads open. Spray risk normal for May.']) },
  { id: 'seljalandsfoss', name: 'Seljalandsfoss', region: 'South Iceland', category: 'Waterfall', location: { lat: 63.616, lon: -19.989 }, driveMinutes: 78, distanceKm: 88, stayMinutes: 25, tags: ['waterfall'], isFRoad: false, status: status('seljalandsfoss', 'yellow', ['Gusts to 24 m/s through midday.', 'Open car doors carefully. Keep the visit short.']) },
  { id: 'bruarfoss', name: 'Bruarfoss', region: 'Golden Circle', category: 'Waterfall', location: { lat: 64.265, lon: -20.515 }, driveMinutes: 52, distanceKm: 72, stayMinutes: 30, tags: ['waterfall'], isFRoad: false, status: status('bruarfoss', 'green', ['Paved access and current road data.']) },
  { id: 'thingvellir', name: 'Thingvellir', region: 'Golden Circle', category: 'Rift valley', location: { lat: 64.255, lon: -21.129 }, driveMinutes: 38, distanceKm: 45, stayMinutes: 45, tags: ['rift valley'], isFRoad: false, status: status('thingvellir', 'green', ['Main paths open. Light wind and clear visibility across the rift valley.']) },
  { id: 'kerid', name: 'Kerid Crater', region: 'South Iceland', category: 'Crater lake', location: { lat: 64.041, lon: -20.885 }, driveMinutes: 31, distanceKm: 37, stayMinutes: 30, tags: ['crater lake'], isFRoad: false, status: status('kerid', 'green', ['Crater rim path open. Parking area dry and accessible.']) },
  { id: 'kerlingarfjoll', name: 'Kerlingarfjoll', region: 'Highlands', category: 'Geothermal', location: { lat: 64.642, lon: -19.287 }, driveMinutes: 165, distanceKm: 182, stayMinutes: 45, tags: ['highlands'], isFRoad: true, status: status('kerlingarfjoll', 'red', ['F35 is closed by Vegagerdin due to snowmelt damage.']) },
  { id: 'thorsmork', name: 'Thorsmork', region: 'Highlands', category: 'Nature reserve', location: { lat: 63.680, lon: -19.482 }, driveMinutes: 142, distanceKm: 151, stayMinutes: 45, tags: ['highlands'], isFRoad: true, status: status('thorsmork', 'unknown', ["River-crossing depth at Krossa hasn't refreshed in 6h 14m."]) },
];

const seedExplore: ExploreResponse = {
  hub: { id: 'hub-reykholt', name: 'Reykholt Cabin', location: { lat: 64.663, lon: -21.292 }, dateRange: '13-22 May', nights: 9 },
  dateLabel: 'Today, Thu 14 May',
  vehicle: 'car_2wd',
  dataAgeMinutes: 8,
  spots: seedSpots,
  smartRoutes: [
    { id: 'wind-light-loop', title: 'Wind-light loop', summary: 'Avoids Route 1 gusts. South-facing waterfalls.', driveMinutes: 200, stops: 4, distanceKm: 72, highestStatus: 'yellow' },
    { id: 'photo-loop', title: 'Photo loop', summary: 'Low wind and paved access.', driveMinutes: 130, stops: 3, distanceKm: 46, highestStatus: 'green' },
  ],
};

const seedRouteSuggestions: AttractionRouteSummary[] = [
  {
    id: 'wind-light-loop',
    title: 'Wind-light loop',
    summary: 'Best conditions for your saved waterfalls today.',
    driveMinutes: 200,
    stops: 4,
    distanceKm: 168,
    highestStatus: 'green',
    spotIds: ['geysir', 'gullfoss', 'seljalandsfoss', 'bruarfoss'],
    daylight: 'Comfortable day trip',
    reason: 'Best conditions for your saved waterfalls today.',
  },
  {
    id: 'craters-geothermal',
    title: 'Craters & geothermal',
    summary: 'Short loop from Reykholt, fully paved.',
    driveMinutes: 130,
    stops: 3,
    distanceKm: 94,
    highestStatus: 'green',
    spotIds: ['geysir', 'kerid', 'thingvellir'],
    daylight: 'Comfortable day trip',
    reason: 'Short loop from Reykholt, fully paved.',
  },
  {
    id: 'south-extended',
    title: 'South extended',
    summary: 'Seljalandsfoss has strong gusts until midday.',
    driveMinutes: 245,
    stops: 3,
    distanceKm: 202,
    highestStatus: 'yellow',
    spotIds: ['gullfoss', 'seljalandsfoss', 'kerid'],
    daylight: 'Tight but possible',
    reason: 'Seljalandsfoss has strong gusts until midday.',
  },
];

const seedToday: TodayResponse = {
  title: 'Wind-light loop',
  dateLabel: 'Today - Thu 14 May',
  recheckedMinutesAgo: 8,
  stopProgress: '2/4',
  driveMinutes: 200,
  daylightLeft: '14h 32',
  update: 'Seljalandsfoss wind gusts rising to 24 m/s. Still passable.',
  stops: [
    { id: 'start', title: 'Reykholt Cabin', meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
    { id: 'geysir', title: 'Geysir', meta: "12' drive · 35' stay", driveFromPreviousMinutes: 12, stayMinutes: 35, status: 'green', state: 'done' },
    { id: 'gullfoss', title: 'Gullfoss', meta: "14' drive · 40' stay", driveFromPreviousMinutes: 14, stayMinutes: 40, status: 'green', state: 'done' },
    { id: 'seljalandsfoss', title: 'Seljalandsfoss', meta: "64' drive · 25' stay", driveFromPreviousMinutes: 64, stayMinutes: 25, status: 'yellow', state: 'active', note: 'Gusts to 24 m/s. Keep visit short.' },
    { id: 'bruarfoss', title: 'Brúarfoss', meta: "52' drive · 30' stay", driveFromPreviousMinutes: 52, stayMinutes: 30, status: 'green', state: 'open' },
    { id: 'return', title: 'Reykholt Cabin', meta: "18' drive", driveFromPreviousMinutes: 18, stayMinutes: 0, status: 'green', state: 'return' },
  ],
};

const seedTrip: TripResponse = {
  trip: {
    title: 'Iceland · spring run',
    dates: '13 – 19 MAY',
    vehicle: 'car_2wd',
    pace: 'Relaxed',
    hub: seedExplore.hub,
    status: 'draft',
    totalDays: 7,
    daysPlanned: 5,
    routesUsed: 5,
    totalRoutes: 7,
    hotelsToBook: 2,
    unplacedRoutes: [
      { id: 'snae', title: 'Snæfellsnes peninsula', direction: 'LOOP', stops: 5, durationMinutes: 480 },
      { id: 'lava', title: 'Lava-field short', direction: 'LOOP', stops: 2, durationMinutes: 130 },
    ],
    days: [
      {
        weekday: 'WED', day: '13', title: 'Arrival', summary: 'KEF → Reykholt', status: 'green',
        dayLabel: 'DAY 1',
        route: { direction: 'ONE-WAY', title: 'Arrival drive', durationMinutes: 100, status: 'green' },
        sleep: { initial: 'R', hotel: 'Reykholt...', action: 'check-in' },
      },
      {
        weekday: 'THU', day: '14', title: 'Wind-light loop', summary: 'Geysir · Gullfoss · Bruarfoss', status: 'yellow', today: true,
        dayLabel: 'DAY 2',
        route: { direction: 'LOOP', title: 'Wind-light loop', stops: 4, durationMinutes: 380, status: 'yellow' },
        sleep: { initial: 'R', hotel: 'Reykho...', action: 'check-out' },
      },
      {
        weekday: 'FRI', day: '15', title: 'Golden circle short', summary: '3 stops · 2h 10', status: 'green',
        dayLabel: 'DAY 3',
        route: { direction: 'ONE-WAY', title: 'Golden circle short', stops: 3, durationMinutes: 130, status: 'green' },
      },
      {
        weekday: 'SAT', day: '16', title: 'No plan', summary: 'Rest day', status: 'unknown',
        dayLabel: 'DAY 4',
      },
      {
        weekday: 'SUN', day: '17', title: 'South coast', summary: '4 stops · 5h drive', status: 'yellow',
        dayLabel: 'DAY 5',
        route: { direction: 'ONE-WAY', title: 'South coast', stops: 4, durationMinutes: 300, status: 'yellow' },
      },
    ],
  },
};

function buildSpotContext(spot: Spot): SpotContextResponse {
  const primary: Record<SafetyStatus, string> = {
    green: 'Add to today route',
    yellow: 'Add to route anyway',
    red: 'Show safer alternatives',
    unknown: 'Refresh data',
  };

  return {
    spot,
    primaryAction: primary[spot.status.status],
    secondaryAction: 'Save spot',
    sourceSummary: 'Seed status shaped like official road and weather data.',
  };
}
