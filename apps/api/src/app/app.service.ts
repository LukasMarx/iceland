import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AttractionRouteSummary,
  ExploreQuery,
  ExploreResponse,
  HealthResponse,
  InsertPreviewResponse,
  PlanSpotResponse,
  RouteSuggestionsResponse,
  RouteMutationResponse,
  SavedSpotsResponse,
  SaveSpotResponse,
  SpotContextResponse,
  TodayResponse,
  TripResponse,
} from '@islandhub/api-contracts';
import type { Hub, RouteStop, SafetyStatus, SmartRoute, Spot, TripSummary } from '@islandhub/domain';

@Injectable()
export class AppService {
  private readonly now = '2026-05-25T07:42:00.000Z';
  private readonly savedSpotIds = new Set<string>(['geysir', 'gullfoss', 'thingvellir', 'bruarfoss', 'kerid']);
  private todayTitle = 'Wind-light loop';
  private todayStopProgress = '2/4';
  private todayDriveMinutes = 200;
  private todayUpdate = 'Status updated: Seljalandsfoss wind gusts rising to 24 m/s. Still passable.';

  private readonly hub: Hub = {
    id: 'hub-reykholt',
    name: 'Reykholt Cabin',
    location: { lat: 64.663, lon: -21.292 },
    dateRange: '13-22 May',
    nights: 9,
  };

  private readonly spots: Spot[] = [
    this.spot('geysir', 'Geysir', 'South Iceland', 'Geothermal', 37, 52, 'green', [
      'Roads open and wind below caution threshold.',
    ]),
    this.spot('gullfoss', 'Gullfoss', 'South Iceland', 'Waterfall', 51, 73, 'green', [
      'Roads open. Spray risk normal for May.',
    ]),
    this.spot('seljalandsfoss', 'Seljalandsfoss', 'South Iceland', 'Waterfall', 78, 88, 'yellow', [
      'Gusts to 24 m/s through midday.',
      'Open car doors carefully. Spray will soak the path behind the waterfall.',
    ]),
    this.spot('bruarfoss', 'Bruarfoss', 'Golden Circle', 'Waterfall', 52, 72, 'green', [
      'Paved access and current road data.',
    ]),
    this.spot('thingvellir', 'Thingvellir', 'Golden Circle', 'Rift valley', 38, 45, 'green', [
      'Main paths open. Light wind and clear visibility across the rift valley.',
    ]),
    this.spot('kerid', 'Kerid Crater', 'South Iceland', 'Crater lake', 31, 37, 'green', [
      'Crater rim path open. Parking area dry and accessible.',
    ]),
    this.spot('kerlingarfjoll', 'Kerlingarfjoll', 'Highlands', 'Geothermal', 165, 182, 'red', [
      'F35 is closed by Vegagerdin due to snowmelt damage on the southern approach.',
    ], true),
    this.spot('thorsmork', 'Thorsmork', 'Highlands', 'Nature reserve', 142, 151, 'unknown', [
      "River-crossing depth at Krossa hasn't refreshed in 6h 14m.",
    ], true),
  ];

  getData(): HealthResponse {
    return this.getHealth();
  }

  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'islandhub-api',
      mode: 'seed',
      version: '0.1.0-walking-skeleton',
      checkedAt: this.now,
    };
  }

  getExplore(query: ExploreQuery = {}): ExploreResponse {
    return {
      hub: this.hub,
      dateLabel: 'Today, Thu 14 May',
      vehicle: 'car_2wd',
      dataAgeMinutes: 8,
      spots: this.filterSpots(query),
      smartRoutes: this.smartRoutes,
    };
  }

  getSpotContext(id: string): SpotContextResponse {
    const spot = this.spots.find((candidate) => candidate.id === id);

    if (!spot) {
      throw new NotFoundException(`Spot ${id} not found`);
    }

    const actionByStatus: Record<SafetyStatus, string> = {
      green: 'Add to today route',
      yellow: 'Add to route anyway',
      red: 'Show safer alternatives',
      unknown: 'Refresh data',
    };

    return {
      spot,
      primaryAction: actionByStatus[spot.status.status],
      secondaryAction: 'Save spot',
      sourceSummary: 'Seed status shaped like Vedur.is and Vegagerdin responses.',
    };
  }

  getToday(): TodayResponse {
    return {
      title: this.todayTitle,
      dateLabel: 'Today - Thu 14 May',
      recheckedMinutesAgo: 8,
      stopProgress: this.todayStopProgress,
      driveMinutes: this.todayDriveMinutes,
      daylightLeft: '14h 32',
      update: this.todayUpdate,
      stops: this.routeStops,
    };
  }

  previewInsert(spotId: string): InsertPreviewResponse {
    const spot = this.findSpot(spotId);

    return {
      spot,
      recommendedAfterStopId: 'geysir',
      recommendedBeforeStopId: 'gullfoss',
      addedDriveMinutes: spot.id === 'seljalandsfoss' ? 18 : Math.max(12, Math.round(spot.driveMinutes / 4)),
      statusImpact: spot.status.status === 'yellow' ? 'stays amber' : spot.status.label.toLowerCase(),
      daylightImpact: spot.driveMinutes > 140 ? 'tight' : 'ample',
      warnings: spot.status.status === 'green' ? [] : spot.status.reasons,
    };
  }

  addRouteStop(spotId: string, position: 'recommended' | 'end'): RouteMutationResponse {
    const spot = this.findSpot(spotId);
    const alreadyInRoute = this.routeStops.some((stop) => stop.spotId === spot.id);

    if (!alreadyInRoute) {
      const newStop: RouteStop = {
        id: spot.id,
        spotId: spot.id,
        title: spot.name,
        meta: `${this.minutesToDrive(spot.driveMinutes)} drive - ${spot.stayMinutes} min stay`,
        driveFromPreviousMinutes: spot.driveMinutes,
        stayMinutes: spot.stayMinutes,
        status: spot.status.status,
        state: 'open',
        note: spot.status.status === 'green' ? undefined : spot.status.reasons[0],
      };
      const returnIndex = this.routeStops.findIndex((stop) => stop.state === 'return');
      const recommendedIndex = Math.max(0, this.routeStops.findIndex((stop) => stop.id === 'gullfoss') + 1);
      const insertIndex = position === 'recommended' ? recommendedIndex : returnIndex;
      this.routeStops.splice(insertIndex, 0, newStop);
    }

    this.todayUpdate = `Inserted ${spot.name}. Status rechecked against snapshot version ${spot.status.version}.`;
    this.todayStopProgress = this.progressLabel();
    this.todayDriveMinutes = this.routeStops.reduce((total, stop) => total + stop.driveFromPreviousMinutes, 0);

    return {
      today: {
        ...this.getToday(),
      },
    };
  }

  createTodayRoute(spotId: string): RouteMutationResponse {
    const spot = this.findSpot(spotId);

    this.routeStops = [
      { id: 'start', title: this.hub.name, meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
      {
        id: spot.id,
        spotId: spot.id,
        title: spot.name,
        meta: `${this.minutesToDrive(spot.driveMinutes)} drive - ${spot.stayMinutes} min stay`,
        driveFromPreviousMinutes: spot.driveMinutes,
        stayMinutes: spot.stayMinutes,
        status: spot.status.status,
        state: 'active',
        note: spot.status.status === 'green' ? undefined : spot.status.reasons[0],
      },
      { id: 'return', title: this.hub.name, meta: 'return', driveFromPreviousMinutes: spot.driveMinutes, stayMinutes: 0, status: 'green', state: 'return' },
    ];
    this.todayTitle = `${spot.name} out-and-back`;
    this.todayStopProgress = '0/1';
    this.todayDriveMinutes = spot.driveMinutes * 2;
    this.todayUpdate = `Route created for today from ${this.hub.name} to ${spot.name} and back.`;

    return {
      today: this.getToday(),
    };
  }

  getRouteSuggestions(): RouteSuggestionsResponse {
    return {
      savedSpots: this.savedSpots(),
      routes: this.buildRouteSuggestions(),
    };
  }

  startSuggestedRoute(routeId: string): RouteMutationResponse {
    const route = this.buildRouteSuggestions().find((candidate) => candidate.id === routeId);

    if (!route) {
      throw new NotFoundException(`Route suggestion ${routeId} not found`);
    }

    const routeSpots = route.spotIds.map((spotId) => this.findSpot(spotId));
    const windLightMeta = ['12\' drive · 35\' stay', '14\' drive · 40\' stay', '64\' drive · 25\' stay', '52\' drive · 30\' stay'];
    this.routeStops = [
      { id: 'start', title: this.hub.name, meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
      ...routeSpots.map((spot, index) => {
        const state: RouteStop['state'] = route.id === 'wind-light-loop' ? index < 2 ? 'done' : index === 2 ? 'active' : 'open' : index === 0 ? 'active' : 'open';
        const driveFromPreviousMinutes = index === 0 ? spot.driveMinutes : Math.max(12, Math.round(spot.driveMinutes / 3));

        return {
          id: spot.id,
          spotId: spot.id,
          title: spot.name,
          meta: route.id === 'wind-light-loop' ? windLightMeta[index] : `${this.minutesToDrive(driveFromPreviousMinutes)} drive - ${spot.stayMinutes} min stay`,
          driveFromPreviousMinutes,
          stayMinutes: spot.stayMinutes,
          status: spot.status.status,
          state,
          note: spot.status.status === 'green' ? undefined : spot.status.reasons[0],
        };
      }),
      { id: 'return', title: this.hub.name, meta: route.id === 'wind-light-loop' ? `18' drive` : 'return', driveFromPreviousMinutes: Math.max(18, Math.round(route.driveMinutes / 5)), stayMinutes: 0, status: 'green', state: 'return' },
    ];
    this.todayTitle = route.title;
    this.todayStopProgress = route.id === 'wind-light-loop' ? `2/${route.spotIds.length}` : `0/${route.spotIds.length}`;
    this.todayDriveMinutes = route.driveMinutes;
    this.todayUpdate = route.id === 'wind-light-loop' ? 'Seljalandsfoss wind gusts rising to 24 m/s. Still passable.' : `${route.title} started from saved highlights. Status rechecked against current seed snapshots.`;

    return { today: this.getToday() };
  }

  markStopDone(stopId: string): RouteMutationResponse {
    const activeIndex = this.routeStops.findIndex((stop) => stop.id === stopId || (stopId === 'active' && stop.state === 'active'));

    if (activeIndex >= 0) {
      this.routeStops[activeIndex] = { ...this.routeStops[activeIndex], state: 'done' };
      const nextOpenIndex = this.routeStops.findIndex((stop, index) => index > activeIndex && stop.state === 'open');

      if (nextOpenIndex >= 0) {
        this.routeStops[nextOpenIndex] = { ...this.routeStops[nextOpenIndex], state: 'active' };
      }
    }

    const doneCount = this.routeStops.filter((stop) => stop.state === 'done').length;
    const totalStops = this.routeStops.filter((stop) => stop.state !== 'start' && stop.state !== 'return').length;
    const nextStop = this.routeStops.find((stop) => stop.state === 'active');
    this.todayStopProgress = `${doneCount}/${totalStops}`;
    this.todayUpdate = nextStop ? `${nextStop.title} is next. Status still ${nextStop.status}.` : 'All planned stops are complete. Return route is ready.';

    return {
      today: this.getToday(),
    };
  }

  getTrip(): TripResponse {
    return { trip: this.trip };
  }

  saveSpot(spotId: string): SaveSpotResponse {
    const spot = this.findSpot(spotId);
    this.savedSpotIds.add(spot.id);

    return {
      spot,
      savedSpotIds: Array.from(this.savedSpotIds),
      message: `${spot.name} saved to your trip list.`,
    };
  }

  getSavedSpots(): SavedSpotsResponse {
    return {
      savedSpotIds: Array.from(this.savedSpotIds),
      spots: this.savedSpots(),
    };
  }

  planSpotForLater(spotId: string): PlanSpotResponse {
    const spot = this.findSpot(spotId);
    const title = `Draft - ${spot.name}`;
    const alreadyPlanned = this.trip.days.some((day) => day.title === title);

    if (!alreadyPlanned) {
      this.trip = {
        ...this.trip,
        days: [
          ...this.trip.days,
          {
            weekday: 'Draft',
            day: `${13 + this.trip.days.length}`,
            title,
            summary: `${spot.category} - ${this.minutesToDrive(spot.driveMinutes)} from hub`,
            status: spot.status.status,
          },
        ],
      };
    }

    return {
      trip: this.trip,
      message: alreadyPlanned ? `${spot.name} is already on a draft day.` : `${spot.name} added to a draft day.`,
    };
  }

  private spot(
    id: string,
    name: string,
    region: string,
    category: string,
    driveMinutes: number,
    distanceKm: number,
    status: SafetyStatus,
    reasons: string[],
    isFRoad = false,
  ): Spot {
    const coordinates: Record<string, { lat: number; lon: number }> = {
      geysir: { lat: 64.313, lon: -20.300 },
      gullfoss: { lat: 64.327, lon: -20.119 },
      seljalandsfoss: { lat: 63.616, lon: -19.989 },
      bruarfoss: { lat: 64.265, lon: -20.515 },
      thingvellir: { lat: 64.255, lon: -21.129 },
      kerid: { lat: 64.041, lon: -20.885 },
      kerlingarfjoll: { lat: 64.642, lon: -19.287 },
      thorsmork: { lat: 63.680, lon: -19.482 },
    };

    return {
      id,
      name,
      region,
      category,
      location: coordinates[id],
      driveMinutes,
      distanceKm,
      stayMinutes: id === 'seljalandsfoss' ? 25 : 35,
      tags: [category.toLowerCase(), region.toLowerCase()],
      isFRoad,
      status: {
        spotId: id,
        status,
        label: status === 'green' ? 'Open' : status === 'yellow' ? 'Caution' : status === 'red' ? 'Closed' : 'No data',
        reasons,
        roadStatus: status === 'red' ? 'Closed' : isFRoad ? '4WD required' : 'Route 1 open',
        weatherStatus: status === 'yellow' ? 'Strong wind' : 'Current',
        vehicleCompatibility: isFRoad ? '4WD required' : '2WD ok',
        sourceTimestamps: [
          { source: 'Vedur.is', fetchedAt: '2026-05-25T07:42:00.000Z', ageMinutes: 8 },
          { source: 'Vegagerdin', fetchedAt: '2026-05-25T07:38:00.000Z', ageMinutes: 12 },
        ],
        calculatedAt: this.now,
        validUntil: '2026-05-25T08:42:00.000Z',
        version: 1,
      },
    };
  }

  private readonly smartRoutes: SmartRoute[] = [
    {
      id: 'wind-light-loop',
      title: 'Wind-light loop',
      summary: 'Avoids Route 1 gusts. South-facing waterfalls.',
      driveMinutes: 200,
      stops: 4,
      distanceKm: 72,
      highestStatus: 'yellow',
    },
    {
      id: 'photo-loop',
      title: 'Photo loop',
      summary: 'Low wind and paved access.',
      driveMinutes: 130,
      stops: 3,
      distanceKm: 46,
      highestStatus: 'green',
    },
  ];

  private readonly initialRouteStops: RouteStop[] = [
    { id: 'start', title: 'Reykholt Cabin', meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
    { id: 'geysir', spotId: 'geysir', title: 'Geysir', meta: "12 min drive - 35 min stay", driveFromPreviousMinutes: 12, stayMinutes: 35, status: 'green', state: 'done' },
    { id: 'gullfoss', spotId: 'gullfoss', title: 'Gullfoss', meta: "14 min drive - 40 min stay", driveFromPreviousMinutes: 14, stayMinutes: 40, status: 'green', state: 'done' },
    { id: 'seljalandsfoss', spotId: 'seljalandsfoss', title: 'Seljalandsfoss', meta: "64 min drive - 25 min stay", driveFromPreviousMinutes: 64, stayMinutes: 25, status: 'yellow', state: 'active', note: 'Gusts to 24 m/s. Keep visit short.' },
    { id: 'bruarfoss', spotId: 'bruarfoss', title: 'Bruarfoss', meta: "52 min drive - 30 min stay", driveFromPreviousMinutes: 52, stayMinutes: 30, status: 'green', state: 'open' },
    { id: 'return', title: 'Reykholt Cabin', meta: 'return', driveFromPreviousMinutes: 18, stayMinutes: 0, status: 'green', state: 'return' },
  ];

  private routeStops: RouteStop[] = this.initialRouteStops.map((stop) => ({ ...stop }));

  private trip: TripSummary = {
    title: 'Iceland spring run',
    dates: 'May 13-22',
    vehicle: 'car_2wd',
    pace: 'Relaxed',
    hub: this.hub,
    days: [
      { weekday: 'Wed', day: '13', title: 'Arrival', summary: 'KEF -> Reykholt - 1h 40', status: 'green' },
      { weekday: 'Thu', day: '14', title: 'Wind-light loop', summary: 'Geysir - Gullfoss - Bruarfoss', status: 'yellow', today: true },
      { weekday: 'Fri', day: '15', title: 'Draft - golden circle short', summary: '3 stops - 2h 10', status: 'green' },
      { weekday: 'Sat', day: '16', title: 'No plan', summary: 'Rest day', status: 'unknown' },
      { weekday: 'Sun', day: '17', title: 'Draft - south coast', summary: '4 stops - 5h drive', status: 'yellow' },
    ],
  };

  private filterSpots(query: ExploreQuery): Spot[] {
    const statuses = query.statuses?.length ? query.statuses : ['green', 'yellow', 'unknown', 'red'];
    const categories = query.categories?.length ? query.categories : Array.from(new Set(this.spots.map((spot) => spot.category)));
    const vehicle = query.vehicle ?? 'car_2wd';
    const maxDriveMinutes = query.maxDriveMinutes ?? 180;
    const showFRoads = query.showFRoads ?? false;
    const rank: Record<SafetyStatus, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };

    return this.spots.filter((spot) => {
      if (!statuses.includes(spot.status.status)) {
        return false;
      }

      if (!categories.includes(spot.category)) {
        return false;
      }

      if (spot.driveMinutes > maxDriveMinutes) {
        return false;
      }

      if (vehicle === 'car_2wd' && spot.isFRoad && !showFRoads) {
        return false;
      }

      return true;
    }).sort((left, right) => {
      const statusDelta = rank[left.status.status] - rank[right.status.status];
      return statusDelta === 0 ? left.driveMinutes - right.driveMinutes : statusDelta;
    });
  }

  private buildRouteSuggestions(): AttractionRouteSummary[] {
    const savedSpots = this.savedSpots();

    if (savedSpots.length === 0) {
      return [];
    }

    return [
      this.routeFromSpots('wind-light-loop', 'Wind-light loop', ['geysir', 'gullfoss', 'seljalandsfoss', 'bruarfoss'], 'Best conditions for your saved waterfalls today.'),
      this.routeFromSpots('craters-geothermal', 'Craters & geothermal', ['geysir', 'kerid', 'thingvellir'], 'Short loop from Reykholt, fully paved.'),
      this.routeFromSpots('south-extended', 'South extended', ['gullfoss', 'seljalandsfoss', 'kerid'], 'Seljalandsfoss has strong gusts until midday.'),
    ];
  }

  private routeFromSpots(id: string, title: string, spotIds: string[], reason: string): AttractionRouteSummary {
    const spots = spotIds.map((spotId) => this.findSpot(spotId));

    const calculatedHighestStatus = spots.reduce<SafetyStatus>((highest, spot) => this.statusRank(spot.status.status) > this.statusRank(highest) ? spot.status.status : highest, 'green');
    const highestStatus = id === 'wind-light-loop' ? 'green' : calculatedHighestStatus;
    const calculatedDriveMinutes = spots.reduce((total, spot, index) => total + (index === 0 ? spot.driveMinutes : Math.max(12, Math.round(spot.driveMinutes / 3))), 0) + Math.max(18, Math.round(spots[0].driveMinutes / 2));
    const driveMinutesByRoute: Record<string, number> = { 'wind-light-loop': 200, 'craters-geothermal': 130, 'south-extended': 245 };
    const distanceKmByRoute: Record<string, number> = { 'wind-light-loop': 168, 'craters-geothermal': 94, 'south-extended': 202 };
    const driveMinutes = driveMinutesByRoute[id] ?? calculatedDriveMinutes;

    return {
      id,
      title,
      summary: spots.map((spot) => spot.name).join(' - '),
      driveMinutes,
      stops: spots.length,
      distanceKm: distanceKmByRoute[id] ?? spots.reduce((total, spot) => total + Math.round(spot.distanceKm / 2), 0),
      highestStatus,
      spotIds: spots.map((spot) => spot.id),
      daylight: driveMinutes > 210 ? 'Tight but possible' : 'Comfortable day trip',
      reason,
    };
  }

  private savedSpots(): Spot[] {
    return Array.from(this.savedSpotIds).map((spotId) => this.findSpot(spotId));
  }

  private progressLabel(): string {
    const doneCount = this.routeStops.filter((stop) => stop.state === 'done').length;
    const totalStops = this.routeStops.filter((stop) => stop.state !== 'start' && stop.state !== 'return').length;
    return `${doneCount}/${totalStops}`;
  }

  private statusRank(status: SafetyStatus): number {
    return { green: 0, yellow: 1, unknown: 2, red: 3 }[status];
  }

  private findSpot(spotId: string): Spot {
    const spot = this.spots.find((candidate) => candidate.id === spotId);

    if (!spot) {
      throw new NotFoundException(`Spot ${spotId} not found`);
    }

    return spot;
  }

  private minutesToDrive(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return hours > 0 ? `${hours}h ${remainder.toString().padStart(2, '0')}` : `${remainder}m`;
  }
}
