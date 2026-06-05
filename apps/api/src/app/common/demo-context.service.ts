import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RequestContextService } from '../modules/auth/request-context.service';

export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';
export const DEMO_TRIP_ID = '00000000-0000-0000-0000-000000000002';
export const DEMO_HUB_ID = '00000000-0000-0000-0000-000000000003';

@Injectable()
export class DemoContextService implements OnModuleInit {
  private readonly logger = new Logger(DemoContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seed().catch((err: Error) => {
      this.logger.warn(`Seed skipped (DB not ready): ${err.message}`);
    });
  }

  getUserId(): string {
    return this.requestContext.getUserId() ?? DEMO_USER_ID;
  }

  getTripId(): string {
    const tripId = this.requestContext.getTripId();
    if (tripId) {
      return tripId;
    }
    if (this.requestContext.hasAuthenticatedUser()) {
      throw new NotFoundException('Active trip not found for authenticated user');
    }

    return DEMO_TRIP_ID;
  }

  getHubId(): string {
    const hubId = this.requestContext.getHubId();
    if (hubId) {
      return hubId;
    }
    if (this.requestContext.hasAuthenticatedUser()) {
      throw new NotFoundException('Active hub not found for authenticated user');
    }

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

  }
}
