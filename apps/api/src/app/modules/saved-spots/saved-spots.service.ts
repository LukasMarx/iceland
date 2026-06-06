import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { RequestContextService } from '../auth/request-context.service';
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

@Injectable()
export class SavedSpotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requestContext: RequestContextService,
  ) {}

  private getTripId(): string {
    const id = this.requestContext.getTripId();
    if (!id) throw new NotFoundException({ code: 'trip_not_found', message: 'No active trip found.' });
    return id;
  }

  async getSavedSpots(query: { tripId?: string; limit?: string; cursor?: string }, baseUrl?: string) {
    const tripId = query.tripId ?? this.getTripId();
    const limit = Math.min(Number(query.limit ?? 20), 50);

    const trip = await this.prisma.trip.findFirst({ where: { id: tripId } });
    if (!trip) throw new NotFoundException({ code: 'trip_not_found', message: 'Trip not found.' });

    const savedRecords = await this.prisma.savedSpot.findMany({
      where: { tripId },
      include: { spot: { include: SPOT_INCLUDE } },
      orderBy: { sortOrder: 'asc' },
      take: limit + 1,
    });

    const hasMore = savedRecords.length > limit;
    const page = savedRecords.slice(0, limit);
    const savedSpotIds = savedRecords.map((r) => r.spotId);

    const spots = page.map((r) => mapSpot(r.spot as any, true, undefined, baseUrl));

    return {
      savedSpotIds,
      spots,
      pageInfo: { hasMore, nextCursor: hasMore ? page.at(-1)?.spotId : undefined },
    };
  }

  async saveSpot(body: { spotId: string; tripId?: string }, baseUrl?: string) {
    const tripId = body.tripId ?? this.getTripId();

    const spot = await this.prisma.spot.findUnique({ where: { id: body.spotId }, include: SPOT_INCLUDE });
    if (!spot) throw new NotFoundException({ code: 'spot_not_found', message: `Spot ${body.spotId} not found.` });

    const trip = await this.prisma.trip.findFirst({ where: { id: tripId } });
    if (!trip) throw new NotFoundException({ code: 'trip_not_found', message: 'Trip not found.' });

    await this.prisma.savedSpot.upsert({
      where: { tripId_spotId: { tripId, spotId: body.spotId } },
      create: { tripId, spotId: body.spotId },
      update: {},
    });

    const allSaved = await this.prisma.savedSpot.findMany({ where: { tripId }, select: { spotId: true } });
    const savedSpotIds = allSaved.map((s) => s.spotId);
    const mappedSpot = mapSpot(spot as any, true, undefined, baseUrl);

    const name = spot.translations.find((t) => t.locale === 'en')?.name ?? body.spotId;
    return {
      spot: mappedSpot,
      savedSpotIds,
      message: `${name} saved to your trip list.`,
    };
  }

  async unsaveSpot(spotId: string, query: { tripId?: string }) {
    const tripId = query.tripId ?? this.getTripId();

    const trip = await this.prisma.trip.findFirst({ where: { id: tripId } });
    if (!trip) throw new NotFoundException({ code: 'trip_not_found', message: 'Trip not found.' });

    const spot = await this.prisma.spot.findUnique({ where: { id: spotId }, include: { translations: true } });
    if (!spot) throw new NotFoundException({ code: 'spot_not_found', message: `Spot ${spotId} not found.` });

    await this.prisma.savedSpot.deleteMany({ where: { tripId, spotId } });

    const allSaved = await this.prisma.savedSpot.findMany({ where: { tripId }, select: { spotId: true } });
    const name = spot.translations.find((t) => t.locale === 'en')?.name ?? spotId;
    return {
      savedSpotIds: allSaved.map((s) => s.spotId),
      message: `${name} removed from saved spots.`,
    };
  }
}
