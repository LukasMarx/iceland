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
  InsertPreviewResponse,
  MeResponse,
  OfflineCacheRegionRequest,
  OfflineCacheRegionResponse,
  PlacesSearchResponse,
  PlanSpotResponse,
  RouteMutationResponse,
  RouteSuggestionsResponse,
  SavedSpotsResponse,
  SaveSpotResponse,
  SocialAuthRequest,
  SpotContextResponse,
  StartSuggestedRouteRequest,
  TodayResponse,
  TripResponse,
} from '@islandhub/domain';

/**
 * Contract for the IslandHub API client.
 *
 * Both the real HTTP-backed {@link IslandhubApiService} and the
 * {@link InMemoryApiClient} test adapter implement this interface so that
 * mobile-app integration tests can run without an HTTP server.
 */
export interface ApiClient {
  // ── auth ────────────────────────────────────────────────────
  register(request: AuthRegisterRequest): Promise<AuthResponse>;
  login(request: AuthLoginRequest): Promise<AuthResponse>;
  loginWithSocial(request: SocialAuthRequest): Promise<AuthResponse>;

  // ── data loading ────────────────────────────────────────────
  getHealth(): Promise<HealthResponse>;
  getExplore(query: ExploreQuery): Promise<ExploreResponse>;
  getToday(date?: string): Promise<TodayResponse>;
  getTrip(): Promise<TripResponse>;
  getSavedSpots(): Promise<SavedSpotsResponse>;
  getRouteSuggestions(date?: string): Promise<RouteSuggestionsResponse>;
  getSpotContext(spotId: string, date?: string): Promise<SpotContextResponse>;
  getMe(): Promise<MeResponse>;

  // ── route mutations ─────────────────────────────────────────
  previewInsert(spotId: string, date?: string): Promise<InsertPreviewResponse>;
  addRouteStop(request: AddRouteStopRequest): Promise<RouteMutationResponse>;
  createTodayRoute(request: CreateTodayRouteRequest): Promise<RouteMutationResponse>;
  planSpotForLater(spotId: string): Promise<PlanSpotResponse>;
  startSuggestedRoute(request: StartSuggestedRouteRequest): Promise<RouteMutationResponse>;
  markStopDone(stopId: string, date?: string): Promise<RouteMutationResponse>;
  saveSpot(spotId: string): Promise<SaveSpotResponse>;

  // ── search ──────────────────────────────────────────────────
  searchPlaces(options?: { q?: string; type?: string; limit?: number }): Promise<PlacesSearchResponse>;
  searchHotels(options?: { q?: string; lat?: number; lon?: number; limit?: number }): Promise<HotelsSearchResponse>;

  // ── offline ─────────────────────────────────────────────────
  cacheOfflineRegions(request: OfflineCacheRegionRequest): Promise<OfflineCacheRegionResponse>;

  // ── planned routes ──────────────────────────────────────────
  createPlannedRoute(request: {
    title?: string;
    date?: string;
    start: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    direction: 'ONE-WAY' | 'LOOP';
    spotIds: string[];
    source: 'wizard' | 'spot_action' | 'manual' | 'suggestion' | 'draft_day';
    makeActiveToday?: boolean;
    replaceExistingToday?: boolean;
  }): Promise<{ route: AttractionRouteSummary; today?: TodayResponse; message: string }>;

  updatePlannedRoute(routeId: string, request: {
    title?: string;
    start?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    spotIds?: string[];
    direction?: 'ONE-WAY' | 'LOOP';
  }): Promise<{ route: AttractionRouteSummary; message: string }>;

  addPlannedStop(routeId: string, spotId: string): Promise<{ route: AttractionRouteSummary; message: string }>;

  // ── preferences ─────────────────────────────────────────────
  updatePreferences(request: Partial<MeResponse['preferences']> & { safety?: Partial<MeResponse['safety']> }): Promise<Pick<MeResponse, 'preferences' | 'safety'>>;
}
