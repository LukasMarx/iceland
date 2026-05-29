import type {
  AttractionRouteSummary,
  ExploreResponse,
  SpotContextResponse,
  TodayResponse,
  TripResponse,
} from '@islandhub/api-contracts';
import type { SafetyStatus, Spot } from '@islandhub/domain';

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

export const seedSpots: Spot[] = [
  { id: 'geysir', name: 'Geysir', region: 'South Iceland', category: 'Geothermal', location: { lat: 64.313, lon: -20.300 }, driveMinutes: 37, distanceKm: 52, stayMinutes: 35, tags: ['geothermal'], isFRoad: false, status: status('geysir', 'green', ['Roads open and wind below caution threshold.']) },
  { id: 'gullfoss', name: 'Gullfoss', region: 'South Iceland', category: 'Waterfall', location: { lat: 64.327, lon: -20.119 }, driveMinutes: 51, distanceKm: 73, stayMinutes: 40, tags: ['waterfall'], isFRoad: false, status: status('gullfoss', 'green', ['Roads open. Spray risk normal for May.']) },
  { id: 'seljalandsfoss', name: 'Seljalandsfoss', region: 'South Iceland', category: 'Waterfall', location: { lat: 63.616, lon: -19.989 }, driveMinutes: 78, distanceKm: 88, stayMinutes: 25, tags: ['waterfall'], isFRoad: false, status: status('seljalandsfoss', 'yellow', ['Gusts to 24 m/s through midday.', 'Open car doors carefully. Keep the visit short.']) },
  { id: 'bruarfoss', name: 'Bruarfoss', region: 'Golden Circle', category: 'Waterfall', location: { lat: 64.265, lon: -20.515 }, driveMinutes: 52, distanceKm: 72, stayMinutes: 30, tags: ['waterfall'], isFRoad: false, status: status('bruarfoss', 'green', ['Paved access and current road data.']) },
  { id: 'thingvellir', name: 'Thingvellir', region: 'Golden Circle', category: 'Rift valley', location: { lat: 64.255, lon: -21.129 }, driveMinutes: 38, distanceKm: 45, stayMinutes: 45, tags: ['rift valley'], isFRoad: false, status: status('thingvellir', 'green', ['Main paths open. Light wind and clear visibility across the rift valley.']) },
  { id: 'kerid', name: 'Kerid Crater', region: 'South Iceland', category: 'Crater lake', location: { lat: 64.041, lon: -20.885 }, driveMinutes: 31, distanceKm: 37, stayMinutes: 30, tags: ['crater lake'], isFRoad: false, status: status('kerid', 'green', ['Crater rim path open. Parking area dry and accessible.']) },
  { id: 'kerlingarfjoll', name: 'Kerlingarfjoll', region: 'Highlands', category: 'Geothermal', location: { lat: 64.642, lon: -19.287 }, driveMinutes: 165, distanceKm: 182, stayMinutes: 45, tags: ['highlands'], isFRoad: true, status: status('kerlingarfjoll', 'red', ['F35 is closed by Vegagerdin due to snowmelt damage.']) },
  { id: 'thorsmork', name: 'Thorsmork', region: 'Highlands', category: 'Nature reserve', location: { lat: 63.680, lon: -19.482 }, driveMinutes: 142, distanceKm: 151, stayMinutes: 45, tags: ['highlands'], isFRoad: true, status: status('thorsmork', 'unknown', ["River-crossing depth at Krossa hasn't refreshed in 6h 14m."]) },
];

export const seedExplore: ExploreResponse = {
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

export const seedRouteSuggestions: AttractionRouteSummary[] = [
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

export const seedToday: TodayResponse = {
  title: 'Wind-light loop',
  dateLabel: 'Today - Thu 14 May',
  recheckedMinutesAgo: 8,
  stopProgress: '2/4',
  driveMinutes: 200,
  daylightLeft: '14h 32',
  update: 'Seljalandsfoss wind gusts rising to 24 m/s. Still passable.',
  stops: [
    { id: 'start', title: 'Reykholt Cabin', meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
    { id: 'geysir', title: 'Geysir', meta: "12' drive - 35' stay", driveFromPreviousMinutes: 12, stayMinutes: 35, status: 'green', state: 'done' },
    { id: 'gullfoss', title: 'Gullfoss', meta: "14' drive - 40' stay", driveFromPreviousMinutes: 14, stayMinutes: 40, status: 'green', state: 'done' },
    { id: 'seljalandsfoss', title: 'Seljalandsfoss', meta: "64' drive - 25' stay", driveFromPreviousMinutes: 64, stayMinutes: 25, status: 'yellow', state: 'active', note: 'Gusts to 24 m/s. Keep visit short.' },
    { id: 'bruarfoss', title: 'Bruarfoss', meta: "52' drive - 30' stay", driveFromPreviousMinutes: 52, stayMinutes: 30, status: 'green', state: 'open' },
    { id: 'return', title: 'Reykholt Cabin', meta: "18' drive", driveFromPreviousMinutes: 18, stayMinutes: 0, status: 'green', state: 'return' },
  ],
};

export const seedTrip: TripResponse = {
  trip: {
    title: 'Iceland spring run',
    dates: '13-19 MAY',
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
      { id: 'snae', title: 'Snaefellsnes peninsula', direction: 'LOOP', stops: 5, durationMinutes: 480 },
      { id: 'lava', title: 'Lava-field short', direction: 'LOOP', stops: 2, durationMinutes: 130 },
    ],
    days: [
      {
        weekday: 'WED', day: '13', title: 'Arrival', summary: 'KEF -> Reykholt', status: 'green',
        dayLabel: 'DAY 1',
        route: { direction: 'ONE-WAY', title: 'Arrival drive', durationMinutes: 100, status: 'green' },
        sleep: { initial: 'R', hotel: 'Reykholt...', action: 'check-in' },
      },
      {
        weekday: 'THU', day: '14', title: 'Wind-light loop', summary: 'Geysir - Gullfoss - Bruarfoss', status: 'yellow', today: true,
        dayLabel: 'DAY 2',
        route: { direction: 'LOOP', title: 'Wind-light loop', stops: 4, durationMinutes: 380, status: 'yellow' },
        sleep: { initial: 'R', hotel: 'Reykho...', action: 'check-out' },
      },
      {
        weekday: 'FRI', day: '15', title: 'Golden circle short', summary: '3 stops - 2h 10', status: 'green',
        dayLabel: 'DAY 3',
        route: { direction: 'ONE-WAY', title: 'Golden circle short', stops: 3, durationMinutes: 130, status: 'green' },
      },
      {
        weekday: 'SAT', day: '16', title: 'No plan', summary: 'Rest day', status: 'unknown',
        dayLabel: 'DAY 4',
      },
      {
        weekday: 'SUN', day: '17', title: 'South coast', summary: '4 stops - 5h drive', status: 'yellow',
        dayLabel: 'DAY 5',
        route: { direction: 'ONE-WAY', title: 'South coast', stops: 4, durationMinutes: 300, status: 'yellow' },
      },
    ],
  },
};

export function buildSpotContext(spot: Spot): SpotContextResponse {
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
