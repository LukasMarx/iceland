export type SafetyStatus = 'green' | 'yellow' | 'red' | 'unknown';

export type VehicleProfile = 'car_2wd' | 'car_4wd' | 'unknown';

export interface SourceTimestamp {
  source: 'Vedur.is' | 'Vegagerdin' | 'Community' | 'Seed';
  fetchedAt: string;
  ageMinutes: number;
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface SpotStatusSnapshot {
  spotId: string;
  status: SafetyStatus;
  label: string;
  reasons: string[];
  roadStatus: string;
  weatherStatus: string;
  vehicleCompatibility: string;
  sourceTimestamps: SourceTimestamp[];
  calculatedAt: string;
  validUntil: string;
  version: number;
}

export interface Spot {
  id: string;
  name: string;
  region: string;
  category: string;
  location: GeoPoint;
  driveMinutes: number;
  distanceKm: number;
  stayMinutes: number;
  status: SpotStatusSnapshot;
  tags: string[];
  isFRoad: boolean;
  media?: MediaAsset[];
}

export interface MediaAsset {
  id: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  alt: string;
  credit?: string;
}

export type PlaceType = 'city' | 'hotel' | 'home' | 'airport' | 'custom' | 'hub';

export interface PlaceSuggestion {
  id: string;
  name: string;
  region: string;
  type: PlaceType;
  location: GeoPoint;
  distanceKm?: number;
  source?: string;
}

export interface PlacesSearchResponse {
  places: PlaceSuggestion[];
  pageInfo?: PageInfo;
}

export interface HotelSuggestion extends PlaceSuggestion {
  type: 'hotel';
  stars?: number;
  media?: MediaAsset[];
  bookingState?: 'not_booked' | 'booked' | 'unknown';
  bookingUrl?: string;
}

export interface HotelsSearchResponse {
  hotels: HotelSuggestion[];
  pageInfo?: PageInfo;
}

export interface UserPreferences {
  locale: string;
  units: string;
  temperatureUnit: string;
  currency: string;
}

export type AuthProvider = 'password' | 'google' | 'apple';

export interface AuthUser {
  id: string;
  displayName: string;
  initials: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthRegisterRequest extends AuthLoginRequest {
  displayName?: string;
}

export interface SocialAuthRequest {
  provider: Exclude<AuthProvider, 'password'>;
  idToken: string;
  displayName?: string;
}

export interface MeResponse {
  user: {
    id: string;
    displayName: string;
    initials: string;
    email: string;
    joinedAt: string;
  };
  subscription: {
    plan: 'free' | 'premium' | 'trial';
    trialAvailable: boolean;
    headline: string;
    subcopy: string;
  };
  preferences: UserPreferences;
  safety: {
    pushAlertsTomorrowRoute: boolean;
    notifyStatusWorsensEnRoute: boolean;
    emergencyContactsCount: number;
  };
  offline: {
    cachedMapAreaLabel?: string;
    cachedTodayRouteStops?: number;
    lastSyncedAt?: string;
  };
}

export interface OfflineCacheRegionRequest {
  tripId?: string;
  mode: 'map-area' | 'today-route' | 'trip-core';
  label?: string;
  regions?: { lat: number; lon: number; radiusKm: number }[];
  includeRouteIds?: string[];
  includeSpotIds?: string[];
}

export interface OfflineCacheRegionResponse {
  cacheJobId: string;
  state: 'queued' | 'running' | 'completed' | 'failed';
  label: string;
  message: string;
}

export interface Hub {
  id: string;
  name: string;
  location: GeoPoint;
  dateRange: string;
  nights: number;
}

export interface RouteStop {
  id: string;
  spotId?: string;
  title: string;
  meta: string;
  driveFromPreviousMinutes: number;
  stayMinutes: number;
  status: SafetyStatus;
  state: 'start' | 'done' | 'active' | 'open' | 'return';
  note?: string;
}

export interface SmartRoute {
  id: string;
  title: string;
  summary: string;
  driveMinutes: number;
  stops: number;
  distanceKm: number;
  highestStatus: SafetyStatus;
}

export interface AttractionRouteSummary extends SmartRoute {
  spotIds: string[];
  daylight: string;
  reason: string;
}

export type TripStatus = 'draft' | 'planned' | 'active' | 'completed';

export type RouteDirection = 'ONE-WAY' | 'LOOP';

export interface TripDayRoute {
  direction: RouteDirection;
  title: string;
  stops?: number;
  durationMinutes: number;
  status: SafetyStatus;
}

export interface TripDaySleep {
  initial: string;
  hotel: string;
  action: 'check-in' | 'check-out' | 'stay';
}

export interface TripDay {
  date?: string;
  weekday: string;
  day: string;
  title: string;
  summary: string;
  status: SafetyStatus;
  today?: boolean;
  dayLabel?: string;
  route?: TripDayRoute;
  sleep?: TripDaySleep;
}

export interface UnplacedRoute {
  id: string;
  title: string;
  direction: RouteDirection;
  stops: number;
  durationMinutes: number;
}

export interface TripSummary {
  title: string;
  dates: string;
  vehicle: VehicleProfile;
  pace: string;
  hub: Hub;
  status?: TripStatus;
  totalDays?: number;
  daysPlanned?: number;
  routesUsed?: number;
  totalRoutes?: number;
  hotelsToBook?: number;
  unplacedRoutes?: UnplacedRoute[];
  days: TripDay[];
}

export interface HealthResponse {
  status: 'ok';
  service: 'islandhub-api';
  mode: 'seed';
  version: string;
  checkedAt: string;
}

export interface ExploreResponse {
  hub: Hub;
  dateLabel: string;
  vehicle: VehicleProfile;
  dataAgeMinutes: number;
  spots: Spot[];
  smartRoutes: SmartRoute[];
}

export interface ExploreQuery {
  statuses?: SafetyStatus[];
  categories?: string[];
  vehicle?: VehicleProfile | 'any';
  showFRoads?: boolean;
  maxDriveMinutes?: number;
  date?: string;
}

export interface SpotContextResponse {
  spot: Spot;
  primaryAction: string;
  secondaryAction: string;
  sourceSummary: string;
}

export interface TodayResponse {
  title: string;
  dateLabel: string;
  recheckedMinutesAgo: number;
  stopProgress: string;
  driveMinutes: number;
  daylightLeft: string;
  update: string;
  stops: RouteStop[];
}

export interface InsertPreviewRequest {
  spotId: string;
}

export interface InsertPreviewResponse {
  spot: Spot;
  recommendedAfterStopId: string;
  recommendedBeforeStopId: string;
  addedDriveMinutes: number;
  statusImpact: string;
  daylightImpact: 'ample' | 'tight' | 'unknown';
  warnings: string[];
}

export interface AddRouteStopRequest {
  spotId: string;
  position: 'recommended' | 'end';
  date?: string;
}

export interface CreateTodayRouteRequest {
  spotId: string;
  date?: string;
  replaceExisting?: boolean;
}

export interface RouteMutationResponse {
  today: TodayResponse;
}

export interface SaveSpotRequest {
  spotId: string;
}

export interface SaveSpotResponse {
  spot: Spot;
  savedSpotIds: string[];
  message: string;
}

export interface SavedSpotsResponse {
  savedSpotIds: string[];
  spots: Spot[];
}

export interface PlanSpotRequest {
  spotId: string;
}

export interface PlanSpotResponse {
  trip: TripSummary;
  message: string;
}

export interface RouteSuggestionsResponse {
  savedSpots: Spot[];
  routes: RouteSuggestion[];
  pageInfo?: PageInfo;
}

export interface StartSuggestedRouteRequest {
  suggestionId: string;
  date?: string;
  replaceExisting?: boolean;
  expectedVersion?: number;
}

export interface RouteSuggestion {
  suggestionId: string;
  route: Partial<AttractionRouteSummary> & {
    id?: string;
    title: string;
    summary?: string;
    reason?: string;
    spotIds?: string[];
    stopIds?: string[];
    stops?: number | { spotId?: string; status?: { level: SafetyStatus } | SafetyStatus }[];
    totalDriveMinutes?: number;
    totalTripMinutes?: number;
    distanceKm?: number;
    highestStatus?: SafetyStatus | { level: SafetyStatus };
  };
  reason: string;
  expiresAt: string;
}

export interface PageInfo {
  hasMore: boolean;
  nextCursor?: string;
}

export interface TripResponse {
  trip: TripSummary;
}

export interface AdminSpotListItem {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  isPublished: boolean;
  createdAt: string;
}

export interface AdminSpotListResponse {
  spots: AdminSpotListItem[];
  total: number;
  page: number;
}

export interface AdminSpotCreateRequest {
  slug: string;
  region?: string;
  lat: number;
  lon: number;
  defaultLocale?: 'en' | 'de' | 'is';
  visitMinutes?: number;
  minVehicle?: 'car_2wd' | 'car_4wd' | 'unknown';
  isFRoad?: boolean;
  isPublished?: boolean;
  translations: Array<{
    locale: 'en' | 'de' | 'is';
    name: string;
    shortDescription?: string;
    longDescription?: string;
    safetyNotes?: string;
  }>;
}

export interface AdminSpotUpdateRequest {
  slug?: string;
  region?: string;
  lat?: number;
  lon?: number;
  defaultLocale?: 'en' | 'de' | 'is';
  visitMinutes?: number;
  minVehicle?: 'car_2wd' | 'car_4wd' | 'unknown';
  isFRoad?: boolean;
  isPublished?: boolean;
  translations?: Array<{
    locale: 'en' | 'de' | 'is';
    name: string;
    shortDescription?: string;
    longDescription?: string;
    safetyNotes?: string;
  }>;
}
