# IslandHub Shared Types

Stand: 2026-05-29

Diese Typen sind der gemeinsame Startpunkt fuer die Endpoint-Specs. Felder duerfen endpoint-spezifisch optional werden, muessen dann aber dort dokumentiert sein.

```ts
type ISODate = string; // YYYY-MM-DD im Trip-Kalendertag
type ISODateTime = string; // UTC, z. B. 2026-05-29T07:42:00Z
type VehicleProfile = 'car_2wd' | 'car_4wd' | 'unknown';
type SafetyLevel = 'green' | 'yellow' | 'red' | 'unknown';
type RouteDirection = 'ONE-WAY' | 'LOOP';

interface GeoPoint {
  lat: number;
  lon: number;
}

interface PlaceRef {
  id?: string;
  name?: string;
  type: 'city' | 'hotel' | 'home' | 'airport' | 'hub' | 'custom';
  location?: GeoPoint;
}

interface Hub {
  id: string;
  placeId?: string;
  name: string;
  type: 'hotel' | 'home' | 'airport' | 'custom';
  location: GeoPoint;
}

interface SourceTimestamp {
  source: 'road' | 'weather' | 'safetravel' | 'operator' | 'manual' | 'unknown';
  label: string;
  checkedAt: ISODateTime;
  validUntil?: ISODateTime;
  url?: string;
}

interface SafetyStatus {
  level: SafetyLevel;
  label: string;
  reason: string;
  updatedAt: ISODateTime;
  sourceTimestamps: SourceTimestamp[];
}

interface MediaAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  alt: string;
  credit?: string;
}

interface CategoryOption {
  id: string;
  label: string;
  count: number;
}

interface UserPreferences {
  locale: 'en' | 'de' | 'is';
  units: 'metric' | 'imperial';
  temperatureUnit: 'C' | 'F';
  currency: 'EUR' | 'ISK' | 'USD' | 'GBP';
}

interface Spot {
  id: string;
  name: string;
  categoryIds: string[];
  location: GeoPoint;
  region?: string;
  driveMinutesFromHub?: number;
  visitMinutes?: number;
  status: SafetyStatus;
  isSaved?: boolean;
  media?: MediaAsset[];
}

interface RouteStop {
  id: string; // stopId
  spotId?: string;
  placeId?: string;
  title: string;
  location: GeoPoint;
  state: 'pending' | 'active' | 'done' | 'skipped';
  arriveAt?: ISODateTime;
  departAt?: ISODateTime;
  completedAt?: ISODateTime;
  driveMinutesFromPrevious?: number;
  distanceKmFromPrevious?: number;
  status?: SafetyStatus;
}

interface AttractionRouteSummary {
  id: string;
  title: string;
  date?: ISODate;
  start: PlaceRef;
  destination?: PlaceRef;
  direction: RouteDirection;
  stops: RouteStop[];
  stopIds: string[];
  totalDriveMinutes: number;
  totalTripMinutes: number;
  distanceKm: number;
  highestStatus: SafetyStatus;
  reason?: string;
  version: number;
}

interface SmartRoute {
  id: string;
  title: string;
  reason: string;
  spotIds: string[];
  driveMinutes: number;
  distanceKm: number;
  highestStatus: SafetyStatus;
}

interface TripDaySummary {
  date: ISODate;
  title?: string;
  routeIds: string[];
  status: 'empty' | 'draft' | 'planned' | 'active' | 'done';
}

interface TripSummary {
  id: string;
  title: string;
  startsOn: ISODate;
  endsOn: ISODate;
  timezone: 'Atlantic/Reykjavik';
  vehicle: VehicleProfile;
  hub: Hub;
  days: TripDaySummary[];
  unplacedRoutes: AttractionRouteSummary[];
  savedSpotIds: string[];
  hotelsToBook?: number;
  routesUsed?: number;
  version: number;
}

interface TodayResponse {
  tripId: string;
  date: ISODate;
  title: string;
  dateLabel: string;
  checkedAt: ISODateTime;
  recheckedMinutesAgo?: number;
  stopProgress: string;
  driveMinutes: number;
  daylightLeftMinutes: number;
  daylightLeftLabel: string;
  update: string;
  stops: RouteStop[];
  version: number;
}

interface PageInfo {
  nextCursor?: string;
  hasMore: boolean;
}
```