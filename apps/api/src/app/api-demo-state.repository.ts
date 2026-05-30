import { Injectable } from '@nestjs/common';
import type { RouteStop, TripSummary } from '@islandhub/domain';
import type { DemoState } from '@prisma/client';
import { PrismaService } from './prisma.service';

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
  private readonly stateId = 'seed';
  private schemaReady?: Promise<void>;

  constructor(private readonly prisma: PrismaService) {}

  async snapshot(): Promise<ApiDemoState> {
    await this.ensureSchema();

    const record = await this.prisma.demoState.findUnique({
      where: { id: this.stateId },
    });

    if (!record) {
      return this.reset();
    }

    return hydrateState(record);
  }

  async update(mutator: (state: ApiDemoState) => ApiDemoState): Promise<ApiDemoState> {
    const nextState = cloneState(mutator(await this.snapshot()));
    return this.persist(nextState);
  }

  async reset(): Promise<ApiDemoState> {
    await this.ensureSchema();
    return this.persist(createInitialState());
  }

  private async persist(state: ApiDemoState): Promise<ApiDemoState> {
    await this.ensureSchema();

    const payload = serializeState(state);
    const saved = await this.prisma.demoState.upsert({
      where: { id: this.stateId },
      create: {
        id: this.stateId,
        ...payload,
      },
      update: payload,
    });

    return hydrateState(saved);
  }

  private async ensureSchema(): Promise<void> {
    if (!this.schemaReady) {
      this.schemaReady = this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "DemoState" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "savedSpotIdsJson" TEXT NOT NULL,
          "todayTitle" TEXT NOT NULL,
          "todayStopProgress" TEXT NOT NULL,
          "todayDriveMinutes" INTEGER NOT NULL,
          "todayUpdate" TEXT NOT NULL,
          "routeStopsJson" TEXT NOT NULL,
          "tripJson" TEXT NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).then(() => undefined);
    }

    await this.schemaReady;
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

function serializeState(state: ApiDemoState) {
  return {
    savedSpotIdsJson: JSON.stringify(state.savedSpotIds),
    todayTitle: state.todayTitle,
    todayStopProgress: state.todayStopProgress,
    todayDriveMinutes: state.todayDriveMinutes,
    todayUpdate: state.todayUpdate,
    routeStopsJson: JSON.stringify(state.routeStops),
    tripJson: JSON.stringify(state.trip),
  };
}

function hydrateState(record: DemoState): ApiDemoState {
  return cloneState({
    savedSpotIds: JSON.parse(record.savedSpotIdsJson) as string[],
    todayTitle: record.todayTitle,
    todayStopProgress: record.todayStopProgress,
    todayDriveMinutes: record.todayDriveMinutes,
    todayUpdate: record.todayUpdate,
    routeStops: JSON.parse(record.routeStopsJson) as RouteStop[],
    trip: JSON.parse(record.tripJson) as TripSummary,
  });
}
