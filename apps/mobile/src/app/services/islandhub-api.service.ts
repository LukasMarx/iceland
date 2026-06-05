import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AddRouteStopRequest,
  AuthLoginRequest,
  AuthRegisterRequest,
  AuthResponse,
  SocialAuthRequest,
  AttractionRouteSummary,
  CreateTodayRouteRequest,
  ExploreQuery,
  ExploreResponse,
  HotelSuggestion,
  HotelsSearchResponse,
  Hub,
  HealthResponse,
  InsertPreviewResponse,
  MeResponse,
  MediaAsset,
  OfflineCacheRegionRequest,
  OfflineCacheRegionResponse,
  PlanSpotResponse,
  PlaceSuggestion,
  PlacesSearchResponse,
  RouteMutationResponse,
  RouteStop,
  RouteSuggestionsResponse,
  SafetyStatus,
  SavedSpotsResponse,
  SaveSpotResponse,
  SourceTimestamp,
  Spot,
  SpotStatusSnapshot,
  TripDay,
  SpotContextResponse,
  StartSuggestedRouteRequest,
  TodayResponse,
  TripResponse,
} from '@islandhub/api-contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({ providedIn: 'root' })
export class IslandhubApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  register(request: AuthRegisterRequest): Promise<AuthResponse> {
    return this.post<unknown>('/auth/register', request).then((response) => this.normalizeAuthResponse(response));
  }

  login(request: AuthLoginRequest): Promise<AuthResponse> {
    return this.post<unknown>('/auth/login', request).then((response) => this.normalizeAuthResponse(response));
  }

  loginWithSocial(request: SocialAuthRequest): Promise<AuthResponse> {
    return this.post<unknown>('/auth/social', request).then((response) => this.normalizeAuthResponse(response));
  }

  getHealth(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/health');
  }

  getExplore(query: ExploreQuery): Promise<ExploreResponse> {
    let params = new HttpParams()
      .set('vehicle', query.vehicle ?? 'car_2wd')
      .set('showFRoads', String(query.showFRoads ?? false))
      .set('maxDriveMinutes', String(query.maxDriveMinutes ?? 90));

    if (query.statuses?.length) {
      params = params.set('status', query.statuses.join(','));
    }

    if (query.categories?.length) {
      params = params.set('category', query.categories.join(','));
    }

    if (query.date) {
      params = params.set('date', query.date);
    }

    return firstValueFrom(this.http.get<unknown>(this.url('/explore'), { params }))
      .then((response) => this.normalizeExplore(response));
  }

  getToday(date?: string): Promise<TodayResponse> {
    const params = date ? new HttpParams().set('date', date) : undefined;

    return firstValueFrom(this.http.get<unknown>(this.url('/today'), { params }))
      .then((response) => this.normalizeToday(response));
  }

  getTrip(): Promise<TripResponse> {
    return this.get<unknown>('/trip').then((response) => this.normalizeTripResponse(response));
  }

  getSavedSpots(): Promise<SavedSpotsResponse> {
    return this.get<unknown>('/saved-spots').then((response) => this.normalizeSavedSpots(response));
  }

  getRouteSuggestions(date?: string): Promise<RouteSuggestionsResponse> {
    const params = date ? new HttpParams().set('date', date) : undefined;

    return firstValueFrom(this.http.get<unknown>(this.url('/routes/suggestions'), { params }))
      .then((response) => this.normalizeRouteSuggestions(response));
  }

  getSpotContext(spotId: string, date?: string): Promise<SpotContextResponse> {
    const params = date ? new HttpParams().set('date', date) : undefined;

    return firstValueFrom(this.http.get<unknown>(this.url(`/spots/${spotId}/context`), { params }))
      .then((response) => this.normalizeSpotContext(response));
  }

  previewInsert(spotId: string, date?: string): Promise<InsertPreviewResponse> {
    return this.post<unknown>('/routes/today/insert-preview', { spotId, date }).then((response) => this.normalizeInsertPreview(response));
  }

  addRouteStop(request: AddRouteStopRequest): Promise<RouteMutationResponse> {
    return this.post<unknown>('/routes/today/stops', request).then((response) => this.normalizeRouteMutation(response));
  }

  createTodayRoute(request: CreateTodayRouteRequest): Promise<RouteMutationResponse> {
    return this.post<unknown>('/routes/today', request).then((response) => this.normalizeRouteMutation(response));
  }

  planSpotForLater(spotId: string): Promise<PlanSpotResponse> {
    return this.post<unknown>('/draft-days', { spotId }).then((response) => this.normalizePlanSpot(response));
  }

  startSuggestedRoute(request: StartSuggestedRouteRequest): Promise<RouteMutationResponse> {
    return this.post<unknown>('/routes/suggestions/start', request).then((response) => this.normalizeRouteMutation(response));
  }

  markStopDone(stopId: string, date?: string): Promise<RouteMutationResponse> {
    return firstValueFrom(this.http.patch<unknown>(this.url(`/routes/today/stops/${stopId}/done`), { date }))
      .then((response) => this.normalizeRouteMutation(response));
  }

  saveSpot(spotId: string): Promise<SaveSpotResponse> {
    return this.post<unknown>('/saved-spots', { spotId }).then((response) => this.normalizeSaveSpot(response));
  }

  getMe(): Promise<MeResponse> {
    return this.get<unknown>('/me').then((response) => this.normalizeMe(response));
  }

  searchPlaces(options: { q?: string; type?: string; limit?: number } = {}): Promise<PlacesSearchResponse> {
    let params = new HttpParams().set('limit', String(options.limit ?? 10));
    if (options.q) params = params.set('q', options.q);
    if (options.type) params = params.set('type', options.type);

    return firstValueFrom(this.http.get<unknown>(this.url('/places/search'), { params }))
      .then((response) => this.normalizePlacesSearch(response));
  }

  searchHotels(options: { q?: string; lat?: number; lon?: number; limit?: number } = {}): Promise<HotelsSearchResponse> {
    let params = new HttpParams().set('limit', String(options.limit ?? 10));
    if (options.q) params = params.set('q', options.q);
    if (options.lat !== undefined) params = params.set('lat', String(options.lat));
    if (options.lon !== undefined) params = params.set('lon', String(options.lon));

    return firstValueFrom(this.http.get<unknown>(this.url('/hotels/search'), { params }))
      .then((response) => this.normalizeHotelsSearch(response));
  }

  cacheOfflineRegions(request: OfflineCacheRegionRequest): Promise<OfflineCacheRegionResponse> {
    return this.post<unknown>('/offline/cache-regions', request).then((response) => this.normalizeOfflineCacheRegion(response));
  }

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
  }): Promise<{ route: AttractionRouteSummary; today?: TodayResponse; message: string }> {
    return this.post<unknown>('/routes', request).then((response) => this.normalizePlannedRouteMutation(response));
  }

  updatePlannedRoute(routeId: string, request: {
    title?: string;
    start?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    spotIds?: string[];
    direction?: 'ONE-WAY' | 'LOOP';
  }): Promise<{ route: AttractionRouteSummary; message: string }> {
    return firstValueFrom(this.http.patch<unknown>(this.url(`/routes/${routeId}`), request))
      .then((response) => this.normalizePlannedRouteMutation(response));
  }

  addPlannedStop(routeId: string, spotId: string): Promise<{ route: AttractionRouteSummary; message: string }> {
    return this.post<unknown>(`/routes/${routeId}/stops`, { spotId, position: 'recommended' })
      .then((response) => this.normalizePlannedRouteMutation(response));
  }

  updatePreferences(request: Partial<MeResponse['preferences']> & { safety?: Partial<MeResponse['safety']> }): Promise<Pick<MeResponse, 'preferences' | 'safety'>> {
    return firstValueFrom(this.http.patch<unknown>(this.url('/me/preferences'), request))
      .then((response) => this.normalizePreferenceUpdate(response));
  }

  private normalizeExplore(response: unknown): ExploreResponse {
    const raw = this.record(response);
    const spots = this.array(raw['spots']).map((spot) => this.normalizeSpot(spot));

    return {
      hub: this.normalizeHub(raw['hub']),
      dateLabel: this.stringValue(raw['dateLabel'], 'Today'),
      vehicle: this.stringValue(raw['vehicle'], 'unknown') as ExploreResponse['vehicle'],
      dataAgeMinutes: this.numberValue(raw['dataAgeMinutes'], 0),
      spots,
      smartRoutes: this.array(raw['smartRoutes']) as ExploreResponse['smartRoutes'],
    };
  }

  private normalizeToday(response: unknown): TodayResponse {
    const raw = this.record(response);
    const stops = this.array(raw['stops']).map((stop) => this.normalizeRouteStop(stop));

    return {
      title: this.stringValue(raw['title'], 'Today'),
      dateLabel: this.stringValue(raw['dateLabel'], raw['date'], 'Today'),
      recheckedMinutesAgo: this.numberValue(raw['recheckedMinutesAgo'], 0),
      stopProgress: this.stringValue(raw['stopProgress'], `0/${stops.length}`),
      driveMinutes: this.numberValue(raw['driveMinutes'], raw['totalDriveMinutes'], 0),
      daylightLeft: this.stringValue(raw['daylightLeft'], raw['daylightLeftLabel'], ''),
      update: this.stringValue(raw['update'], ''),
      stops,
    };
  }

  private normalizeTripResponse(response: unknown): TripResponse {
    const raw = this.record(response);
    const trip = this.record(raw['trip']);
    const startsOn = this.stringValue(trip['startsOn']);
    const endsOn = this.stringValue(trip['endsOn']);
    const days = this.array(trip['days']).map((day, index) => this.normalizeTripDay(day, index));
    const totalDays = this.numberValue(trip['totalDays'], days.length);
    const daysPlanned = this.numberValue(trip['daysPlanned'], days.filter((day) => day.title !== 'No plan').length);
    const hub = this.normalizeHub(trip['hub'], startsOn && endsOn ? `${startsOn} - ${endsOn}` : undefined, Math.max(0, totalDays - 1));

    return {
      trip: {
        title: this.stringValue(trip['title'], 'Trip'),
        dates: this.stringValue(trip['dates'], startsOn && endsOn ? `${startsOn} - ${endsOn}` : ''),
        vehicle: this.stringValue(trip['vehicle'], 'unknown') as TripResponse['trip']['vehicle'],
        pace: this.stringValue(trip['pace'], ''),
        hub,
        status: this.stringValue(trip['status'], 'planned') as TripResponse['trip']['status'],
        totalDays,
        daysPlanned,
        routesUsed: this.numberValue(trip['routesUsed'], 0),
        totalRoutes: this.numberValue(trip['totalRoutes'], this.numberValue(trip['routesUsed'], 0) + this.array(trip['unplacedRoutes']).length),
        hotelsToBook: this.numberValue(trip['hotelsToBook'], 0),
        unplacedRoutes: this.array(trip['unplacedRoutes']) as TripResponse['trip']['unplacedRoutes'],
        days,
      },
    };
  }

  private normalizeSavedSpots(response: unknown): SavedSpotsResponse {
    const raw = this.record(response);
    return {
      savedSpotIds: this.stringArray(raw['savedSpotIds']),
      spots: this.array(raw['spots']).map((spot) => this.normalizeSpot(spot)),
    };
  }

  private normalizeRouteSuggestions(response: unknown): RouteSuggestionsResponse {
    const raw = this.record(response);
    return {
      savedSpots: this.array(raw['savedSpots']).map((spot) => this.normalizeSpot(spot)),
      routes: this.array(raw['routes']) as RouteSuggestionsResponse['routes'],
      pageInfo: { hasMore: Boolean(this.record(raw['pageInfo'])['hasMore']), nextCursor: this.stringValue(this.record(raw['pageInfo'])['nextCursor']) || undefined },
    };
  }

  private normalizeSpotContext(response: unknown): SpotContextResponse {
    const raw = this.record(response);
    return {
      spot: this.normalizeSpot(raw['spot']),
      primaryAction: this.stringValue(raw['primaryAction'], 'Add to route'),
      secondaryAction: this.stringValue(raw['secondaryAction'], 'Save spot'),
      sourceSummary: this.stringValue(raw['sourceSummary'], 'Live API status'),
    };
  }

  private normalizeInsertPreview(response: unknown): InsertPreviewResponse {
    const raw = this.record(response);
    return {
      spot: this.normalizeSpot(raw['spot']),
      recommendedAfterStopId: this.stringValue(raw['recommendedAfterStopId']),
      recommendedBeforeStopId: this.stringValue(raw['recommendedBeforeStopId']),
      addedDriveMinutes: this.numberValue(raw['addedDriveMinutes'], 0),
      statusImpact: this.stringValue(raw['statusImpact'], 'unknown'),
      daylightImpact: this.stringValue(raw['daylightImpact'], 'unknown') as InsertPreviewResponse['daylightImpact'],
      warnings: this.stringArray(raw['warnings']),
    };
  }

  private normalizeRouteMutation(response: unknown): RouteMutationResponse {
    const raw = this.record(response);
    return { today: this.normalizeToday(raw['today']) };
  }

  private normalizePlanSpot(response: unknown): PlanSpotResponse {
    const raw = this.record(response);
    return {
      trip: this.normalizeTripResponse({ trip: raw['trip'] }).trip,
      message: this.stringValue(raw['message'], 'Spot planned.'),
    };
  }

  private normalizeSaveSpot(response: unknown): SaveSpotResponse {
    const raw = this.record(response);
    return {
      spot: this.normalizeSpot(raw['spot']),
      savedSpotIds: this.stringArray(raw['savedSpotIds']),
      message: this.stringValue(raw['message'], 'Spot saved.'),
    };
  }

  private normalizeMe(response: unknown): MeResponse {
    const raw = this.record(response);
    const user = this.record(raw['user']);
    const subscription = this.record(raw['subscription']);
    const preferences = this.record(raw['preferences']);
    const safety = this.record(raw['safety']);
    const offline = this.record(raw['offline']);

    return {
      user: {
        id: this.stringValue(user['id']),
        displayName: this.stringValue(user['displayName'], 'Account'),
        initials: this.stringValue(user['initials'], 'IH'),
        email: this.stringValue(user['email']),
        joinedAt: this.stringValue(user['joinedAt']),
      },
      subscription: {
        plan: this.stringValue(subscription['plan'], 'free') as MeResponse['subscription']['plan'],
        trialAvailable: Boolean(subscription['trialAvailable']),
        headline: this.stringValue(subscription['headline']),
        subcopy: this.stringValue(subscription['subcopy']),
      },
      preferences: {
        locale: this.stringValue(preferences['locale'], 'en'),
        units: this.stringValue(preferences['units'], 'metric'),
        temperatureUnit: this.stringValue(preferences['temperatureUnit'], 'C'),
        currency: this.stringValue(preferences['currency'], 'EUR'),
      },
      safety: {
        pushAlertsTomorrowRoute: Boolean(safety['pushAlertsTomorrowRoute']),
        notifyStatusWorsensEnRoute: Boolean(safety['notifyStatusWorsensEnRoute']),
        emergencyContactsCount: this.numberValue(safety['emergencyContactsCount'], 0),
      },
      offline: {
        cachedMapAreaLabel: this.stringValue(offline['cachedMapAreaLabel']) || undefined,
        cachedTodayRouteStops: offline['cachedTodayRouteStops'] === undefined ? undefined : this.numberValue(offline['cachedTodayRouteStops']),
        lastSyncedAt: this.stringValue(offline['lastSyncedAt']) || undefined,
      },
    };
  }

  private normalizePlacesSearch(response: unknown): PlacesSearchResponse {
    const raw = this.record(response);
    return {
      places: this.array(raw['places'] ?? raw['suggestions']).map((place) => this.normalizePlace(place)),
      pageInfo: { hasMore: Boolean(this.record(raw['pageInfo'])['hasMore']), nextCursor: this.stringValue(this.record(raw['pageInfo'])['nextCursor']) || undefined },
    };
  }

  private normalizeHotelsSearch(response: unknown): HotelsSearchResponse {
    const raw = this.record(response);
    return {
      hotels: this.array(raw['hotels'] ?? raw['suggestions']).map((hotel) => this.normalizeHotel(hotel)),
      pageInfo: { hasMore: Boolean(this.record(raw['pageInfo'])['hasMore']), nextCursor: this.stringValue(this.record(raw['pageInfo'])['nextCursor']) || undefined },
    };
  }

  private normalizeOfflineCacheRegion(response: unknown): OfflineCacheRegionResponse {
    const raw = this.record(response);
    return {
      cacheJobId: this.stringValue(raw['cacheJobId']),
      state: this.stringValue(raw['state'], 'queued') as OfflineCacheRegionResponse['state'],
      label: this.stringValue(raw['label']),
      message: this.stringValue(raw['message'], 'Cache job queued.'),
    };
  }

  private normalizePreferenceUpdate(response: unknown): Pick<MeResponse, 'preferences' | 'safety'> {
    const raw = this.record(response);
    const preferences = this.record(raw['preferences']);
    const safety = this.record(raw['safety']);

    return {
      preferences: {
        locale: this.stringValue(preferences['locale'], 'en'),
        units: this.stringValue(preferences['units'], 'metric'),
        temperatureUnit: this.stringValue(preferences['temperatureUnit'], 'C'),
        currency: this.stringValue(preferences['currency'], 'EUR'),
      },
      safety: {
        pushAlertsTomorrowRoute: Boolean(safety['pushAlertsTomorrowRoute']),
        notifyStatusWorsensEnRoute: Boolean(safety['notifyStatusWorsensEnRoute']),
        emergencyContactsCount: this.numberValue(safety['emergencyContactsCount'], 0),
      },
    };
  }

  private normalizeAuthResponse(response: unknown): AuthResponse {
    const raw = this.record(response);
    const user = this.record(raw['user']);

    return {
      accessToken: this.stringValue(raw['accessToken']),
      user: {
        id: this.stringValue(user['id']),
        displayName: this.stringValue(user['displayName'], 'IslandHub User'),
        initials: this.stringValue(user['initials'], 'IH'),
        email: this.stringValue(user['email']),
      },
    };
  }

  private normalizePlannedRouteMutation(response: unknown): { route: AttractionRouteSummary; today?: TodayResponse; message: string } {
    const raw = this.record(response);
    const today = raw['today'] ? this.normalizeToday(raw['today']) : undefined;
    return {
      route: this.normalizeAttractionRoute(raw['route']),
      today,
      message: this.stringValue(raw['message'], 'Route updated.'),
    };
  }

  private normalizeAttractionRoute(rawRoute: unknown): AttractionRouteSummary {
    const raw = this.record(rawRoute);
    const routeStops = this.array(raw['stops']);
    const spotIds = this.stringArray(raw['spotIds']).length
      ? this.stringArray(raw['spotIds'])
      : routeStops.map((stop) => this.stringValue(this.record(stop)['spotId'])).filter(Boolean);
    const highestStatus = this.record(raw['highestStatus']);

    return {
      id: this.stringValue(raw['id']),
      title: this.stringValue(raw['title'], 'Route'),
      summary: spotIds.length ? `${spotIds.length} stops` : this.stringValue(raw['summary']),
      driveMinutes: this.numberValue(raw['driveMinutes'], raw['totalDriveMinutes'], 0),
      stops: this.numberValue(raw['stopCount'], raw['stopsCount'], spotIds.length),
      distanceKm: this.numberValue(raw['distanceKm'], 0),
      highestStatus: this.safetyStatus(this.stringValue(raw['highestStatus'], highestStatus['level'], 'unknown')),
      spotIds,
      daylight: this.stringValue(raw['daylight'], 'API route'),
      reason: this.stringValue(raw['reason'], 'Created by API route planner.'),
    };
  }

  private normalizeSpot(rawSpot: unknown): Spot {
    const raw = this.record(rawSpot);
    const driveMinutes = this.numberValue(raw['driveMinutes'], raw['driveMinutesFromHub'], 0);
    const distanceKm = this.numberValue(raw['distanceKm'], raw['distanceKmFromHub'], Math.round(driveMinutes * 1.2));
    const stayMinutes = this.numberValue(raw['stayMinutes'], raw['visitMinutes'], 0);

    return {
      id: this.stringValue(raw['id']),
      name: this.stringValue(raw['name'], 'Unknown spot'),
      region: this.stringValue(raw['region'], ''),
      category: this.stringValue(raw['category'], this.stringArray(raw['categoryIds'])[0], 'Uncategorized'),
      location: this.normalizeLocation(raw['location']),
      driveMinutes,
      distanceKm,
      stayMinutes,
      status: this.normalizeStatus(raw['status'], this.stringValue(raw['id'])),
      tags: this.stringArray(raw['tags']).length ? this.stringArray(raw['tags']) : this.stringArray(raw['categoryIds']),
      isFRoad: Boolean(raw['isFRoad']),
      media: this.array(raw['media']).map((media) => this.normalizeMedia(media)),
    };
  }

  private normalizePlace(rawPlace: unknown): PlaceSuggestion {
    const raw = this.record(rawPlace);
    return {
      id: this.stringValue(raw['id']),
      name: this.stringValue(raw['name'], 'Place'),
      region: this.stringValue(raw['region']),
      type: this.stringValue(raw['type'], 'custom') as PlaceSuggestion['type'],
      location: this.normalizeLocation(raw['location']),
      distanceKm: raw['distanceKm'] === undefined ? undefined : this.numberValue(raw['distanceKm']),
      source: this.stringValue(raw['source']) || undefined,
    };
  }

  private normalizeHotel(rawHotel: unknown): HotelSuggestion {
    const raw = this.record(rawHotel);
    const media = this.array(raw['media']).map((entry) => this.normalizeMedia(entry));
    const heroImage = this.stringValue(raw['heroImage']);
    return {
      ...this.normalizePlace({ ...raw, type: 'hotel' }),
      type: 'hotel',
      stars: raw['stars'] === null || raw['stars'] === undefined ? undefined : this.numberValue(raw['stars']),
      media: heroImage ? [{ id: heroImage, type: 'image', url: heroImage, alt: this.stringValue(raw['name'], 'Hotel') }, ...media] : media,
      bookingState: this.stringValue(raw['bookingState'], 'unknown') as HotelSuggestion['bookingState'],
      bookingUrl: this.stringValue(raw['bookingUrl']) || undefined,
    };
  }

  private normalizeMedia(rawMedia: unknown): MediaAsset {
    const raw = this.record(rawMedia);
    return {
      id: this.stringValue(raw['id'], raw['url']),
      type: this.stringValue(raw['type'], 'image'),
      url: this.stringValue(raw['url'], raw['heroImage']),
      thumbnailUrl: this.stringValue(raw['thumbnailUrl']) || undefined,
      alt: this.stringValue(raw['alt'], raw['name'], 'Image'),
      credit: this.stringValue(raw['credit']) || undefined,
    };
  }

  private normalizeHub(rawHub: unknown, dateRange = '', nights = 0): Hub {
    const raw = this.record(rawHub);
    return {
      id: this.stringValue(raw['id']),
      name: this.stringValue(raw['name'], 'Current hub'),
      location: this.normalizeLocation(raw['location']),
      dateRange: this.stringValue(raw['dateRange'], dateRange),
      nights: this.numberValue(raw['nights'], nights),
    };
  }

  private normalizeRouteStop(rawStop: unknown): RouteStop {
    const raw = this.record(rawStop);
    const driveMinutes = this.numberValue(raw['driveFromPreviousMinutes'], raw['driveMinutesFromPrevious'], 0);
    const stayMinutes = this.numberValue(raw['stayMinutes'], raw['visitMinutes'], 0);
    const status = this.normalizeStatus(raw['status'], this.stringValue(raw['spotId'], raw['id']));

    return {
      id: this.stringValue(raw['id'], raw['spotId']),
      spotId: this.stringValue(raw['spotId']) || undefined,
      title: this.stringValue(raw['title'], raw['spotId'], 'Stop'),
      meta: this.stringValue(raw['meta'], driveMinutes > 0 ? `${driveMinutes} min drive` : ''),
      driveFromPreviousMinutes: driveMinutes,
      stayMinutes,
      status: status.status,
      state: this.normalizeStopState(raw['state']),
      note: status.reasons[0],
    };
  }

  private normalizeTripDay(rawDay: unknown, index: number): TripDay {
    const raw = this.record(rawDay);
    const date = this.stringValue(raw['date']);
    const dayNumber = date ? date.slice(-2) : String(index + 1).padStart(2, '0');

    return {
      date: date || undefined,
      weekday: date ? this.weekday(date) : '',
      day: dayNumber,
      title: this.stringValue(raw['title'], 'No plan'),
      summary: this.stringValue(raw['summary'], this.stringArray(raw['routeIds']).length ? `${this.stringArray(raw['routeIds']).length} route` : ''),
      status: this.tripDayStatus(raw['status']),
      today: this.stringValue(raw['status']) === 'active',
      dayLabel: `DAY ${index + 1}`,
    };
  }

  private normalizeStatus(rawStatus: unknown, spotId: string): SpotStatusSnapshot {
    const raw = this.record(rawStatus);
    const safety = this.safetyStatus(this.stringValue(raw['status'], raw['level'], 'unknown'));
    const reason = this.stringValue(raw['reason']);
    const reasons = this.stringArray(raw['reasons']);

    return {
      spotId,
      status: safety,
      label: this.stringValue(raw['label'], safety),
      reasons: reasons.length ? reasons : reason ? [reason] : [],
      roadStatus: this.stringValue(raw['roadStatus'], this.stringValue(raw['label'], safety)),
      weatherStatus: this.stringValue(raw['weatherStatus'], 'Current'),
      vehicleCompatibility: this.stringValue(raw['vehicleCompatibility'], 'Check vehicle rules'),
      sourceTimestamps: this.array(raw['sourceTimestamps']) as SourceTimestamp[],
      calculatedAt: this.stringValue(raw['calculatedAt'], raw['updatedAt'], new Date().toISOString()),
      validUntil: this.stringValue(raw['validUntil'], raw['updatedAt'], new Date().toISOString()),
      version: this.numberValue(raw['version'], 1),
    };
  }

  private normalizeLocation(rawLocation: unknown): { lat: number; lon: number } {
    const raw = this.record(rawLocation);
    return { lat: this.numberValue(raw['lat'], 0), lon: this.numberValue(raw['lon'], 0) };
  }

  private normalizeStopState(value: unknown): RouteStop['state'] {
    const state = this.stringValue(value);
    if (state === 'pending') return 'open';
    if (state === 'start' || state === 'done' || state === 'active' || state === 'open' || state === 'return') return state;
    return 'open';
  }

  private tripDayStatus(value: unknown): SafetyStatus {
    const status = this.stringValue(value);
    if (status === 'done') return 'green';
    if (status === 'active') return 'yellow';
    if (status === 'cancelled') return 'red';
    return 'unknown';
  }

  private safetyStatus(value: string): SafetyStatus {
    return value === 'green' || value === 'yellow' || value === 'red' || value === 'unknown' ? value : 'unknown';
  }

  private weekday(date: string): string {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(`${date}T00:00:00.000Z`))
      .toUpperCase();
  }

  private record(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  }

  private array(value: unknown): unknown[] {
    return Array.isArray(value) ? value : [];
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0) : [];
  }

  private stringValue(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return '';
  }

  private numberValue(...values: unknown[]): number {
    for (const value of values) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    return 0;
  }

  private get<TResponse>(path: string): Promise<TResponse> {
    return firstValueFrom(this.http.get<TResponse>(this.url(path)));
  }

  private post<TResponse>(path: string, body: unknown): Promise<TResponse> {
    return firstValueFrom(this.http.post<TResponse>(this.url(path), body));
  }

  private url(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }
}
