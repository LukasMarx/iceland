import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RequestContextService } from '../auth/request-context.service';
import { mapSpot } from '../../common/spot-mapper';
import { SPOT_INCLUDE, STOP_ORDER, buildRouteSummary, recalculateRoute } from '../../common/response-builder';
import { TodayRouteService } from '../today/today.service';

@Injectable()
export class RouteCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
    private readonly todayService: TodayRouteService,
  ) {}

  private getTripId(): string {
    const id = this.requestContext.getTripId();
    if (!id) throw new NotFoundException({ code: 'trip_not_found', message: 'No active trip found.' });
    return id;
  }

  async createRoute(body: {
    tripId?: string;
    title?: string;
    date?: string;
    start: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    direction: 'ONE-WAY' | 'LOOP';
    spotIds: string[];
    source: string;
    makeActiveToday?: boolean;
    replaceExistingToday?: boolean;
  }) {
    const tripId = body.tripId ?? this.getTripId();
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId }, include: { activeHub: true } });
    if (!trip) throw new NotFoundException({ code: 'trip_not_found', message: 'Trip not found.' });

    const hub = trip.activeHub;
    const startLat = body.start.location?.lat ?? hub?.lat ?? 64.663;
    const startLon = body.start.location?.lon ?? hub?.lon ?? -21.292;

    const spotData = await Promise.all(
      body.spotIds.map((id) => this.prisma.spot.findUnique({ where: { id }, include: { translations: true } })),
    );
    const missingSpot = spotData.find((s) => !s);
    if (missingSpot !== undefined) throw new NotFoundException({ code: 'spot_not_found', message: 'One or more spots not found.' });

    const totalDrive = body.spotIds.length * 30;
    const routeName = body.title ?? spotData.map((s) => s!.translations.find((t) => t.locale === 'en')?.name ?? s!.id).slice(0, 2).join(' · ') + ' loop';

    const dayId = body.date
      ? (await this.prisma.tripDay.findFirst({ where: { tripId, date: new Date(body.date) } }))?.id
      : undefined;

    const route = await this.prisma.route.create({
      data: {
        tripId,
        tripDayId: dayId,
        title: routeName,
        date: body.date ? new Date(body.date) : undefined,
        lifecycle: body.makeActiveToday ? 'active_today' : 'planned',
        direction: body.direction === 'ONE-WAY' ? 'ONE_WAY' : 'LOOP',
        source: (body.source as 'wizard' | 'spot_action' | 'manual' | 'suggestion' | 'draft_day') ?? 'manual',
        startName: body.start.name ?? hub?.name ?? 'Start',
        startType: (body.start.type ?? 'custom') as any,
        startLat,
        startLon,
        destinationName: body.destination?.name,
        destinationType: body.destination?.type as any,
        destinationLat: body.destination?.location?.lat,
        destinationLon: body.destination?.location?.lon,
        totalDriveMinutes: totalDrive,
        totalTripMinutes: totalDrive + body.spotIds.reduce((sum, _id) => sum + 30, 0),
        distanceKm: totalDrive * 1.2,
        highestStatus: 'unknown',
        activeKey: body.makeActiveToday ? `${tripId}-today-${body.date ?? new Date().toISOString().split('T')[0]}` : undefined,
        version: 1,
      },
    });

    let position = 0;
    for (const spotId of body.spotIds) {
      const spot = spotData.find((s) => s?.id === spotId)!;
      await this.prisma.routeStop.create({
        data: {
          routeId: route.id,
          spotId,
          position: position++,
          title: spot.translations.find((t) => t.locale === 'en')?.name ?? spotId,
          lat: spot.lat,
          lon: spot.lon,
          state: 'pending',
          visitMinutes: spot.visitMinutes,
          driveMinutesFromPrevious: 30,
          distanceKmFromPrevious: undefined,
          statusLevel: 'unknown',
          statusReason: undefined,
        },
      });
    }

    const built = await buildRouteSummary(this.prisma, route.id);
    const result: Record<string, unknown> = { route: built, message: 'Route created.' };

    if (body.makeActiveToday) {
      const today = await this.todayService.getToday({ tripId, date: body.date ?? new Date().toISOString().split('T')[0] });
      result['today'] = today;
    }

    return result;
  }

  async updateRoute(routeId: string, body: {
    tripId?: string;
    title?: string;
    start?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    spotIds?: string[];
    direction?: 'ONE-WAY' | 'LOOP';
    expectedVersion?: number;
  }) {
    const route = await this.prisma.route.findFirst({ where: { id: routeId } });
    if (!route) throw new NotFoundException({ code: 'route_not_found', message: 'Route not found.' });
    if (body.expectedVersion && route.version !== body.expectedVersion) {
      throw new ConflictException({ code: 'version_conflict', message: 'Version mismatch.', details: { currentVersion: route.version } });
    }

    const update: Record<string, unknown> = { version: { increment: 1 } };
    if (body.title) update['title'] = body.title;
    if (body.direction) update['direction'] = body.direction === 'ONE-WAY' ? 'ONE_WAY' : 'LOOP';
    if (body.start?.location) { update['startLat'] = body.start.location.lat; update['startLon'] = body.start.location.lon; }
    if (body.start?.name) update['startName'] = body.start.name;

    if (body.spotIds) {
      await this.prisma.routeStop.deleteMany({ where: { routeId } });
      let position = 0;
      for (const spotId of body.spotIds) {
        const spot = await this.prisma.spot.findUnique({ where: { id: spotId }, include: { translations: true } });
        if (!spot) throw new NotFoundException({ code: 'spot_not_found', message: `Spot ${spotId} not found.` });
        await this.prisma.routeStop.create({
          data: {
            routeId,
            spotId,
            position: position++,
            title: spot.translations.find((t) => t.locale === 'en')?.name ?? spotId,
            lat: spot.lat,
            lon: spot.lon,
            state: 'pending',
            visitMinutes: spot.visitMinutes,
            driveMinutesFromPrevious: 30,
            distanceKmFromPrevious: undefined,
            statusLevel: 'unknown',
          },
        });
      }
      update['highestStatus'] = 'unknown';
    }

    await this.prisma.route.update({ where: { id: routeId }, data: update });
    const built = await buildRouteSummary(this.prisma, routeId);
    return { route: built, message: 'Route updated.' };
  }

  async addPlannedStop(routeId: string, body: {
    tripId?: string;
    spotId: string;
    position?: number | 'recommended' | 'end';
    allowUnsafe?: boolean;
    expectedVersion?: number;
  }) {
    const route = await this.prisma.route.findUnique({ where: { id: routeId }, include: { stops: STOP_ORDER } });
    if (!route) throw new NotFoundException({ code: 'route_not_found', message: 'Route not found.' });
    if (body.expectedVersion && route.version !== body.expectedVersion) {
      throw new ConflictException({ code: 'version_conflict', message: 'Version mismatch.', details: { currentVersion: route.version } });
    }

    const alreadyPresent = route.stops.some((s) => s.spotId === body.spotId);
    if (alreadyPresent) throw new ConflictException({ code: 'spot_already_in_route', message: 'Spot already in route.' });

    const spot = await this.prisma.spot.findUnique({ where: { id: body.spotId }, include: { translations: true } });
    if (!spot) throw new NotFoundException({ code: 'spot_not_found', message: `Spot ${body.spotId} not found.` });

    const insertPos = body.position === 'end' || body.position === undefined
      ? route.stops.length
      : body.position === 'recommended'
        ? Math.floor(route.stops.length / 2)
        : Number(body.position);

    for (const s of route.stops) {
      if (s.position >= insertPos) {
        await this.prisma.routeStop.update({ where: { id: s.id }, data: { position: s.position + 1 } });
      }
    }

    await this.prisma.routeStop.create({
      data: {
        routeId,
        spotId: body.spotId,
        position: insertPos,
        title: spot.translations.find((t) => t.locale === 'en')?.name ?? body.spotId,
        lat: spot.lat,
        lon: spot.lon,
        state: 'pending',
        visitMinutes: spot.visitMinutes,
        driveMinutesFromPrevious: 30,
        distanceKmFromPrevious: undefined,
        statusLevel: 'unknown',
        statusReason: undefined,
      },
    });

    await recalculateRoute(this.prisma, routeId);
    const built = await buildRouteSummary(this.prisma, routeId);
    return {
      route: built,
      addedDriveMinutes: 30,
      addedDistanceKm: 30,
      warnings: [],
      message: 'Stop added.',
    };
  }

  async removePlannedStop(routeId: string, stopId: string, query: { tripId?: string; expectedVersion?: string }) {
    const route = await this.prisma.route.findUnique({ where: { id: routeId }, include: { stops: STOP_ORDER } });
    if (!route) throw new NotFoundException({ code: 'route_not_found', message: 'Route not found.' });

    const stop = route.stops.find((s) => s.id === stopId);
    if (!stop) throw new NotFoundException({ code: 'stop_not_found', message: 'Stop not found.' });

    const nonSystemStops = route.stops.filter((s) => s.spotId);
    if (nonSystemStops.length <= 1) {
      throw new UnprocessableEntityException({ code: 'last_stop_required', message: 'Cannot remove the last stop from a route.' });
    }

    await this.prisma.routeStop.delete({ where: { id: stopId } });

    const remaining = route.stops.filter((s) => s.id !== stopId).sort((a, b) => a.position - b.position);
    for (let i = 0; i < remaining.length; i++) {
      await this.prisma.routeStop.update({ where: { id: remaining[i].id }, data: { position: i } });
    }

    await recalculateRoute(this.prisma, routeId);
    const built = await buildRouteSummary(this.prisma, routeId);
    return { route: built, message: 'Stop removed.' };
  }

  async routePreview(body: {
    tripId?: string;
    date?: string;
    start: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    mode: 'return' | 'one-way' | 'insert-spot' | 'edit-route';
    routeId?: string;
    spotIds?: string[];
    targetSpotId?: string;
    vehicle?: string;
    maxCandidates?: number;
  }, baseUrl?: string) {
    const tripId = body.tripId ?? this.getTripId();
    const spotIds = body.spotIds ?? (body.targetSpotId ? [body.targetSpotId] : []);

    const spotsData = await Promise.all(
      spotIds.map((id) => this.prisma.spot.findUnique({ where: { id }, include: SPOT_INCLUDE })),
    );

    const savedSpots = await this.prisma.savedSpot.findMany({ where: { tripId }, select: { spotId: true } });
    const savedIds = new Set(savedSpots.map((s) => s.spotId));

    const candidateStops = spotsData
      .filter(Boolean)
      .map((s) => mapSpot(s as any, savedIds.has(s!.id), undefined, baseUrl));

    const totalDrive = spotIds.length * 30;
    const totalVisit = spotsData.reduce((sum, s) => sum + (s?.visitMinutes ?? 30), 0);
    const routeName = spotIds.map((id) => spotsData.find((s) => s?.id === id)?.translations.find((t) => t.locale === 'en')?.name ?? id).slice(0, 2).join(' · ') + ' loop';

    return {
      title: routeName,
      directDriveMinutes: 30,
      totalDriveMinutes: totalDrive,
      totalTripMinutes: totalDrive + totalVisit,
      distanceKm: Math.round(totalDrive * 1.2),
      highestStatus: { level: 'unknown', label: 'Unknown', reason: '', updatedAt: new Date().toISOString(), sourceTimestamps: [] },
      recommendedStopIds: spotIds,
      candidateStops,
      routeStops: candidateStops.map((s) => ({
        id: `preview-${s.id}`,
        spotId: s.id,
        title: s.name,
        location: s.location,
        state: 'pending',
        driveMinutesFromPrevious: undefined,
        distanceKmFromPrevious: undefined,
        status: s.status,
      })),
      warnings: candidateStops.filter((s) => s.status.level !== 'green').map((s) => s.status.reason),
      daylightImpact: totalDrive > 200 ? 'tight' : 'ample',
    };
  }
}
