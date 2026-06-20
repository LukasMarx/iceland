import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RequestContextService } from '../auth/request-context.service';
import { mapSpot } from '../../common/spot-mapper';
import { SPOT_INCLUDE } from '../../common/response-builder';
import { TodayRouteService } from '../today/today.service';

@Injectable()
export class SuggestionService {
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

  async getRouteSuggestions(query: { tripId?: string; date?: string; limit?: string; cursor?: string }, baseUrl?: string) {
    const tripId = query.tripId ?? this.getTripId();
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

  async startSuggestedRoute(body: { suggestionId: string; tripId?: string; date?: string; replaceExisting?: boolean; expectedVersion?: number }) {
    const tripId = body.tripId ?? this.getTripId();
    const date = body.date ?? new Date().toISOString().split('T')[0];

    const cached = await this.prisma.routeSuggestionCache.findFirst({
      where: { suggestionId: body.suggestionId, tripId, expiresAt: { gt: new Date() } },
    });

    if (!cached) {
      throw new NotFoundException({ code: 'suggestion_expired', message: 'Route suggestion not found or expired.' });
    }

    return this.todayService.createTodayRoute({
      suggestionId: body.suggestionId,
      tripId,
      date,
      replaceExisting: body.replaceExisting,
      expectedVersion: body.expectedVersion,
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
