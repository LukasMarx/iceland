import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RequestContextService } from '../auth/request-context.service';
import { mapSpot } from '../../common/spot-mapper';
import { SPOT_INCLUDE, STOP_ORDER, buildTodayResponse, recalculateRoute } from '../../common/response-builder';

@Injectable()
export class TodayRouteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  private getTripId(): string {
    const id = this.requestContext.getTripId();
    if (!id) throw new NotFoundException({ code: 'trip_not_found', message: 'No active trip found.' });
    return id;
  }

  async getToday(query: { tripId?: string; date?: string }) {
    const tripId = query.tripId ?? this.getTripId();
    const date = query.date ?? new Date().toISOString().split('T')[0];

    const route = await this.prisma.route.findFirst({
      where: { tripId, lifecycle: 'active_today', date: new Date(date) },
      include: { stops: { ...STOP_ORDER, include: { spot: { include: SPOT_INCLUDE } } } },
    });

    if (!route) {
      throw new NotFoundException({ code: 'no_active_route', message: 'No active route for today.' });
    }

    return buildTodayResponse(this.prisma, route, tripId, date);
  }

  async createTodayRoute(body: {
    spotId?: string;
    routeId?: string;
    suggestionId?: string;
    tripId?: string;
    date?: string;
    replaceExisting?: boolean;
    expectedVersion?: number;
  }) {
    if (!body.spotId && !body.routeId && !body.suggestionId) {
      throw new BadRequestException('Provide spotId, routeId, or suggestionId.');
    }

    const tripId = body.tripId ?? this.getTripId();
    const date = body.date ?? new Date().toISOString().split('T')[0];

    const existing = await this.prisma.route.findFirst({
      where: { tripId, lifecycle: 'active_today', date: new Date(date) },
    });

    if (existing && !body.replaceExisting) {
      throw new ConflictException({ code: 'active_route_exists', message: 'An active route already exists. Set replaceExisting: true to replace it.' });
    }

    if (existing) {
      await this.prisma.route.update({ where: { id: existing.id }, data: { lifecycle: 'done', activeKey: null } });
    }

    const trip = await this.prisma.trip.findUniqueOrThrow({ where: { id: tripId }, include: { activeHub: true } });
    const hub = trip.activeHub;
    if (!hub) throw new NotFoundException({ code: 'hub_not_found', message: 'No active hub for this trip.' });

    if (body.spotId) {
      await this.createSpotRoute(body.spotId, tripId, date, hub);
    } else if (body.suggestionId) {
      await this.startSuggestionRoute(body.suggestionId, tripId, date, hub);
    } else {
      throw new BadRequestException('routeId-based today creation not yet implemented. Use spotId or suggestionId.');
    }

    const today = await this.getToday({ tripId, date });
    return { today };
  }

  async addTodayStop(body: {
    spotId: string;
    position: number | 'recommended' | 'end';
    tripId?: string;
    date?: string;
    allowUnsafe?: boolean;
    expectedVersion?: number;
  }) {
    const tripId = body.tripId ?? this.getTripId();
    const date = body.date ?? new Date().toISOString().split('T')[0];

    const route = await this.prisma.route.findFirst({
      where: { tripId, lifecycle: 'active_today', date: new Date(date) },
      include: { stops: STOP_ORDER },
    });

    if (!route) throw new NotFoundException({ code: 'no_active_route', message: 'No active today route.' });
    if (body.expectedVersion && route.version !== body.expectedVersion) {
      throw new ConflictException({ code: 'version_conflict', message: 'Version mismatch.', details: { currentVersion: route.version } });
    }

    const alreadyPresent = route.stops.some((s) => s.spotId === body.spotId);
    if (alreadyPresent) {
      throw new ConflictException({ code: 'spot_already_in_route', message: `Spot ${body.spotId} is already in this route.` });
    }

    const spot = await this.prisma.spot.findUnique({ where: { id: body.spotId }, include: { translations: true } });
    if (!spot) throw new NotFoundException({ code: 'spot_not_found', message: `Spot ${body.spotId} not found.` });

    const spotTranslation = spot.translations.find((t) => t.locale === 'en');
    const spotName = spotTranslation?.name ?? body.spotId;

    const stops = [...route.stops];
    let insertPosition: number;

    if (body.position === 'recommended') {
      const activeIdx = stops.findIndex((s) => s.state === 'active');
      insertPosition = activeIdx >= 0 ? activeIdx + 1 : stops.length;
    } else if (body.position === 'end') {
      insertPosition = stops.length;
    } else {
      insertPosition = Number(body.position);
    }

    for (const s of stops) {
      if (s.position >= insertPosition) {
        await this.prisma.routeStop.update({ where: { id: s.id }, data: { position: s.position + 1 } });
      }
    }

    await this.prisma.routeStop.create({
      data: {
        routeId: route.id,
        spotId: body.spotId,
        position: insertPosition,
        title: spotName,
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

    await recalculateRoute(this.prisma, route.id);
    const today = await this.getToday({ tripId, date });
    return { today };
  }

  async insertPreview(body: { spotId: string; tripId?: string; date?: string; positionMode?: string }, baseUrl?: string) {
    const tripId = body.tripId ?? this.getTripId();
    const date = body.date ?? new Date().toISOString().split('T')[0];

    const spot = await this.prisma.spot.findUnique({ where: { id: body.spotId }, include: SPOT_INCLUDE });
    if (!spot) throw new NotFoundException({ code: 'spot_not_found', message: `Spot ${body.spotId} not found.` });

    const route = await this.prisma.route.findFirst({
      where: { tripId, date: new Date(date) },
      orderBy: { version: 'desc' },
      include: { stops: { orderBy: { position: 'asc' } } },
    });

    if (!route) throw new NotFoundException({ code: 'no_active_route', message: 'No active today route.' });

    const alreadyPresent = route.stops.some((s) => s.spotId === body.spotId);
    if (alreadyPresent) {
      throw new ConflictException({ code: 'spot_already_in_route', message: `Spot ${body.spotId} is already in this route.` });
    }

    const activeIdx = route.stops.findIndex((s) => s.state === 'active');
    const recommendedAfterStopId = activeIdx >= 0 ? route.stops[activeIdx].id : route.stops.at(-1)?.id;
    const recommendedBeforeStopId = activeIdx >= 0 && activeIdx + 1 < route.stops.length
      ? route.stops[activeIdx + 1]?.id
      : undefined;

    const addedDrive = 20;

    const statusImpact = 'stays green';

    const daylightImpact: 'ample' | 'tight' | 'unknown' = 'ample';

    const savedSpots = await this.prisma.savedSpot.findMany({ where: { tripId }, select: { spotId: true } });
    const isSaved = savedSpots.some((s) => s.spotId === body.spotId);
    const mappedSpot = mapSpot(spot as any, isSaved, undefined, baseUrl);

    const previewStops = route.stops.map((s, i) => ({
      id: s.id,
      spotId: s.spotId ?? undefined,
      title: s.title,
      location: { lat: s.lat, lon: s.lon },
      state: s.state,
      driveMinutesFromPrevious: s.driveMinutesFromPrevious ?? undefined,
      distanceKmFromPrevious: s.distanceKmFromPrevious ?? undefined,
      status: { level: s.statusLevel, label: s.statusLevel as string, reason: s.statusReason ?? '', updatedAt: new Date().toISOString(), sourceTimestamps: [] },
    }));

    const spotName = spot.translations.find((t) => t.locale === 'en')?.name ?? body.spotId;
    const insertIdx = (activeIdx >= 0 ? activeIdx + 1 : previewStops.length);
    previewStops.splice(insertIdx, 0, {
      id: 'preview-new',
      spotId: body.spotId,
      title: spotName,
      location: { lat: spot.lat, lon: spot.lon },
      state: 'pending',
      driveMinutesFromPrevious: addedDrive,
      distanceKmFromPrevious: undefined,
      status: { level: 'unknown', label: 'No data', reason: '', updatedAt: new Date().toISOString(), sourceTimestamps: [] },
    });

    return {
      spot: mappedSpot,
      recommendedAfterStopId,
      recommendedBeforeStopId,
      addedDriveMinutes: addedDrive,
      addedDistanceKm: undefined,
      statusImpact,
      daylightImpact,
      warnings: [],
      previewStops,
    };
  }

  async markStopDone(stopId: string, body: { tripId?: string; date?: string; completedAt?: string; undo?: boolean; expectedVersion?: number }) {
    const tripId = body.tripId ?? this.getTripId();
    const date = body.date ?? new Date().toISOString().split('T')[0];

    const route = await this.prisma.route.findFirst({
      where: { tripId, lifecycle: 'active_today', date: new Date(date) },
      include: { stops: STOP_ORDER },
    });

    if (!route) throw new NotFoundException({ code: 'no_active_route', message: 'No active today route.' });

    const targetStop = stopId === 'active'
      ? route.stops.find((s) => s.state === 'active')
      : route.stops.find((s) => s.id === stopId);

    if (!targetStop) throw new NotFoundException({ code: 'stop_not_found', message: `Stop ${stopId} not found.` });

    if (body.undo) {
      await this.prisma.routeStop.update({ where: { id: targetStop.id }, data: { state: 'active', completedAt: null } });
      const prevActive = route.stops.find((s) => s.id !== targetStop!.id && s.state === 'active');
      if (prevActive) {
        await this.prisma.routeStop.update({ where: { id: prevActive.id }, data: { state: 'pending' } });
      }
    } else {
      await this.prisma.routeStop.update({
        where: { id: targetStop.id },
        data: { state: 'done', completedAt: body.completedAt ? new Date(body.completedAt) : new Date() },
      });
      const nextPending = route.stops.find((s) => s.position > targetStop!.position && s.state === 'pending');
      if (nextPending) {
        await this.prisma.routeStop.update({ where: { id: nextPending.id }, data: { state: 'active' } });
      }
    }

    await this.prisma.route.update({ where: { id: route.id }, data: { version: { increment: 1 } } });
    const today = await this.getToday({ tripId, date });
    return { today };
  }

  private async createSpotRoute(spotId: string, tripId: string, date: string, hub: { id: string; name: string; lat: number; lon: number }) {
    const spot = await this.prisma.spot.findUnique({ where: { id: spotId }, include: { translations: true } });
    if (!spot) throw new NotFoundException({ code: 'spot_not_found', message: `Spot ${spotId} not found.` });
    const name = spot.translations.find((t) => t.locale === 'en')?.name ?? spotId;

    const route = await this.prisma.route.create({
      data: {
        tripId,
        title: `${name} · out-and-back`,
        date: new Date(date),
        lifecycle: 'active_today',
        direction: 'LOOP',
        source: 'spot_action',
        startName: hub.name,
        startType: 'custom',
        startLat: hub.lat,
        startLon: hub.lon,
        totalDriveMinutes: 60,
        totalTripMinutes: 90,
        distanceKm: 80,
        highestStatus: 'unknown',
        activeKey: `${tripId}-today-${date}`,
        version: 1,
      },
    });

    await this.prisma.routeStop.create({
      data: {
        routeId: route.id,
        spotId,
        position: 0,
        title: name,
        lat: spot.lat,
        lon: spot.lon,
        state: 'active',
        visitMinutes: spot.visitMinutes,
        driveMinutesFromPrevious: 30,
        distanceKmFromPrevious: undefined,
        statusLevel: 'unknown',
        statusReason: undefined,
      },
    });

    return route;
  }

  private async startSuggestionRoute(suggestionId: string, tripId: string, date: string, hub: { id: string; name: string; lat: number; lon: number }) {
    const cached = await this.prisma.routeSuggestionCache.findFirst({
      where: { suggestionId, tripId, expiresAt: { gt: new Date() } },
    });

    if (!cached) throw new NotFoundException({ code: 'suggestion_expired', message: 'Suggestion not found or expired.' });

    const payload = cached.payload as { spotIds?: string[]; title?: string };
    const spotIds = payload.spotIds ?? [];

    const route = await this.prisma.route.create({
      data: {
        tripId,
        title: payload.title ?? 'Suggested route',
        date: new Date(date),
        lifecycle: 'active_today',
        direction: 'LOOP',
        source: 'suggestion',
        startName: hub.name,
        startType: 'custom',
        startLat: hub.lat,
        startLon: hub.lon,
        totalDriveMinutes: spotIds.length * 30,
        totalTripMinutes: spotIds.length * 60,
        distanceKm: spotIds.length * 30,
        highestStatus: 'unknown',
        activeKey: `${tripId}-today-${date}`,
        version: 1,
      },
    });

    for (let i = 0; i < spotIds.length; i++) {
      const spotId = spotIds[i];
      const spot = await this.prisma.spot.findUnique({ where: { id: spotId }, include: { translations: true } });
      if (!spot) continue;
      await this.prisma.routeStop.create({
        data: {
          routeId: route.id,
          spotId,
          position: i,
          title: spot.translations.find((t) => t.locale === 'en')?.name ?? spotId,
          lat: spot.lat,
          lon: spot.lon,
          state: i === 0 ? 'active' : 'pending',
          visitMinutes: spot.visitMinutes,
          driveMinutesFromPrevious: 30,
          distanceKmFromPrevious: undefined,
          statusLevel: 'unknown',
          statusReason: undefined,
        },
      });
    }

    return route;
  }
}
