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
}

export interface CreateTodayRouteRequest {
  spotId: string;
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
  routes: AttractionRouteSummary[];
}

export interface StartSuggestedRouteRequest {
  routeId: string;
}

export interface TripResponse {
  trip: TripSummary;
}
