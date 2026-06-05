import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';
import { mapSpot } from '../../common/spot-mapper';

const SPOT_INCLUDE = {
  translations: true,
  categories: true,
  media: { orderBy: { sortOrder: 'asc' as const } },
  statusSnapshots: {
    include: { sourceStamps: true },
    orderBy: { calculatedAt: 'desc' as const },
    take: 1,
  },
} as const;

const STOP_ORDER = { orderBy: { position: 'asc' as const } } as const;

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demoContext: DemoContextService,
  ) {}

  // ─── GET /today ──────────────────────────────────────────────────────────────

  async getToday(query: { tripId?: string; date?: string }) {
    const tripId = query.tripId ?? this.demoContext.getTripId();
    const date = query.date ?? new Date().toISOString().split('T')[0];

    const route = await this.prisma.route.findFirst({
      where: { tripId, lifecycle: 'active_today', date: new Date(date) },
      include: { stops: { ...STOP_ORDER, include: { spot: { include: SPOT_INCLUDE } } } },
    });

    if (!route) {
      throw new NotFoundException({ code: 'no_active_route', message: 'No active route for today.' });
    }

    return this.buildTodayResponse(route, tripId, date);
  }

  // ─── POST /routes/today ───────────────────────────────────────────────────────

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

    const tripId = body.tripId ?? this.demoContext.getTripId();
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

    let newRoute: Awaited<ReturnType<typeof this.prisma.route.create>>;

    if (body.spotId) {
      newRoute = await this.createSpotRoute(body.spotId, tripId, date, hub);
    } else if (body.suggestionId) {
      newRoute = await this.startSuggestionRoute(body.suggestionId, tripId, date, hub);
    } else {
      throw new BadRequestException('routeId-based today creation not yet implemented. Use spotId or suggestionId.');
    }

    const today = await this.getToday({ tripId, date });
    return { today };
  }

  // ─── POST /routes/today/stops ──────────────────────────────────────────────

  async addTodayStop(body: {
    spotId: string;
    position: number | 'recommended' | 'end';
    tripId?: string;
    date?: string;
    allowUnsafe?: boolean;
    expectedVersion?: number;
  }) {
    const tripId = body.tripId ?? this.demoContext.getTripId();
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

    await this.recalculateRoute(route.id);
    const today = await this.getToday({ tripId, date });
    return { today };
  }

  // ─── POST /routes/today/insert-preview ────────────────────────────────────

  async insertPreview(body: { spotId: string; tripId?: string; date?: string; positionMode?: string }, baseUrl?: string) {
    const tripId = body.tripId ?? this.demoContext.getTripId();
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

  // ─── PATCH /routes/today/stops/:stopId/done ────────────────────────────────

  async markStopDone(stopId: string, body: { tripId?: string; date?: string; completedAt?: string; undo?: boolean; expectedVersion?: number }) {
    const tripId = body.tripId ?? this.demoContext.getTripId();
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

  // ─── GET /routes/suggestions ──────────────────────────────────────────────

  async getRouteSuggestions(query: { tripId?: string; date?: string; limit?: string; cursor?: string }, baseUrl?: string) {
    const tripId = query.tripId ?? this.demoContext.getTripId();
    const date = query.date ?? new Date().toISOString().split('T')[0];
    const limit = Math.min(Number(query.limit ?? 20), 50);

    const trip = await this.prisma.trip.findFirst({ where: { id: tripId }, include: { activeHub: true } });
    const hub = trip?.activeHub;

    const savedRecords = await this.prisma.savedSpot.findMany({
      where: { tripId },
      include: { spot: { include: SPOT_INCLUDE } },
      orderBy: { sortOrder: 'asc' },
    });

    const savedSpots = savedRecords.map((r) => mapSpot(r.spot as any, true, undefined, baseUrl));

    const cached = await this.prisma.routeSuggestionCache.findMany({
      where: { tripId, date: new Date(date), expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    let suggestions: any[];
    if (cached.length > 0) {
      suggestions = cached.map((c) => ({
        suggestionId: c.suggestionId,
        route: c.payload,
        reason: c.reason,
        expiresAt: c.expiresAt.toISOString(),
      }));
    } else {
      suggestions = buildSuggestionsFromSavedSpots(savedSpots, hub, date, tripId);
      for (const s of suggestions) {
        await this.prisma.routeSuggestionCache.upsert({
          where: { suggestionId: s.suggestionId },
          create: {
            suggestionId: s.suggestionId,
            tripId,
            date: new Date(date),
            vehicle: 'car_2wd',
            payload: s.route,
            reason: s.reason,
            expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
          },
          update: {},
        });
      }
    }

    return { savedSpots, routes: suggestions.slice(0, limit), pageInfo: { hasMore: false } };
  }

  // ─── POST /routes/suggestions/start ──────────────────────────────────────

  async startSuggestedRoute(body: { suggestionId: string; tripId?: string; date?: string; replaceExisting?: boolean; expectedVersion?: number }) {
    const tripId = body.tripId ?? this.demoContext.getTripId();
    const date = body.date ?? new Date().toISOString().split('T')[0];

    const cached = await this.prisma.routeSuggestionCache.findFirst({
      where: { suggestionId: body.suggestionId, tripId, expiresAt: { gt: new Date() } },
    });

    if (!cached) {
      throw new NotFoundException({ code: 'suggestion_expired', message: 'Route suggestion not found or expired.' });
    }

    return this.createTodayRoute({
      suggestionId: body.suggestionId,
      tripId,
      date,
      replaceExisting: body.replaceExisting,
      expectedVersion: body.expectedVersion,
    });
  }

  // ─── POST /routes ─────────────────────────────────────────────────────────

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
    const tripId = body.tripId ?? this.demoContext.getTripId();
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

    const built = await this.buildRouteSummary(route.id);
    const result: Record<string, unknown> = { route: built, message: 'Route created.' };

    if (body.makeActiveToday) {
      const today = await this.getToday({ tripId, date: body.date ?? new Date().toISOString().split('T')[0] });
      result['today'] = today;
    }

    return result;
  }

  // ─── PATCH /routes/:routeId ───────────────────────────────────────────────

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
    const built = await this.buildRouteSummary(routeId);
    return { route: built, message: 'Route updated.' };
  }

  // ─── POST /routes/:routeId/stops ──────────────────────────────────────────

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

    await this.recalculateRoute(routeId);
    const built = await this.buildRouteSummary(routeId);
    return {
      route: built,
      addedDriveMinutes: 30,
      addedDistanceKm: 30,
      warnings: [],
      message: 'Stop added.',
    };
  }

  // ─── DELETE /routes/:routeId/stops/:stopId ────────────────────────────────

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

    await this.recalculateRoute(routeId);
    const built = await this.buildRouteSummary(routeId);
    return { route: built, message: 'Stop removed.' };
  }

  // ─── POST /routes/preview ─────────────────────────────────────────────────

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
    const tripId = body.tripId ?? this.demoContext.getTripId();
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

  // ─── Private helpers ──────────────────────────────────────────────────────

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

  private async buildTodayResponse(route: any, tripId: string, date: string) {
    const stops = route.stops ?? [];
    const doneCount = stops.filter((s: any) => s.state === 'done').length;
    const totalStops = stops.length;
    const activeStop = stops.find((s: any) => s.state === 'active');
    const nextStop = stops.find((s: any) => s.state === 'pending');

    const daylightLeft = computeDaylightLeft(date);
    const tripDate = new Date(date);

    const update = activeStop
      ? `${activeStop.statusLevel === 'yellow' ? `${activeStop.title} wind gusts rising. Still passable.` : `${activeStop.title} is next.`}`
      : nextStop
        ? `${nextStop.title} is next.`
        : 'All stops complete. Return to hub.';

    return {
      tripId,
      date,
      title: route.title,
      dateLabel: `Today, ${tripDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`,
      checkedAt: new Date().toISOString(),
      recheckedMinutesAgo: 8,
      stopProgress: `${doneCount}/${totalStops}`,
      driveMinutes: route.totalDriveMinutes,
      daylightLeftMinutes: daylightLeft,
      daylightLeftLabel: formatMinutes(daylightLeft),
      update,
      stops: stops.map((s: any) => ({
        id: s.id,
        spotId: s.spotId ?? undefined,
        title: s.title,
        location: { lat: s.lat, lon: s.lon },
        state: s.state,
        arriveAt: s.arriveAt?.toISOString(),
        departAt: s.departAt?.toISOString(),
        completedAt: s.completedAt?.toISOString(),
        driveMinutesFromPrevious: s.driveMinutesFromPrevious ?? undefined,
        distanceKmFromPrevious: s.distanceKmFromPrevious ?? undefined,
        status: {
          level: s.statusLevel,
          label: s.statusLevel === 'green' ? 'Open' : s.statusLevel === 'yellow' ? 'Caution' : s.statusLevel === 'red' ? 'Closed' : 'No data',
          reason: s.statusReason ?? '',
          updatedAt: new Date().toISOString(),
          sourceTimestamps: [],
        },
      })),
      version: route.version,
    };
  }

  private async buildRouteSummary(routeId: string) {
    const route = await this.prisma.route.findUnique({
      where: { id: routeId },
      include: { stops: STOP_ORDER },
    });
    if (!route) throw new NotFoundException('Route not found.');

    return {
      id: route.id,
      title: route.title,
      date: route.date?.toISOString().split('T')[0],
      direction: route.direction === 'ONE_WAY' ? 'ONE-WAY' : 'LOOP',
      stopIds: route.stops.map((s) => s.id),
      stops: route.stops.map((s) => ({
        id: s.id,
        spotId: s.spotId ?? undefined,
        title: s.title,
        location: { lat: s.lat, lon: s.lon },
        state: s.state,
        driveMinutesFromPrevious: s.driveMinutesFromPrevious ?? undefined,
        distanceKmFromPrevious: s.distanceKmFromPrevious ?? undefined,
        status: { level: s.statusLevel, label: s.statusLevel, reason: s.statusReason ?? '', updatedAt: new Date().toISOString(), sourceTimestamps: [] },
      })),
      totalDriveMinutes: route.totalDriveMinutes,
      totalTripMinutes: route.totalTripMinutes,
      distanceKm: route.distanceKm,
      highestStatus: { level: route.highestStatus, label: route.highestStatus, reason: route.statusReason ?? '', updatedAt: new Date().toISOString(), sourceTimestamps: [] },
      version: route.version,
    };
  }

  private async recalculateRoute(routeId: string): Promise<void> {
    const stops = await this.prisma.routeStop.findMany({ where: { routeId }, orderBy: { position: 'asc' } });
    const totalDrive = stops.reduce((sum, s) => sum + (s.driveMinutesFromPrevious ?? 0), 0);
    const totalVisit = stops.reduce((sum, s) => sum + s.visitMinutes, 0);

    await this.prisma.route.update({
      where: { id: routeId },
      data: {
        totalDriveMinutes: totalDrive,
        totalTripMinutes: totalDrive + totalVisit,
        distanceKm: totalDrive * 1.2,
        highestStatus: 'unknown',
        version: { increment: 1 },
      },
    });
  }
}

function buildSuggestionsFromSavedSpots(spots: any[], hub: any, date: string, tripId: string) {
  const open = spots.filter((s) => s.status.level === 'green' || s.status.level === 'yellow');
  if (open.length < 2) return [];

  const groups = [
    open.slice(0, 4),
    open.filter((s: any) => s.status.level === 'green').slice(0, 3),
  ].filter((g) => g.length >= 2);

  return groups.map((g, i) => ({
    suggestionId: `suggestion-${tripId}-${date}-${i}`,
    route: {
      id: `suggestion-${tripId}-${date}-${i}`,
      title: `${g.slice(0, 2).map((s: any) => s.name).join(' · ')} loop`,
      date,
      start: hub ? { id: hub.id, name: hub.name, type: hub.type, location: { lat: hub.lat, lon: hub.lon } } : null,
      direction: 'LOOP',
      stops: g.map((s: any, j: number) => ({
        id: `suggestion-stop-${j}`,
        spotId: s.id,
        title: s.name,
        location: s.location,
        state: 'pending',
        driveMinutesFromPrevious: s.driveMinutesFromHub,
        status: s.status,
      })),
      stopIds: g.map((s: any) => `suggestion-stop-${i}`),
      spotIds: g.map((s: any) => s.id),
      totalDriveMinutes: g.reduce((sum: number, s: any) => sum + (s.driveMinutesFromHub ?? 30), 0),
      totalTripMinutes: g.reduce((sum: number, s: any) => sum + (s.driveMinutesFromHub ?? 30) + (s.visitMinutes ?? 30), 0),
      distanceKm: g.reduce((sum: number, s: any) => sum + ((s.driveMinutesFromHub ?? 30) * 1.2), 0),
      highestStatus: { level: g.some((s: any) => s.status.level === 'yellow') ? 'yellow' : 'green', label: 'Open', reason: '', updatedAt: new Date().toISOString(), sourceTimestamps: [] },
      version: 1,
    },
    reason: i === 0 ? 'Best match from your saved spots today.' : 'All open spots for a shorter day.',
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  }));
}

function computeDaylightLeft(date: string): number {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  if (month >= 5 && month <= 7) return 14 * 60 + 32;
  if (month >= 3 && month <= 9) return 12 * 60;
  return 6 * 60;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}` : `${h}h`;
}
