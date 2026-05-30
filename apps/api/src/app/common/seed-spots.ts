export interface SeedSpot {
  id: string;
  name: string;
  region: string;
  category: string;
  lat: number;
  lon: number;
  visitMinutes: number;
  driveMinutesFromHub: number;
  distanceKmFromHub: number;
  isFRoad: boolean;
  shortDescription?: string;
  status: 'green' | 'yellow' | 'red' | 'unknown';
  statusLabel: string;
  statusReason: string;
  statusReasons: string[];
  roadStatus: string;
  vehicleCompatibility: string;
}

export const SEED_SPOTS: SeedSpot[] = [
  {
    id: 'geysir',
    name: 'Geysir',
    region: 'South Iceland',
    category: 'Geothermal',
    lat: 64.313,
    lon: -20.300,
    visitMinutes: 35,
    driveMinutesFromHub: 37,
    distanceKmFromHub: 52,
    isFRoad: false,
    status: 'green',
    statusLabel: 'Open',
    statusReason: 'Roads open and wind below caution threshold.',
    statusReasons: ['Roads open and wind below caution threshold.'],
    roadStatus: 'Route 1 · open',
    vehicleCompatibility: '2WD ok',
  },
  {
    id: 'gullfoss',
    name: 'Gullfoss',
    region: 'South Iceland',
    category: 'Waterfall',
    lat: 64.327,
    lon: -20.119,
    visitMinutes: 40,
    driveMinutesFromHub: 51,
    distanceKmFromHub: 73,
    isFRoad: false,
    status: 'green',
    statusLabel: 'Open',
    statusReason: 'Roads open. Spray risk normal for May.',
    statusReasons: ['Roads open. Spray risk normal for May.'],
    roadStatus: 'Route 1 · open',
    vehicleCompatibility: '2WD ok',
  },
  {
    id: 'seljalandsfoss',
    name: 'Seljalandsfoss',
    region: 'South Iceland',
    category: 'Waterfall',
    lat: 63.616,
    lon: -19.989,
    visitMinutes: 25,
    driveMinutesFromHub: 78,
    distanceKmFromHub: 88,
    isFRoad: false,
    status: 'yellow',
    statusLabel: 'Caution',
    statusReason: 'Gusts to 24 m/s through midday.',
    statusReasons: [
      'Gusts to 24 m/s through midday.',
      'Open car doors carefully. Spray will soak the path behind the waterfall.',
    ],
    roadStatus: 'Route 1 · open',
    vehicleCompatibility: '2WD ok',
  },
  {
    id: 'bruarfoss',
    name: 'Brúarfoss',
    region: 'Golden Circle',
    category: 'Waterfall',
    lat: 64.265,
    lon: -20.515,
    visitMinutes: 30,
    driveMinutesFromHub: 52,
    distanceKmFromHub: 72,
    isFRoad: false,
    status: 'green',
    statusLabel: 'Open',
    statusReason: 'Paved access and current road data.',
    statusReasons: ['Paved access and current road data.'],
    roadStatus: 'Route 1 · open',
    vehicleCompatibility: '2WD ok',
  },
  {
    id: 'thingvellir',
    name: 'Þingvellir',
    region: 'Golden Circle',
    category: 'Rift valley',
    lat: 64.255,
    lon: -21.129,
    visitMinutes: 45,
    driveMinutesFromHub: 38,
    distanceKmFromHub: 45,
    isFRoad: false,
    status: 'green',
    statusLabel: 'Open',
    statusReason: 'Main paths open. Light wind and clear visibility.',
    statusReasons: ['Main paths open. Light wind and clear visibility across the rift valley.'],
    roadStatus: 'Route 36 · open',
    vehicleCompatibility: '2WD ok',
  },
  {
    id: 'kerid',
    name: 'Kerið',
    region: 'South Iceland',
    category: 'Crater lake',
    lat: 64.041,
    lon: -20.885,
    visitMinutes: 35,
    driveMinutesFromHub: 31,
    distanceKmFromHub: 37,
    isFRoad: false,
    status: 'green',
    statusLabel: 'Open',
    statusReason: 'Crater rim path open. Parking area dry and accessible.',
    statusReasons: ['Crater rim path open. Parking area dry and accessible.'],
    roadStatus: 'Route 35 · open',
    vehicleCompatibility: '2WD ok',
  },
  {
    id: 'kerlingarfjoll',
    name: 'Kerlingarfjöll',
    region: 'Highlands',
    category: 'Geothermal',
    lat: 64.642,
    lon: -19.287,
    visitMinutes: 120,
    driveMinutesFromHub: 165,
    distanceKmFromHub: 182,
    isFRoad: true,
    status: 'red',
    statusLabel: 'Closed',
    statusReason: 'F35 (Kjölur) is closed by Vegagerðin due to snowmelt damage.',
    statusReasons: [
      'F35 (Kjölur) is closed by Vegagerðin due to snowmelt damage on the southern approach.',
      'Expected reopening late June. No detour available.',
    ],
    roadStatus: 'F35 · closed',
    vehicleCompatibility: '4WD required',
  },
  {
    id: 'thorsmork',
    name: 'Þórsmörk',
    region: 'South Iceland',
    category: 'Nature reserve',
    lat: 63.680,
    lon: -19.482,
    visitMinutes: 120,
    driveMinutesFromHub: 142,
    distanceKmFromHub: 151,
    isFRoad: true,
    status: 'unknown',
    statusLabel: 'No data',
    statusReason: "River-crossing depth at Krossá hasn't refreshed in 6h 14m.",
    statusReasons: [
      "River-crossing depth at Krossá hasn't refreshed in 6h 14m.",
      'Wind data is current; road data is current; only the ford reading is stale.',
    ],
    roadStatus: 'F249 · check conditions',
    vehicleCompatibility: '4WD required',
  },
];

export const SEED_SPOT_MAP = new Map(SEED_SPOTS.map((s) => [s.id, s]));

export const SEED_CHECKED_AT = '2026-05-14T07:42:00.000Z';
export const SEED_VALID_UNTIL = '2026-05-14T08:42:00.000Z';
