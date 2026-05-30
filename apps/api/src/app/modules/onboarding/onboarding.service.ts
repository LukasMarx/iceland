import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DemoContextService, DEMO_HUB_ID } from '../../common/demo-context.service';
import { SEED_SPOTS } from '../../common/seed-spots';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demoContext: DemoContextService,
  ) {}

  async completeOnboarding(body: {
    locale: string;
    planningPhase: 'ideas' | 'fixed_hub' | 'roadtrip';
    dateRange: { startsOn: string; endsOn: string };
    vehicle: 'car_2wd' | 'car_4wd' | 'unknown';
    hub?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
  }) {
    if (!body.locale || !body.planningPhase || !body.dateRange?.startsOn || !body.dateRange?.endsOn) {
      throw new BadRequestException('Missing required fields: locale, planningPhase, dateRange');
    }
    if (body.planningPhase === 'fixed_hub' && !body.hub) {
      throw new BadRequestException('hub is required for fixed_hub planning phase');
    }

    const userId = this.demoContext.getUserId();
    const startsOn = new Date(body.dateRange.startsOn);
    const endsOn = new Date(body.dateRange.endsOn);

    if (isNaN(startsOn.getTime()) || isNaN(endsOn.getTime()) || startsOn >= endsOn) {
      throw new BadRequestException('Invalid dateRange: startsOn must be before endsOn');
    }

    const existingTrip = await this.prisma.trip.findFirst({
      where: { ownerId: userId, archivedAt: null },
    });
    if (existingTrip) {
      throw new ConflictException({
        code: 'trip_already_exists',
        message: 'User already has an active trip. Confirm to create a new one.',
      });
    }

    await this.prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        locale: body.locale as 'en' | 'de' | 'is',
        units: 'metric',
        temperatureUnit: 'C',
        currency: 'EUR',
      },
      update: { locale: body.locale as 'en' | 'de' | 'is' },
    });

    const trip = await this.prisma.trip.create({
      data: {
        ownerId: userId,
        title: 'My Iceland Trip',
        planningPhase: body.planningPhase,
        startsOn,
        endsOn,
        timezone: 'Atlantic/Reykjavik',
        vehicle: body.vehicle,
        isActive: true,
        version: 1,
      },
    });

    let hubId: string | undefined;
    if (body.hub) {
      const hubLat = body.hub.location?.lat ?? 64.663;
      const hubLon = body.hub.location?.lon ?? -21.292;
      const hub = await this.prisma.hub.create({
        data: {
          tripId: trip.id,
          placeId: body.hub.id,
          name: body.hub.name ?? 'My Hub',
          type: (body.hub.type as 'city' | 'hotel' | 'home' | 'airport' | 'hub' | 'custom') ?? 'custom',
          startsOn,
          endsOn,
          lat: hubLat,
          lon: hubLon,
          sortOrder: 0,
        },
      });
      hubId = hub.id;
      await this.prisma.trip.update({ where: { id: trip.id }, data: { activeHubId: hub.id } });
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.round((endsOn.getTime() - startsOn.getTime()) / msPerDay) + 1;
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startsOn);
      date.setDate(date.getDate() + i);
      await this.prisma.tripDay.create({
        data: { tripId: trip.id, date, status: 'empty', version: 1 },
      });
    }

    const tripWithDays = await this.prisma.trip.findUniqueOrThrow({
      where: { id: trip.id },
      include: { activeHub: true, days: { orderBy: { date: 'asc' } } },
    });

    const hub = hubId ? await this.prisma.hub.findUnique({ where: { id: hubId } }) : null;

    return {
      user: { id: userId, locale: body.locale },
      trip: buildTripSummary(tripWithDays, hub),
      explore: buildExploreSnapshot(tripWithDays, hub),
    };
  }
}

function buildTripSummary(trip: any, hub: any) {
  return {
    id: trip.id,
    title: trip.title,
    startsOn: trip.startsOn.toISOString().split('T')[0],
    endsOn: trip.endsOn.toISOString().split('T')[0],
    timezone: trip.timezone,
    vehicle: trip.vehicle,
    hub: hub
      ? { id: hub.id, name: hub.name, type: hub.type, location: { lat: hub.lat, lon: hub.lon } }
      : null,
    days: trip.days.map((d: any) => ({
      date: d.date.toISOString().split('T')[0],
      title: d.title,
      routeIds: [],
      status: d.status,
    })),
    unplacedRoutes: [],
    savedSpotIds: [],
    version: trip.version,
  };
}

function buildExploreSnapshot(trip: any, hub: any) {
  const hubData = hub
    ? { id: hub.id, name: hub.name, type: hub.type, location: { lat: hub.lat, lon: hub.lon } }
    : { id: DEMO_HUB_ID, name: 'Hub', type: 'custom', location: { lat: 64.663, lon: -21.292 } };

  return {
    hub: hubData,
    dateLabel: `Today, ${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`,
    vehicle: trip.vehicle,
    dataAgeMinutes: 0,
    spots: [],
    smartRoutes: [],
    pageInfo: { hasMore: false },
  };
}
