import type { SafetyStatus } from './safety';
import type {
  AttractionRouteSummary,
  AuthResponse,
  ExploreResponse,
  HotelSuggestion,
  HotelsSearchResponse,
  Hub,
  InsertPreviewResponse,
  MediaAsset,
  MeResponse,
  OfflineCacheRegionResponse,
  PlaceSuggestion,
  PlacesSearchResponse,
  PlanSpotResponse,
  RawRouteSuggestion,
  RouteMutationResponse,
  RouteStop,
  RouteSuggestionsResponse,
  SavedSpotsResponse,
  SaveSpotResponse,
  SourceTimestamp,
  Spot,
  SpotContextResponse,
  SpotStatusSnapshot,
  TodayResponse,
  TripDay,
  TripResponse,
  VehicleProfile,
} from './types';
import { normalizeRouteSuggestion } from './types';

// ── defensive parsing helpers ───────────────────────────────

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];
}

function stringValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return '';
}

function numberValue(...values: unknown[]): number {
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

function safetyStatus(value: string): SafetyStatus {
  return value === 'green' || value === 'yellow' || value === 'red' || value === 'unknown'
    ? value
    : 'unknown';
}

function weekday(date: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' })
    .format(new Date(`${date}T00:00:00.000Z`))
    .toUpperCase();
}

// ── leaf normalizers ────────────────────────────────────────

export function normalizeLocation(rawLocation: unknown): { lat: number; lon: number } {
  const raw = record(rawLocation);
  return { lat: numberValue(raw['lat'], 0), lon: numberValue(raw['lon'], 0) };
}

export function normalizeMedia(rawMedia: unknown): MediaAsset {
  const raw = record(rawMedia);
  return {
    id: stringValue(raw['id'], raw['url']),
    type: stringValue(raw['type'], 'image'),
    url: stringValue(raw['url'], raw['heroImage']),
    thumbnailUrl: stringValue(raw['thumbnailUrl']) || undefined,
    alt: stringValue(raw['alt'], raw['name'], 'Image'),
    credit: stringValue(raw['credit']) || undefined,
  };
}

export function normalizeStatusSnapshot(rawStatus: unknown, spotId: string): SpotStatusSnapshot {
  const raw = record(rawStatus);
  const safety = safetyStatus(stringValue(raw['status'], raw['level'], 'unknown'));
  const reason = stringValue(raw['reason']);
  const reasons = stringArray(raw['reasons']);

  return {
    spotId,
    status: safety,
    label: stringValue(raw['label'], safety),
    reasons: reasons.length ? reasons : reason ? [reason] : [],
    roadStatus: stringValue(raw['roadStatus'], stringValue(raw['label'], safety)),
    weatherStatus: stringValue(raw['weatherStatus'], 'Current'),
    vehicleCompatibility: stringValue(raw['vehicleCompatibility'], 'Check vehicle rules'),
    sourceTimestamps: array(raw['sourceTimestamps']) as SourceTimestamp[],
    calculatedAt: stringValue(raw['calculatedAt'], raw['updatedAt'], new Date().toISOString()),
    validUntil: stringValue(raw['validUntil'], raw['updatedAt'], new Date().toISOString()),
    version: numberValue(raw['version'], 1),
  };
}

export function normalizeSpot(rawSpot: unknown): Spot {
  const raw = record(rawSpot);
  const driveMinutes = numberValue(raw['driveMinutes'], raw['driveMinutesFromHub'], 0);
  const distanceKm = numberValue(
    raw['distanceKm'],
    raw['distanceKmFromHub'],
    Math.round(driveMinutes * 1.2),
  );
  const stayMinutes = numberValue(raw['stayMinutes'], raw['visitMinutes'], 0);

  return {
    id: stringValue(raw['id']),
    name: stringValue(raw['name'], 'Unknown spot'),
    region: stringValue(raw['region'], ''),
    category: stringValue(raw['category'], stringArray(raw['categoryIds'])[0], 'Uncategorized'),
    location: normalizeLocation(raw['location']),
    driveMinutes,
    distanceKm,
    stayMinutes,
    status: normalizeStatusSnapshot(raw['status'], stringValue(raw['id'])),
    tags: stringArray(raw['tags']).length ? stringArray(raw['tags']) : stringArray(raw['categoryIds']),
    isFRoad: Boolean(raw['isFRoad']),
    media: array(raw['media']).map((media) => normalizeMedia(media)),
  };
}

export function normalizeHub(rawHub: unknown, dateRange = '', nights = 0): Hub {
  const raw = record(rawHub);
  return {
    id: stringValue(raw['id']),
    name: stringValue(raw['name'], 'Current hub'),
    location: normalizeLocation(raw['location']),
    dateRange: stringValue(raw['dateRange'], dateRange),
    nights: numberValue(raw['nights'], nights),
  };
}

function normalizeStopState(value: unknown): RouteStop['state'] {
  const state = stringValue(value);
  if (state === 'pending') return 'open';
  if (state === 'start' || state === 'done' || state === 'active' || state === 'open' || state === 'return') {
    return state;
  }
  return 'open';
}

export function normalizeRouteStop(rawStop: unknown): RouteStop {
  const raw = record(rawStop);
  const driveMinutes = numberValue(raw['driveFromPreviousMinutes'], raw['driveMinutesFromPrevious'], 0);
  const stayMinutes = numberValue(raw['stayMinutes'], raw['visitMinutes'], 0);
  const status = normalizeStatusSnapshot(raw['status'], stringValue(raw['spotId'], raw['id']));

  return {
    id: stringValue(raw['id'], raw['spotId']),
    spotId: stringValue(raw['spotId']) || undefined,
    title: stringValue(raw['title'], raw['spotId'], 'Stop'),
    meta: stringValue(raw['meta'], driveMinutes > 0 ? `${driveMinutes} min drive` : ''),
    driveFromPreviousMinutes: driveMinutes,
    stayMinutes,
    status: status.status,
    state: normalizeStopState(raw['state']),
    note: status.reasons[0],
  };
}

function tripDayStatus(value: unknown): SafetyStatus {
  const status = stringValue(value);
  if (status === 'done') return 'green';
  if (status === 'active') return 'yellow';
  if (status === 'cancelled') return 'red';
  return 'unknown';
}

export function normalizeTripDay(rawDay: unknown, index: number): TripDay {
  const raw = record(rawDay);
  const date = stringValue(raw['date']);
  const dayNumber = date ? date.slice(-2) : String(index + 1).padStart(2, '0');

  return {
    date: date || undefined,
    weekday: date ? weekday(date) : '',
    day: dayNumber,
    title: stringValue(raw['title'], 'No plan'),
    summary: stringValue(
      raw['summary'],
      stringArray(raw['routeIds']).length
        ? `${stringArray(raw['routeIds']).length} route`
        : '',
    ),
    status: tripDayStatus(raw['status']),
    today: stringValue(raw['status']) === 'active',
    dayLabel: `DAY ${index + 1}`,
  };
}

// ── response normalizers ────────────────────────────────────

export function normalizeExplore(response: unknown): ExploreResponse {
  const raw = record(response);
  const spots = array(raw['spots']).map((spot) => normalizeSpot(spot));

  return {
    hub: normalizeHub(raw['hub']),
    dateLabel: stringValue(raw['dateLabel'], 'Today'),
    vehicle: stringValue(raw['vehicle'], 'unknown') as VehicleProfile,
    dataAgeMinutes: numberValue(raw['dataAgeMinutes'], 0),
    spots,
    smartRoutes: array(raw['smartRoutes']) as ExploreResponse['smartRoutes'],
  };
}

export function normalizeToday(response: unknown): TodayResponse {
  const raw = record(response);
  const stops = array(raw['stops']).map((stop) => normalizeRouteStop(stop));

  return {
    title: stringValue(raw['title'], 'Today'),
    dateLabel: stringValue(raw['dateLabel'], raw['date'], 'Today'),
    recheckedMinutesAgo: numberValue(raw['recheckedMinutesAgo'], 0),
    stopProgress: stringValue(raw['stopProgress'], `0/${stops.length}`),
    driveMinutes: numberValue(raw['driveMinutes'], raw['totalDriveMinutes'], 0),
    daylightLeft: stringValue(raw['daylightLeft'], raw['daylightLeftLabel'], ''),
    update: stringValue(raw['update'], ''),
    stops,
  };
}

export function normalizeTripResponse(response: unknown): TripResponse {
  const raw = record(response);
  const trip = record(raw['trip']);
  const startsOn = stringValue(trip['startsOn']);
  const endsOn = stringValue(trip['endsOn']);
  const days = array(trip['days']).map((day, index) => normalizeTripDay(day, index));
  const totalDays = numberValue(trip['totalDays'], days.length);
  const daysPlanned = numberValue(
    trip['daysPlanned'],
    days.filter((day) => day.title !== 'No plan').length,
  );
  const hub = normalizeHub(
    trip['hub'],
    startsOn && endsOn ? `${startsOn} - ${endsOn}` : undefined,
    Math.max(0, totalDays - 1),
  );

  return {
    trip: {
      title: stringValue(trip['title'], 'Trip'),
      dates: stringValue(trip['dates'], startsOn && endsOn ? `${startsOn} - ${endsOn}` : ''),
      vehicle: stringValue(trip['vehicle'], 'unknown') as TripResponse['trip']['vehicle'],
      pace: stringValue(trip['pace'], ''),
      hub,
      status: stringValue(trip['status'], 'planned') as TripResponse['trip']['status'],
      totalDays,
      daysPlanned,
      routesUsed: numberValue(trip['routesUsed'], 0),
      totalRoutes: numberValue(
        trip['totalRoutes'],
        numberValue(trip['routesUsed'], 0) + array(trip['unplacedRoutes']).length,
      ),
      hotelsToBook: numberValue(trip['hotelsToBook'], 0),
      unplacedRoutes: array(trip['unplacedRoutes']) as TripResponse['trip']['unplacedRoutes'],
      days,
    },
  };
}

export function normalizeSavedSpots(response: unknown): SavedSpotsResponse {
  const raw = record(response);
  return {
    savedSpotIds: stringArray(raw['savedSpotIds']),
    spots: array(raw['spots']).map((spot) => normalizeSpot(spot)),
  };
}

export function normalizeRouteSuggestions(response: unknown): RouteSuggestionsResponse {
  const raw = record(response);
  return {
    savedSpots: array(raw['savedSpots']).map((spot) => normalizeSpot(spot)),
    routes: (array(raw['routes']) as RawRouteSuggestion[]).map((entry) =>
      normalizeRouteSuggestion(entry),
    ),
    pageInfo: {
      hasMore: Boolean(record(raw['pageInfo'])['hasMore']),
      nextCursor: stringValue(record(raw['pageInfo'])['nextCursor']) || undefined,
    },
  };
}

export function normalizeSpotContext(response: unknown): SpotContextResponse {
  const raw = record(response);
  return {
    spot: normalizeSpot(raw['spot']),
    primaryAction: stringValue(raw['primaryAction'], 'Add to route'),
    secondaryAction: stringValue(raw['secondaryAction'], 'Save spot'),
    sourceSummary: stringValue(raw['sourceSummary'], 'Live API status'),
  };
}

export function normalizeInsertPreview(response: unknown): InsertPreviewResponse {
  const raw = record(response);
  return {
    spot: normalizeSpot(raw['spot']),
    recommendedAfterStopId: stringValue(raw['recommendedAfterStopId']),
    recommendedBeforeStopId: stringValue(raw['recommendedBeforeStopId']),
    addedDriveMinutes: numberValue(raw['addedDriveMinutes'], 0),
    statusImpact: stringValue(raw['statusImpact'], 'unknown'),
    daylightImpact: stringValue(raw['daylightImpact'], 'unknown') as InsertPreviewResponse['daylightImpact'],
    warnings: stringArray(raw['warnings']),
  };
}

export function normalizeRouteMutation(response: unknown): RouteMutationResponse {
  const raw = record(response);
  return { today: normalizeToday(raw['today']) };
}

export function normalizePlanSpot(response: unknown): PlanSpotResponse {
  const raw = record(response);
  return {
    trip: normalizeTripResponse({ trip: raw['trip'] }).trip,
    message: stringValue(raw['message'], 'Spot planned.'),
  };
}

export function normalizeSaveSpot(response: unknown): SaveSpotResponse {
  const raw = record(response);
  return {
    spot: normalizeSpot(raw['spot']),
    savedSpotIds: stringArray(raw['savedSpotIds']),
    message: stringValue(raw['message'], 'Spot saved.'),
  };
}

export function normalizeMe(response: unknown): MeResponse {
  const raw = record(response);
  const user = record(raw['user']);
  const subscription = record(raw['subscription']);
  const preferences = record(raw['preferences']);
  const safety = record(raw['safety']);
  const offline = record(raw['offline']);

  return {
    user: {
      id: stringValue(user['id']),
      displayName: stringValue(user['displayName'], 'Account'),
      initials: stringValue(user['initials'], 'IH'),
      email: stringValue(user['email']),
      joinedAt: stringValue(user['joinedAt']),
    },
    subscription: {
      plan: stringValue(subscription['plan'], 'free') as MeResponse['subscription']['plan'],
      trialAvailable: Boolean(subscription['trialAvailable']),
      headline: stringValue(subscription['headline']),
      subcopy: stringValue(subscription['subcopy']),
    },
    preferences: {
      locale: stringValue(preferences['locale'], 'en'),
      units: stringValue(preferences['units'], 'metric'),
      temperatureUnit: stringValue(preferences['temperatureUnit'], 'C'),
      currency: stringValue(preferences['currency'], 'EUR'),
    },
    safety: {
      pushAlertsTomorrowRoute: Boolean(safety['pushAlertsTomorrowRoute']),
      notifyStatusWorsensEnRoute: Boolean(safety['notifyStatusWorsensEnRoute']),
      emergencyContactsCount: numberValue(safety['emergencyContactsCount'], 0),
    },
    offline: {
      cachedMapAreaLabel: stringValue(offline['cachedMapAreaLabel']) || undefined,
      cachedTodayRouteStops:
        offline['cachedTodayRouteStops'] === undefined
          ? undefined
          : numberValue(offline['cachedTodayRouteStops']),
      lastSyncedAt: stringValue(offline['lastSyncedAt']) || undefined,
    },
  };
}

export function normalizePlace(rawPlace: unknown): PlaceSuggestion {
  const raw = record(rawPlace);
  return {
    id: stringValue(raw['id']),
    name: stringValue(raw['name'], 'Place'),
    region: stringValue(raw['region']),
    type: stringValue(raw['type'], 'custom') as PlaceSuggestion['type'],
    location: normalizeLocation(raw['location']),
    distanceKm: raw['distanceKm'] === undefined ? undefined : numberValue(raw['distanceKm']),
    source: stringValue(raw['source']) || undefined,
  };
}

export function normalizeHotel(rawHotel: unknown): HotelSuggestion {
  const raw = record(rawHotel);
  const media = array(raw['media']).map((entry) => normalizeMedia(entry));
  const heroImage = stringValue(raw['heroImage']);
  return {
    ...normalizePlace({ ...raw, type: 'hotel' }),
    type: 'hotel',
    stars:
      raw['stars'] === null || raw['stars'] === undefined ? undefined : numberValue(raw['stars']),
    media: heroImage
      ? [
          { id: heroImage, type: 'image', url: heroImage, alt: stringValue(raw['name'], 'Hotel') },
          ...media,
        ]
      : media,
    bookingState: stringValue(raw['bookingState'], 'unknown') as HotelSuggestion['bookingState'],
    bookingUrl: stringValue(raw['bookingUrl']) || undefined,
  };
}

export function normalizePlacesSearch(response: unknown): PlacesSearchResponse {
  const raw = record(response);
  return {
    places: array(raw['places'] ?? raw['suggestions']).map((place) => normalizePlace(place)),
    pageInfo: {
      hasMore: Boolean(record(raw['pageInfo'])['hasMore']),
      nextCursor: stringValue(record(raw['pageInfo'])['nextCursor']) || undefined,
    },
  };
}

export function normalizeHotelsSearch(response: unknown): HotelsSearchResponse {
  const raw = record(response);
  return {
    hotels: array(raw['hotels'] ?? raw['suggestions']).map((hotel) => normalizeHotel(hotel)),
    pageInfo: {
      hasMore: Boolean(record(raw['pageInfo'])['hasMore']),
      nextCursor: stringValue(record(raw['pageInfo'])['nextCursor']) || undefined,
    },
  };
}

export function normalizeOfflineCacheRegion(response: unknown): OfflineCacheRegionResponse {
  const raw = record(response);
  return {
    cacheJobId: stringValue(raw['cacheJobId']),
    state: stringValue(raw['state'], 'queued') as OfflineCacheRegionResponse['state'],
    label: stringValue(raw['label']),
    message: stringValue(raw['message'], 'Cache job queued.'),
  };
}

export function normalizePreferenceUpdate(
  response: unknown,
): Pick<MeResponse, 'preferences' | 'safety'> {
  const raw = record(response);
  const preferences = record(raw['preferences']);
  const safety = record(raw['safety']);

  return {
    preferences: {
      locale: stringValue(preferences['locale'], 'en'),
      units: stringValue(preferences['units'], 'metric'),
      temperatureUnit: stringValue(preferences['temperatureUnit'], 'C'),
      currency: stringValue(preferences['currency'], 'EUR'),
    },
    safety: {
      pushAlertsTomorrowRoute: Boolean(safety['pushAlertsTomorrowRoute']),
      notifyStatusWorsensEnRoute: Boolean(safety['notifyStatusWorsensEnRoute']),
      emergencyContactsCount: numberValue(safety['emergencyContactsCount'], 0),
    },
  };
}

export function normalizeAuthResponse(response: unknown): AuthResponse {
  const raw = record(response);
  const user = record(raw['user']);

  return {
    accessToken: stringValue(raw['accessToken']),
    user: {
      id: stringValue(user['id']),
      displayName: stringValue(user['displayName'], 'IslandHub User'),
      initials: stringValue(user['initials'], 'IH'),
      email: stringValue(user['email']),
    },
  };
}

export function normalizeAttractionRoute(rawRoute: unknown): AttractionRouteSummary {
  const raw = record(rawRoute);
  const routeStops = array(raw['stops']);
  const spotIds = stringArray(raw['spotIds']).length
    ? stringArray(raw['spotIds'])
    : routeStops
        .map((stop) => stringValue(record(stop)['spotId']))
        .filter(Boolean);
  const highestStatus = record(raw['highestStatus']);

  return {
    id: stringValue(raw['id']),
    title: stringValue(raw['title'], 'Route'),
    summary: spotIds.length
      ? `${spotIds.length} stops`
      : stringValue(raw['summary']),
    driveMinutes: numberValue(raw['driveMinutes'], raw['totalDriveMinutes'], 0),
    stops: numberValue(raw['stopCount'], raw['stopsCount'], spotIds.length),
    distanceKm: numberValue(raw['distanceKm'], 0),
    highestStatus: safetyStatus(
      stringValue(raw['highestStatus'], highestStatus['level'], 'unknown'),
    ),
    spotIds,
    daylight: stringValue(raw['daylight'], 'API route'),
    reason: stringValue(raw['reason'], 'Created by API route planner.'),
  };
}

export function normalizePlannedRouteMutation(
  response: unknown,
): { route: AttractionRouteSummary; today?: TodayResponse; message: string } {
  const raw = record(response);
  const today = raw['today'] ? normalizeToday(raw['today']) : undefined;
  return {
    route: normalizeAttractionRoute(raw['route']),
    today,
    message: stringValue(raw['message'], 'Route updated.'),
  };
}
