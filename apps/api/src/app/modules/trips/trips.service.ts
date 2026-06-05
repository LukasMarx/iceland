import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demoContext: DemoContextService,
  ) {}

  async getTrip(query: { tripId?: string }) {
    const tripId = query.tripId ?? this.demoContext.getTripId();
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ownerId: this.demoContext.getUserId(), archivedAt: null },
      include: {
        activeHub: true,
        days: {
          orderBy: { date: 'asc' },
          include: {
            routes: {
              where: { archivedAt: null },
              select: { id: true, title: true, lifecycle: true, highestStatus: true, totalDriveMinutes: true, _count: { select: { stops: true } } },
            },
          },
        },
        savedSpots: { select: { spotId: true } },
        routes: { where: { tripDayId: null, archivedAt: null }, select: { id: true, title: true, lifecycle: true, direction: true, highestStatus: true, totalDriveMinutes: true, _count: { select: { stops: true } } } },
      },
    });

    if (!trip) {
      throw new NotFoundException({ code: 'trip_not_found', message: 'No active trip found.' });
    }

    const hub = trip.activeHub;
    const savedSpotIds = trip.savedSpots.map((s) => s.spotId);

    const days = trip.days.map((day) => ({
      date: day.date.toISOString().split('T')[0],
      title: day.title,
      routeIds: day.routes.map((r) => r.id),
      status: computeDayStatus(day),
    }));

    const unplacedRoutes = trip.routes.map((r) => ({
      id: r.id,
      title: r.title,
      direction: r.direction === 'ONE_WAY' ? 'ONE-WAY' : 'LOOP',
      stops: r._count.stops,
      durationMinutes: r.totalDriveMinutes,
    }));

    const hotelsToBook = 0;
    const routesUsed = trip.days.flatMap((d) => d.routes).filter((r) => r.lifecycle === 'active_today' || r.lifecycle === 'planned').length;

    return {
      trip: {
        id: trip.id,
        title: trip.title,
        startsOn: trip.startsOn.toISOString().split('T')[0],
        endsOn: trip.endsOn.toISOString().split('T')[0],
        timezone: trip.timezone,
        vehicle: trip.vehicle,
        hub: hub
          ? { id: hub.id, placeId: hub.placeId, name: hub.name, type: hub.type, location: { lat: hub.lat, lon: hub.lon } }
          : null,
        days,
        unplacedRoutes,
        savedSpotIds,
        hotelsToBook,
        routesUsed,
        version: trip.version,
      },
    };
  }

  async addDraftDay(body: { spotId?: string; routeId?: string; tripId?: string; title?: string; date?: string; idempotencyKey?: string }) {
    if (!body.spotId && !body.routeId) {
      throw new BadRequestException({ code: 'missing_target', message: 'Provide spotId or routeId.' });
    }

    const tripId = body.tripId ?? this.demoContext.getTripId();
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, archivedAt: null },
      include: { days: { orderBy: { date: 'asc' } } },
    });

    if (!trip) throw new NotFoundException({ code: 'trip_not_found', message: 'Trip not found.' });

    if (body.date) {
      const targetDate = new Date(body.date);
      if (targetDate < trip.startsOn || targetDate > trip.endsOn) {
        throw new UnprocessableEntityException({ code: 'date_out_of_range', message: 'Date is outside trip date range.' });
      }
    }

    if (body.spotId) {
      const spot = await this.prisma.spot.findUnique({ where: { id: body.spotId }, include: { translations: true } });
      if (!spot) throw new NotFoundException({ code: 'spot_not_found', message: `Spot ${body.spotId} not found.` });

      const name = spot.translations.find((t) => t.locale === 'en')?.name ?? body.spotId;
      const draftTitle = body.title ?? `Draft · ${name}`;

      const targetDate = body.date
        ? new Date(body.date)
        : findFirstEmptyDay(trip.days);

      const routeDefaults = {
        totalDriveMinutes: 30,
        totalTripMinutes: 60,
        distanceKm: 30,
        highestStatus: 'unknown' as const,
        driveMinutesFromPrevious: 30,
        statusLevel: 'unknown' as const,
      };

      if (targetDate) {
        const day = await this.prisma.tripDay.upsert({
          where: { tripId_date: { tripId, date: targetDate } },
          create: { tripId, date: targetDate, title: draftTitle, status: 'draft', version: 1 },
          update: { title: draftTitle, status: 'draft', version: { increment: 1 } },
        });

        await this.prisma.route.create({
          data: {
            tripId,
            tripDayId: day.id,
            title: draftTitle,
            date: targetDate,
            lifecycle: 'draft',
            direction: 'LOOP',
            source: 'draft_day',
            startName: 'Hub',
            startType: 'custom',
            startLat: 64.663,
            startLon: -21.292,
            totalDriveMinutes: routeDefaults.totalDriveMinutes,
            totalTripMinutes: routeDefaults.totalTripMinutes,
            distanceKm: routeDefaults.distanceKm,
            highestStatus: routeDefaults.highestStatus,
            version: 1,
            stops: {
              create: {
                spotId: body.spotId,
                position: 0,
                title: name,
                lat: spot.lat,
                lon: spot.lon,
                state: 'pending',
                visitMinutes: spot.visitMinutes,
                driveMinutesFromPrevious: routeDefaults.driveMinutesFromPrevious,
                statusLevel: routeDefaults.statusLevel,
              },
            },
          },
        });
      } else {
        await this.prisma.route.create({
          data: {
            tripId,
            title: draftTitle,
            lifecycle: 'draft',
            direction: 'LOOP',
            source: 'draft_day',
            startName: 'Hub',
            startType: 'custom',
            startLat: 64.663,
            startLon: -21.292,
            totalDriveMinutes: routeDefaults.totalDriveMinutes,
            totalTripMinutes: routeDefaults.totalTripMinutes,
            distanceKm: routeDefaults.distanceKm,
            highestStatus: routeDefaults.highestStatus,
            version: 1,
          },
        });
      }

      const message = targetDate
        ? `${name} added as draft for ${targetDate.toISOString().split('T')[0]}.`
        : `${name} added to unplaced routes.`;

      return { trip: (await this.getTrip({ tripId })).trip, message };
    }

    if (body.routeId) {
      const route = await this.prisma.route.findFirst({ where: { id: body.routeId, tripId } });
      if (!route) throw new NotFoundException({ code: 'route_not_found', message: 'Route not found.' });

      if (body.date) {
        const day = await this.prisma.tripDay.upsert({
          where: { tripId_date: { tripId, date: new Date(body.date) } },
          create: { tripId, date: new Date(body.date), title: body.title ?? route.title, status: 'draft', version: 1 },
          update: {},
        });
        await this.prisma.route.update({ where: { id: body.routeId }, data: { tripDayId: day.id, date: new Date(body.date), lifecycle: 'planned' } });
      }

      return { trip: (await this.getTrip({ tripId })).trip, message: 'Route added as draft day.' };
    }

    return { trip: (await this.getTrip({ tripId })).trip, message: 'Draft day added.' };
  }
}

function computeDayStatus(day: {
  status: string;
  routes: { lifecycle: string; highestStatus: string }[];
}) {
  if (day.status === 'done') return 'done';
  if (day.status === 'active') return 'active';
  if (day.routes.length === 0) return day.status;
  if (day.routes.some((r) => r.lifecycle === 'planned')) return 'planned';
  if (day.routes.some((r) => r.lifecycle === 'draft')) return 'draft';
  return day.status;
}

function findFirstEmptyDay(days: { date: Date; status: string }[]): Date | null {
  const empty = days.find((d) => d.status === 'empty');
  return empty?.date ?? null;
}
