import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SEED_SPOTS, SEED_CHECKED_AT, SEED_VALID_UNTIL } from './seed-spots';

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_TRIP_ID = '00000000-0000-0000-0000-000000000002';
export const DEMO_HUB_ID = '00000000-0000-0000-0000-000000000003';

@Injectable()
export class DemoContextService implements OnModuleInit {
  private readonly logger = new Logger(DemoContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.seed().catch((err: Error) => {
      this.logger.warn(`Seed skipped (DB not ready): ${err.message}`);
    });
  }

  getUserId(): string {
    return DEMO_USER_ID;
  }

  getTripId(): string {
    return DEMO_TRIP_ID;
  }

  getHubId(): string {
    return DEMO_HUB_ID;
  }

  async resolveTrip(tripId?: string) {
    const id = tripId ?? DEMO_TRIP_ID;
    return this.prisma.trip.findFirst({
      where: { id, ownerId: DEMO_USER_ID, archivedAt: null },
      include: {
        activeHub: true,
        days: { orderBy: { date: 'asc' } },
      },
    });
  }

  private async seed(): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: DEMO_USER_ID },
      create: {
        id: DEMO_USER_ID,
        email: 'lukas@pixx.io',
        displayName: 'Lukas K.',
        initials: 'LK',
        joinedAt: new Date('2026-05-13T00:00:00Z'),
        subscription: 'free',
      },
      update: {},
    });

    await this.prisma.userPreference.upsert({
      where: { userId: DEMO_USER_ID },
      create: {
        userId: DEMO_USER_ID,
        locale: 'en',
        units: 'metric',
        temperatureUnit: 'C',
        currency: 'EUR',
        pushAlertsTomorrowRoute: true,
        notifyStatusWorsensEnRoute: true,
      },
      update: {},
    });

    await this.prisma.trip.upsert({
      where: { id: DEMO_TRIP_ID },
      create: {
        id: DEMO_TRIP_ID,
        ownerId: DEMO_USER_ID,
        title: 'Iceland · spring run',
        planningPhase: 'fixed_hub',
        startsOn: new Date('2026-05-13T00:00:00Z'),
        endsOn: new Date('2026-05-22T00:00:00Z'),
        timezone: 'Atlantic/Reykjavik',
        vehicle: 'car_2wd',
        pace: 'slow',
        isActive: true,
        version: 1,
      },
      update: {},
    });

    await this.prisma.hub.upsert({
      where: { id: DEMO_HUB_ID },
      create: {
        id: DEMO_HUB_ID,
        tripId: DEMO_TRIP_ID,
        name: 'Reykholt Cabin',
        type: 'custom',
        startsOn: new Date('2026-05-13T00:00:00Z'),
        endsOn: new Date('2026-05-22T00:00:00Z'),
        lat: 64.663,
        lon: -21.292,
        sortOrder: 0,
      },
      update: {},
    });

    await this.prisma.trip.update({
      where: { id: DEMO_TRIP_ID },
      data: { activeHubId: DEMO_HUB_ID },
    });

    const tripDays = [
      { date: '2026-05-13', title: 'Arrival', status: 'done' as const },
      { date: '2026-05-14', title: 'Wind-light loop', status: 'active' as const },
      { date: '2026-05-15', title: 'Draft · golden circle short', status: 'draft' as const },
      { date: '2026-05-16', title: null, status: 'empty' as const },
      { date: '2026-05-17', title: 'Draft · south coast', status: 'draft' as const },
      { date: '2026-05-18', title: null, status: 'empty' as const },
      { date: '2026-05-19', title: null, status: 'empty' as const },
      { date: '2026-05-20', title: null, status: 'empty' as const },
      { date: '2026-05-21', title: null, status: 'empty' as const },
      { date: '2026-05-22', title: 'Departure', status: 'empty' as const },
    ];

    for (const day of tripDays) {
      await this.prisma.tripDay.upsert({
        where: { tripId_date: { tripId: DEMO_TRIP_ID, date: new Date(day.date) } },
        create: {
          tripId: DEMO_TRIP_ID,
          date: new Date(day.date),
          title: day.title ?? undefined,
          status: day.status,
          version: 1,
        },
        update: {},
      });
    }

    await this.seedSpots();
    await this.seedSavedSpots();
    await this.seedTodayRoute();
  }

  private async seedSpots(): Promise<void> {
    for (const spot of SEED_SPOTS) {
      const existing = await this.prisma.spot.findUnique({ where: { id: spot.id } });
      if (existing) continue;

      await this.prisma.spot.create({
        data: {
          id: spot.id,
          slug: spot.id,
          region: spot.region,
          visitMinutes: spot.visitMinutes,
          minVehicle: spot.isFRoad ? 'car_4wd' : 'car_2wd',
          isFRoad: spot.isFRoad,
          popularityScore: 50,
          lat: spot.lat,
          lon: spot.lon,
          isPublished: true,
          translations: {
            create: {
              locale: 'en',
              name: spot.name,
              shortDescription: spot.statusReason,
            },
          },
        },
      });

      await this.prisma.spotStatusSnapshot.create({
        data: {
          spotId: spot.id,
          tripId: DEMO_TRIP_ID,
          hubId: DEMO_HUB_ID,
          vehicle: 'car_2wd',
          targetDate: new Date('2026-05-14'),
          level: spot.status,
          label: spot.statusLabel,
          reason: spot.statusReason,
          reasons: spot.statusReasons,
          calculatedAt: new Date(SEED_CHECKED_AT),
          validUntil: new Date(SEED_VALID_UNTIL),
          version: 1,
        },
      });
    }
  }

  private async seedSavedSpots(): Promise<void> {
    const savedIds = ['geysir', 'gullfoss', 'thingvellir', 'bruarfoss', 'kerid'];
    for (const spotId of savedIds) {
      await this.prisma.savedSpot.upsert({
        where: { tripId_spotId: { tripId: DEMO_TRIP_ID, spotId } },
        create: { tripId: DEMO_TRIP_ID, spotId },
        update: {},
      });
    }
  }

  private async seedTodayRoute(): Promise<void> {
    const existing = await this.prisma.route.findFirst({
      where: { tripId: DEMO_TRIP_ID, lifecycle: 'active_today' },
    });
    if (existing) return;

    const todayDay = await this.prisma.tripDay.findFirst({
      where: { tripId: DEMO_TRIP_ID, date: new Date('2026-05-14') },
    });

    const route = await this.prisma.route.create({
      data: {
        tripId: DEMO_TRIP_ID,
        tripDayId: todayDay?.id,
        title: 'Wind-light loop',
        date: new Date('2026-05-14'),
        lifecycle: 'active_today',
        direction: 'LOOP',
        source: 'suggestion',
        startName: 'Reykholt Cabin',
        startType: 'custom',
        startLat: 64.663,
        startLon: -21.292,
        totalDriveMinutes: 200,
        totalTripMinutes: 370,
        distanceKm: 160,
        highestStatus: 'yellow',
        statusReason: 'Seljalandsfoss wind gusts rising to 24 m/s. Still passable.',
        activeKey: `${DEMO_TRIP_ID}-today-2026-05-14`,
        version: 1,
      },
    });

    const stops = [
      {
        spotId: 'geysir',
        position: 0,
        title: 'Geysir',
        lat: 64.313,
        lon: -20.300,
        state: 'done' as const,
        visitMinutes: 35,
        driveMinutesFromPrevious: 12,
        distanceKmFromPrevious: 17.0,
        statusLevel: 'green' as const,
      },
      {
        spotId: 'gullfoss',
        position: 1,
        title: 'Gullfoss',
        lat: 64.327,
        lon: -20.119,
        state: 'done' as const,
        visitMinutes: 40,
        driveMinutesFromPrevious: 14,
        distanceKmFromPrevious: 10.0,
        statusLevel: 'green' as const,
      },
      {
        spotId: 'seljalandsfoss',
        position: 2,
        title: 'Seljalandsfoss',
        lat: 63.616,
        lon: -19.989,
        state: 'active' as const,
        visitMinutes: 25,
        driveMinutesFromPrevious: 64,
        distanceKmFromPrevious: 75.0,
        statusLevel: 'yellow' as const,
        statusReason: 'Gusts to 24 m/s. Keep visit short.',
      },
      {
        spotId: 'bruarfoss',
        position: 3,
        title: 'Brúarfoss',
        lat: 64.265,
        lon: -20.515,
        state: 'pending' as const,
        visitMinutes: 30,
        driveMinutesFromPrevious: 52,
        distanceKmFromPrevious: 58.0,
        statusLevel: 'green' as const,
      },
    ];

    for (const stop of stops) {
      await this.prisma.routeStop.create({
        data: {
          routeId: route.id,
          spotId: stop.spotId,
          position: stop.position,
          title: stop.title,
          lat: stop.lat,
          lon: stop.lon,
          state: stop.state,
          visitMinutes: stop.visitMinutes,
          driveMinutesFromPrevious: stop.driveMinutesFromPrevious,
          distanceKmFromPrevious: stop.distanceKmFromPrevious,
          statusLevel: stop.statusLevel,
          statusReason: stop.statusReason,
        },
      });
    }
  }
}
