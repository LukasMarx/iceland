import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { toImageUrl } from '../../common/image-url';

@Injectable()
export class PlacesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async searchPlaces(query: { q?: string; type?: string; locale?: string; limit?: string; cursor?: string }) {
    const limit = Math.min(Number(query.limit ?? 10), 30);
    const q = query.q?.trim().toLowerCase();

    const places = await this.prisma.place.findMany({
      where: {
        ...(query.type ? { type: query.type as any } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { region: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      take: limit + 1,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        region: true,
        lat: true,
        lon: true,
        countryCode: true,
      },
    });

    const hasMore = places.length > limit;
    const page = places.slice(0, limit);

    return {
      suggestions: page.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        region: p.region,
        countryCode: p.countryCode,
        location: { lat: p.lat, lon: p.lon },
      })),
      pageInfo: { hasMore, nextCursor: hasMore ? page.at(-1)?.id : undefined },
    };
  }

  async searchHotels(query: { q?: string; lat?: string; lon?: string; radiusKm?: string; stars?: string; locale?: string; limit?: string; cursor?: string }, baseUrl?: string) {
    const limit = Math.min(Number(query.limit ?? 10), 30);
    const q = query.q?.trim().toLowerCase();

    const hotels = await this.prisma.place.findMany({
      where: {
        type: 'hotel',
        hotelProfile: { isNot: null },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { region: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(query.stars ? { hotelProfile: { stars: { gte: Number(query.stars) } } } : {}),
      },
      take: limit + 1,
      orderBy: { name: 'asc' },
      include: {
        hotelProfile: { select: { stars: true, bookingState: true, bookingUrl: true } },
        media: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    });

    const hasMore = hotels.length > limit;
    const page = hotels.slice(0, limit);

    return {
      suggestions: page.map((h) => ({
        id: h.id,
        name: h.name,
        region: h.region,
        countryCode: h.countryCode,
        location: { lat: h.lat, lon: h.lon },
        stars: h.hotelProfile?.stars ?? null,
        bookingState: h.hotelProfile?.bookingState ?? 'unknown',
        bookingUrl: h.hotelProfile?.bookingUrl ?? null,
        heroImage: h.media[0]?.url ? toImageUrl(baseUrl ?? '', h.media[0].url) : null,
      })),
      pageInfo: { hasMore, nextCursor: hasMore ? page.at(-1)?.id : undefined },
    };
  }
}
