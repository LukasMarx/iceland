export type LocaleCode = 'en' | 'de' | 'is';

export type VehicleProfile = 'car_2wd' | 'car_4wd' | 'unknown';

export type TripMode = 'ideas' | 'hub' | 'roadtrip';

export type SafetyStatus = 'green' | 'yellow' | 'red' | 'unknown';

export interface SourceTimestamp {
  source: 'Vedur.is' | 'Vegagerdin' | 'Community' | 'Seed';
  fetchedAt: string;
  ageMinutes: number;
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

export interface GeoPoint {
  lat: number;
  lon: number;
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

export const statusRank: Record<SafetyStatus, number> = {
  green: 0,
  yellow: 1,
  unknown: 2,
  red: 3,
};

export const statusCopy: Record<SafetyStatus, { label: string; icon: string }> = {
  green: { label: 'Open', icon: 'check' },
  yellow: { label: 'Caution', icon: 'alert' },
  red: { label: 'Closed', icon: 'block' },
  unknown: { label: 'No data', icon: 'help' },
};

export function sortBySafetyThenDrive(spots: Spot[]): Spot[] {
  return [...spots].sort((left, right) => {
    const statusDelta = statusRank[left.status.status] - statusRank[right.status.status];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.driveMinutes - right.driveMinutes;
  });
}
