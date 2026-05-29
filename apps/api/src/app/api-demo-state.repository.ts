import { Injectable } from '@nestjs/common';
import type { RouteStop, TripSummary } from '@islandhub/domain';

export interface ApiDemoState {
  savedSpotIds: string[];
  todayTitle: string;
  todayStopProgress: string;
  todayDriveMinutes: number;
  todayUpdate: string;
  routeStops: RouteStop[];
  trip: TripSummary;
}

@Injectable()
export class ApiDemoStateRepository {
  private state = createInitialState();

  snapshot(): ApiDemoState {
    return cloneState(this.state);
  }

  update(mutator: (state: ApiDemoState) => ApiDemoState): ApiDemoState {
    this.state = cloneState(mutator(this.snapshot()));
    return this.snapshot();
  }
}

function createInitialState(): ApiDemoState {
  const hub = {
    id: 'hub-reykholt',
    name: 'Reykholt Cabin',
    location: { lat: 64.663, lon: -21.292 },
    dateRange: '13-22 May',
    nights: 9,
  };

  return {
    savedSpotIds: ['geysir', 'gullfoss', 'thingvellir', 'bruarfoss', 'kerid'],
    todayTitle: 'Wind-light loop',
    todayStopProgress: '2/4',
    todayDriveMinutes: 200,
    todayUpdate: 'Status updated: Seljalandsfoss wind gusts rising to 24 m/s. Still passable.',
    routeStops: [
      { id: 'start', title: 'Reykholt Cabin', meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
      { id: 'geysir', spotId: 'geysir', title: 'Geysir', meta: '12 min drive - 35 min stay', driveFromPreviousMinutes: 12, stayMinutes: 35, status: 'green', state: 'done' },
      { id: 'gullfoss', spotId: 'gullfoss', title: 'Gullfoss', meta: '14 min drive - 40 min stay', driveFromPreviousMinutes: 14, stayMinutes: 40, status: 'green', state: 'done' },
      { id: 'seljalandsfoss', spotId: 'seljalandsfoss', title: 'Seljalandsfoss', meta: '64 min drive - 25 min stay', driveFromPreviousMinutes: 64, stayMinutes: 25, status: 'yellow', state: 'active', note: 'Gusts to 24 m/s. Keep visit short.' },
      { id: 'bruarfoss', spotId: 'bruarfoss', title: 'Bruarfoss', meta: '52 min drive - 30 min stay', driveFromPreviousMinutes: 52, stayMinutes: 30, status: 'green', state: 'open' },
      { id: 'return', title: 'Reykholt Cabin', meta: 'return', driveFromPreviousMinutes: 18, stayMinutes: 0, status: 'green', state: 'return' },
    ],
    trip: {
      title: 'Iceland spring run',
      dates: 'May 13-22',
      vehicle: 'car_2wd',
      pace: 'Relaxed',
      hub,
      days: [
        { weekday: 'Wed', day: '13', title: 'Arrival', summary: 'KEF -> Reykholt - 1h 40', status: 'green' },
        { weekday: 'Thu', day: '14', title: 'Wind-light loop', summary: 'Geysir - Gullfoss - Bruarfoss', status: 'yellow', today: true },
        { weekday: 'Fri', day: '15', title: 'Draft - golden circle short', summary: '3 stops - 2h 10', status: 'green' },
        { weekday: 'Sat', day: '16', title: 'No plan', summary: 'Rest day', status: 'unknown' },
        { weekday: 'Sun', day: '17', title: 'Draft - south coast', summary: '4 stops - 5h drive', status: 'yellow' },
      ],
    },
  };
}

function cloneState(state: ApiDemoState): ApiDemoState {
  return {
    ...state,
    savedSpotIds: [...state.savedSpotIds],
    routeStops: state.routeStops.map((stop) => ({ ...stop })),
    trip: {
      ...state.trip,
      hub: { ...state.trip.hub, location: { ...state.trip.hub.location } },
      days: state.trip.days.map((day) => ({ ...day })),
    },
  };
}
