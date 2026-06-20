import type {
  AddRouteStopRequest,
  AttractionRouteSummary,
  AuthLoginRequest,
  AuthRegisterRequest,
  AuthResponse,
  CreateTodayRouteRequest,
  ExploreQuery,
  ExploreResponse,
  HealthResponse,
  HotelsSearchResponse,
  Hub,
  InsertPreviewResponse,
  MeResponse,
  OfflineCacheRegionRequest,
  OfflineCacheRegionResponse,
  PlaceSuggestion,
  PlacesSearchResponse,
  PlanSpotResponse,
  RouteMutationResponse,
  RouteStop,
  RouteSuggestion,
  RouteSuggestionsResponse,
  SavedSpotsResponse,
  SaveSpotResponse,
  SocialAuthRequest,
  Spot,
  SpotContextResponse,
  StartSuggestedRouteRequest,
  TodayResponse,
  TripResponse,
} from '@islandhub/domain';
import type { ApiClient } from './api-client.interface';

/**
 * In-memory implementation of {@link ApiClient} that returns fixed typed
 * fixtures. Used for mobile-app integration tests that need typed data
 * without an HTTP server.
 */
export class InMemoryApiClient implements ApiClient {
  private readonly fixtures: InMemoryFixtures;

  constructor(fixtures: Partial<InMemoryFixtures> = {}) {
    this.fixtures = { ...defaultFixtures(), ...fixtures };
  }

  register(_request: AuthRegisterRequest): Promise<AuthResponse> {
    return Promise.resolve(this.fixtures.authResponse);
  }

  login(_request: AuthLoginRequest): Promise<AuthResponse> {
    return Promise.resolve(this.fixtures.authResponse);
  }

  loginWithSocial(_request: SocialAuthRequest): Promise<AuthResponse> {
    return Promise.resolve(this.fixtures.authResponse);
  }

  getHealth(): Promise<HealthResponse> {
    return Promise.resolve(this.fixtures.healthResponse);
  }

  getExplore(_query: ExploreQuery): Promise<ExploreResponse> {
    return Promise.resolve(this.fixtures.exploreResponse);
  }

  getToday(_date?: string): Promise<TodayResponse> {
    return Promise.resolve(this.fixtures.todayResponse);
  }

  getTrip(): Promise<TripResponse> {
    return Promise.resolve(this.fixtures.tripResponse);
  }

  getSavedSpots(): Promise<SavedSpotsResponse> {
    return Promise.resolve(this.fixtures.savedSpotsResponse);
  }

  getRouteSuggestions(_date?: string): Promise<RouteSuggestionsResponse> {
    return Promise.resolve(this.fixtures.routeSuggestionsResponse);
  }

  getSpotContext(_spotId: string, _date?: string): Promise<SpotContextResponse> {
    return Promise.resolve(this.fixtures.spotContextResponse);
  }

  getMe(): Promise<MeResponse> {
    return Promise.resolve(this.fixtures.meResponse);
  }

  previewInsert(_spotId: string, _date?: string): Promise<InsertPreviewResponse> {
    return Promise.resolve(this.fixtures.insertPreviewResponse);
  }

  addRouteStop(_request: AddRouteStopRequest): Promise<RouteMutationResponse> {
    return Promise.resolve(this.fixtures.routeMutationResponse);
  }

  createTodayRoute(_request: CreateTodayRouteRequest): Promise<RouteMutationResponse> {
    return Promise.resolve(this.fixtures.routeMutationResponse);
  }

  planSpotForLater(_spotId: string): Promise<PlanSpotResponse> {
    return Promise.resolve(this.fixtures.planSpotResponse);
  }

  startSuggestedRoute(_request: StartSuggestedRouteRequest): Promise<RouteMutationResponse> {
    return Promise.resolve(this.fixtures.routeMutationResponse);
  }

  markStopDone(_stopId: string, _date?: string): Promise<RouteMutationResponse> {
    return Promise.resolve(this.fixtures.routeMutationResponse);
  }

  saveSpot(_spotId: string): Promise<SaveSpotResponse> {
    return Promise.resolve(this.fixtures.saveSpotResponse);
  }

  searchPlaces(_options?: { q?: string; type?: string; limit?: number }): Promise<PlacesSearchResponse> {
    return Promise.resolve(this.fixtures.placesSearchResponse);
  }

  searchHotels(_options?: { q?: string; lat?: number; lon?: number; limit?: number }): Promise<HotelsSearchResponse> {
    return Promise.resolve(this.fixtures.hotelsSearchResponse);
  }

  cacheOfflineRegions(_request: OfflineCacheRegionRequest): Promise<OfflineCacheRegionResponse> {
    return Promise.resolve(this.fixtures.offlineCacheRegionResponse);
  }

  createPlannedRoute(_request: {
    title?: string;
    date?: string;
    start: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    direction: 'ONE-WAY' | 'LOOP';
    spotIds: string[];
    source: 'wizard' | 'spot_action' | 'manual' | 'suggestion' | 'draft_day';
    makeActiveToday?: boolean;
    replaceExistingToday?: boolean;
  }): Promise<{ route: AttractionRouteSummary; today?: TodayResponse; message: string }> {
    return Promise.resolve(this.fixtures.plannedRouteMutationResponse);
  }

  updatePlannedRoute(_routeId: string, _request: {
    title?: string;
    start?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    spotIds?: string[];
    direction?: 'ONE-WAY' | 'LOOP';
  }): Promise<{ route: AttractionRouteSummary; message: string }> {
    return Promise.resolve({
      route: this.fixtures.plannedRouteMutationResponse.route,
      message: this.fixtures.plannedRouteMutationResponse.message,
    });
  }

  addPlannedStop(_routeId: string, _spotId: string): Promise<{ route: AttractionRouteSummary; message: string }> {
    return Promise.resolve({
      route: this.fixtures.plannedRouteMutationResponse.route,
      message: this.fixtures.plannedRouteMutationResponse.message,
    });
  }

  updatePreferences(_request: Partial<MeResponse['preferences']> & { safety?: Partial<MeResponse['safety']> }): Promise<Pick<MeResponse, 'preferences' | 'safety'>> {
    return Promise.resolve({
      preferences: this.fixtures.meResponse.preferences,
      safety: this.fixtures.meResponse.safety,
    });
  }
}

export interface InMemoryFixtures {
  authResponse: AuthResponse;
  healthResponse: HealthResponse;
  exploreResponse: ExploreResponse;
  todayResponse: TodayResponse;
  tripResponse: TripResponse;
  savedSpotsResponse: SavedSpotsResponse;
  routeSuggestionsResponse: RouteSuggestionsResponse;
  spotContextResponse: SpotContextResponse;
  meResponse: MeResponse;
  insertPreviewResponse: InsertPreviewResponse;
  routeMutationResponse: RouteMutationResponse;
  planSpotResponse: PlanSpotResponse;
  saveSpotResponse: SaveSpotResponse;
  placesSearchResponse: PlacesSearchResponse;
  hotelsSearchResponse: HotelsSearchResponse;
  offlineCacheRegionResponse: OfflineCacheRegionResponse;
  plannedRouteMutationResponse: { route: AttractionRouteSummary; today?: TodayResponse; message: string };
}

function defaultFixtures(): InMemoryFixtures {
  const hub: Hub = {
    id: 'hub-reykholt',
    name: 'Reykholt Cabin',
    location: { lat: 64.663, lon: -21.292 },
    dateRange: '13-22 May',
    nights: 9,
  };

  const spot: Spot = {
    id: 'geysir',
    name: 'Geysir',
    region: 'South Iceland',
    category: 'Geothermal',
    location: { lat: 64.313, lon: -20.3 },
    driveMinutes: 37,
    distanceKm: 52,
    stayMinutes: 35,
    tags: ['geothermal'],
    isFRoad: false,
    status: {
      spotId: 'geysir',
      status: 'green',
      label: 'Open',
      reasons: ['Roads open.'],
      roadStatus: 'Route 1 open',
      weatherStatus: 'Current',
      vehicleCompatibility: '2WD ok',
      sourceTimestamps: [],
      calculatedAt: '2026-05-25T07:42:00.000Z',
      validUntil: '2026-05-25T08:42:00.000Z',
      version: 1,
    },
  };

  const todayStops: RouteStop[] = [];

  const routeSuggestion: RouteSuggestion = {
    id: 'wind-light-loop',
    suggestionId: 'sug-1',
    expiresAt: '2026-05-25T12:00:00.000Z',
    title: 'Wind-light loop',
    summary: 'Geysir',
    driveMinutes: 74,
    stops: 1,
    distanceKm: 52,
    highestStatus: 'green',
    spotIds: ['geysir'],
    daylight: 'Comfortable day trip',
    reason: 'Best conditions for your saved waterfalls today.',
  };

  const attractionRoute: AttractionRouteSummary = {
    id: 'route-1',
    title: 'Wind-light loop',
    summary: '1 stops',
    driveMinutes: 74,
    stops: 1,
    distanceKm: 52,
    highestStatus: 'green',
    spotIds: ['geysir'],
    daylight: 'Comfortable day trip',
    reason: 'Best conditions for your saved waterfalls today.',
  };

  const todayResponse: TodayResponse = {
    title: 'Wind-light loop',
    dateLabel: 'Today - Thu 14 May',
    recheckedMinutesAgo: 8,
    stopProgress: '0/0',
    driveMinutes: 0,
    daylightLeft: '14h 32',
    update: '',
    stops: todayStops,
  };

  const placeSuggestion: PlaceSuggestion = {
    id: 'reykjavik',
    name: 'Reykjavik',
    region: 'Capital Region',
    type: 'city',
    location: { lat: 64.1466, lon: -21.9426 },
  };

  return {
    authResponse: {
      accessToken: 'token-123',
      user: {
        id: 'user-1',
        displayName: 'Lukas',
        initials: 'LK',
        email: 'lukas@pixx.io',
      },
    },
    healthResponse: {
      status: 'ok',
      service: 'islandhub-api',
      mode: 'seed',
      version: 'test',
      checkedAt: '2026-05-25T07:42:00.000Z',
    },
    exploreResponse: {
      hub,
      dateLabel: 'Today, Thu 14 May',
      vehicle: 'car_2wd',
      dataAgeMinutes: 8,
      spots: [spot],
      smartRoutes: [
        {
          id: 'wind-light-loop',
          title: 'Wind-light loop',
          summary: 'Avoids Route 1 gusts.',
          driveMinutes: 200,
          stops: 4,
          distanceKm: 72,
          highestStatus: 'yellow',
        },
      ],
    },
    todayResponse,
    tripResponse: {
      trip: {
        title: 'Iceland spring run',
        dates: 'May 13-22',
        vehicle: 'car_2wd',
        pace: 'Relaxed',
        hub,
        status: 'planned',
        totalDays: 10,
        daysPlanned: 0,
        routesUsed: 0,
        totalRoutes: 0,
        hotelsToBook: 0,
        unplacedRoutes: [],
        days: [],
      },
    },
    savedSpotsResponse: {
      savedSpotIds: ['geysir'],
      spots: [spot],
    },
    routeSuggestionsResponse: {
      savedSpots: [spot],
      routes: [routeSuggestion],
    },
    spotContextResponse: {
      spot,
      primaryAction: 'Add to route',
      secondaryAction: 'Save spot',
      sourceSummary: 'Live API status',
    },
    meResponse: {
      user: {
        id: 'user-1',
        displayName: 'Lukas',
        initials: 'LK',
        email: 'lukas@pixx.io',
        joinedAt: '2026-05-25T07:42:00.000Z',
      },
      subscription: {
        plan: 'free',
        trialAvailable: true,
        headline: 'Headline',
        subcopy: 'Subcopy',
      },
      preferences: {
        locale: 'en',
        units: 'metric',
        temperatureUnit: 'C',
        currency: 'EUR',
      },
      safety: {
        pushAlertsTomorrowRoute: true,
        notifyStatusWorsensEnRoute: true,
        emergencyContactsCount: 0,
      },
      offline: {},
    },
    insertPreviewResponse: {
      spot,
      recommendedAfterStopId: 'stop-1',
      recommendedBeforeStopId: 'stop-2',
      addedDriveMinutes: 10,
      statusImpact: 'green',
      daylightImpact: 'ample',
      warnings: [],
    },
    routeMutationResponse: {
      today: todayResponse,
    },
    planSpotResponse: {
      trip: {
        title: 'Iceland spring run',
        dates: 'May 13-22',
        vehicle: 'car_2wd',
        pace: 'Relaxed',
        hub,
        status: 'planned',
        totalDays: 10,
        daysPlanned: 0,
        routesUsed: 0,
        totalRoutes: 0,
        hotelsToBook: 0,
        unplacedRoutes: [],
        days: [],
      },
      message: 'Spot planned.',
    },
    saveSpotResponse: {
      spot,
      savedSpotIds: ['geysir'],
      message: 'Spot saved.',
    },
    placesSearchResponse: {
      places: [placeSuggestion],
    },
    hotelsSearchResponse: {
      hotels: [
        {
          ...placeSuggestion,
          type: 'hotel',
          stars: 4,
          bookingState: 'unknown',
        },
      ],
    },
    offlineCacheRegionResponse: {
      cacheJobId: 'cache-1',
      state: 'queued',
      label: 'South Iceland',
      message: 'Cache job queued.',
    },
    plannedRouteMutationResponse: {
      route: attractionRoute,
      today: todayResponse,
      message: 'Route updated.',
    },
  };
}
