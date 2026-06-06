import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../prisma.service';
import { toImageUrl } from '../../common/image-url';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'spots');

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureUploadsDir(): void {
    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  private resolveMedia(media: Array<{ url: string; thumbnailUrl: string | null; [key: string]: unknown }>, baseUrl: string) {
    return media.map((m) => ({
      ...m,
      url: toImageUrl(baseUrl, m.url as string),
      thumbnailUrl: toImageUrl(baseUrl, m.thumbnailUrl as string | null),
    }));
  }

  private resolveSpotMedia(spot: Record<string, unknown>, baseUrl: string) {
    if (spot['media'] && Array.isArray(spot['media'])) {
      spot['media'] = this.resolveMedia(spot['media'] as any[], baseUrl);
    }
    return spot;
  }

  async listSpots(page: number, limit: number, search?: string, baseUrl?: string) {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where['translations'] = {
        some: {
          name: { contains: search, mode: 'insensitive' },
        },
      };
    }

    const [spots, total] = await Promise.all([
      this.prisma.spot.findMany({
        where,
        include: {
          translations: true,
          media: {
            select: { id: true, url: true, thumbnailUrl: true, sortOrder: true, alt: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.spot.count({ where }),
    ]);

    const mapped = spots.map((spot) => {
      const defaultTranslation = spot.translations.find(
        (t) => t.locale === spot.defaultLocale,
      ) ?? spot.translations[0];

      return {
        id: spot.id,
        slug: spot.slug,
        name: defaultTranslation?.name ?? '',
        region: spot.region,
        isPublished: spot.isPublished,
        createdAt: spot.createdAt.toISOString(),
        images: baseUrl ? this.resolveMedia(spot.media, baseUrl) : spot.media,
      };
    });

    return { spots: mapped, total, page };
  }

  async getSpot(id: string, baseUrl?: string) {
    const spot = await this.prisma.spot.findUnique({
      where: { id },
      include: {
        translations: true,
        media: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!spot) {
      throw new NotFoundException('Spot not found');
    }

    return baseUrl ? this.resolveSpotMedia(spot as any, baseUrl) : spot;
  }

  async createSpot(data: Record<string, unknown>) {
    const {
      slug,
      region,
      lat,
      lon,
      defaultLocale,
      visitMinutes,
      minVehicle,
      isFRoad,
      isPublished,
      translations,
    } = data;

    const spot = await this.prisma.spot.create({
      data: {
        id: randomUUID(),
        slug: slug as string,
        region: region as string | undefined,
        lat: lat as number,
        lon: lon as number,
        defaultLocale: (defaultLocale as 'en' | 'de' | 'is') ?? 'en',
        visitMinutes: (visitMinutes as number) ?? 30,
        minVehicle: (minVehicle as 'car_2wd' | 'car_4wd' | 'unknown') ?? 'car_2wd',
        isFRoad: (isFRoad as boolean) ?? false,
        isPublished: (isPublished as boolean) ?? false,
        translations: {
          create: (translations as Array<Record<string, unknown>>)?.map((t) => ({
            locale: t.locale as 'en' | 'de' | 'is',
            name: t.name as string,
            shortDescription: t.shortDescription as string | undefined,
            longDescription: t.longDescription as string | undefined,
            safetyNotes: t.safetyNotes as string | undefined,
          })),
        },
      },
      include: { translations: true },
    });

    return spot;
  }

  async updateSpot(id: string, data: Record<string, unknown>, baseUrl?: string) {
    const {
      slug,
      region,
      lat,
      lon,
      defaultLocale,
      visitMinutes,
      minVehicle,
      isFRoad,
      isPublished,
      translations,
    } = data;

    const updateData: Record<string, unknown> = {};
    if (slug !== undefined) updateData['slug'] = slug;
    if (region !== undefined) updateData['region'] = region;
    if (lat !== undefined) updateData['lat'] = lat;
    if (lon !== undefined) updateData['lon'] = lon;
    if (defaultLocale !== undefined) updateData['defaultLocale'] = defaultLocale;
    if (visitMinutes !== undefined) updateData['visitMinutes'] = visitMinutes;
    if (minVehicle !== undefined) updateData['minVehicle'] = minVehicle;
    if (isFRoad !== undefined) updateData['isFRoad'] = isFRoad;
    if (isPublished !== undefined) updateData['isPublished'] = isPublished;

    if (translations && Array.isArray(translations)) {
      for (const t of translations as Array<Record<string, unknown>>) {
        await this.prisma.spotTranslation.upsert({
          where: {
            spotId_locale: {
              spotId: id,
              locale: t.locale as 'en' | 'de' | 'is',
            },
          },
          update: {
            name: t.name as string,
            shortDescription: t.shortDescription as string | undefined,
            longDescription: t.longDescription as string | undefined,
            safetyNotes: t.safetyNotes as string | undefined,
          },
          create: {
            spotId: id,
            locale: t.locale as 'en' | 'de' | 'is',
            name: t.name as string,
            shortDescription: t.shortDescription as string | undefined,
            longDescription: t.longDescription as string | undefined,
            safetyNotes: t.safetyNotes as string | undefined,
          },
        });
      }
    }

    const spot = await this.prisma.spot.update({
      where: { id },
      data: updateData,
      include: {
        translations: true,
        media: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return baseUrl ? this.resolveSpotMedia(spot as any, baseUrl) : spot;
  }

  async deleteSpot(id: string) {
    await this.prisma.spot.delete({ where: { id } });
    return { id, deleted: true };
  }

  async uploadSpotImages(spotId: string, files: Array<Express.Multer.File>, baseUrl?: string) {
    const spot = await this.prisma.spot.findUnique({ where: { id: spotId } });
    if (!spot) {
      throw new NotFoundException('Spot not found');
    }

    this.ensureUploadsDir();

    const maxSortOrder = await this.prisma.mediaAsset.aggregate({
      where: { spotId },
      _max: { sortOrder: true },
    });
    let nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

    const created = await Promise.all(
      files.map((file) =>
        this.prisma.mediaAsset.create({
          data: {
            type: 'image',
            url: `/uploads/spots/${file.filename}`,
            thumbnailUrl: `/uploads/spots/${file.filename}`,
            alt: file.originalname.replace(/\.[^/.]+$/, ''),
            sortOrder: nextSortOrder++,
            spotId,
          },
        }),
      ),
    );

    return baseUrl ? this.resolveMedia(created, baseUrl) : created;
  }

  async deleteSpotImage(spotId: string, imageId: string) {
    const image = await this.prisma.mediaAsset.findFirst({
      where: { id: imageId, spotId },
    });
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const filename = image.url.split('/').pop();
    if (filename) {
      const filePath = join(UPLOADS_DIR, filename);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    }

    await this.prisma.mediaAsset.delete({ where: { id: imageId } });
    return { id: imageId, deleted: true };
  }

  async listPlaces(page: number, limit: number, search?: string, source?: string) {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      type: 'hotel',
    };

    if (source) {
      where['source'] = source;
    }

    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [places, total] = await Promise.all([
      this.prisma.place.findMany({
        where,
        include: {
          hotelProfile: {
            select: { stars: true, bookingState: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.place.count({ where }),
    ]);

    const mapped = places.map((p) => ({
      id: p.id,
      name: p.name,
      source: p.source,
      sourceId: p.sourceId,
      region: p.region,
      lat: p.lat,
      lon: p.lon,
      tourismType: (p.metadata as Record<string, unknown> | null)?.tourism ?? null,
      stars: p.hotelProfile?.stars ?? null,
      bookingState: p.hotelProfile?.bookingState ?? 'unknown',
      createdAt: p.createdAt.toISOString(),
    }));

    return { places: mapped, total, page };
  }

  async deletePlace(id: string) {
    await this.prisma.place.delete({ where: { id } });
    return { id, deleted: true };
  }

  async reorderSpotImages(spotId: string, imageIds: string[], baseUrl?: string) {
    const existing = await this.prisma.mediaAsset.count({
      where: { id: { in: imageIds }, spotId },
    });
    if (existing !== imageIds.length) {
      throw new BadRequestException('Some image IDs do not belong to this spot');
    }

    await Promise.all(
      imageIds.map((id, index) =>
        this.prisma.mediaAsset.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    const images = await this.prisma.mediaAsset.findMany({
      where: { spotId },
      orderBy: { sortOrder: 'asc' },
    });

    return baseUrl ? this.resolveMedia(images, baseUrl) : images;
  }
}