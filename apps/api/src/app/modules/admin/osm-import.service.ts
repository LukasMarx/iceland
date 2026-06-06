import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma.service';

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  types: Record<string, number>;
}

interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[];
  } | null;
  properties: Record<string, unknown> | null;
}

interface GeoJsonCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

function tourismLabel(tag: string): string {
  const labels: Record<string, string> = {
    hotel: 'Hotel',
    guest_house: 'Gästehaus',
    hostel: 'Hostel',
    motel: 'Motel',
    chalet: 'Ferienhaus',
    apartment: 'Ferienwohnung',
    camp_site: 'Campingplatz',
    caravan_site: 'Wohnmobilstellplatz',
    wilderness_hut: 'Schutzhütte',
  };
  return labels[tag] ?? tag;
}

@Injectable()
export class OsmImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importFromGeoJson(geoJson: GeoJsonCollection): Promise<ImportResult> {
    if (!geoJson || geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
      throw new BadRequestException('Invalid GeoJSON: expected FeatureCollection');
    }

    const result: ImportResult = {
      total: geoJson.features.length,
      created: 0,
      updated: 0,
      skipped: 0,
      types: {},
    };

    for (const feature of geoJson.features) {
      const props = feature.properties ?? {};
      const osmId = props['@id'] as string | undefined;

      if (!osmId) {
        result.skipped++;
        continue;
      }

      const tagType = (props['tourism'] as string) || null;

      let lat: number | null = null;
      let lon: number | null = null;

      if (feature.geometry?.type === 'Point') {
        lon = feature.geometry.coordinates[0];
        lat = feature.geometry.coordinates[1];
      }

      if (lat == null || lon == null) {
        result.skipped++;
        continue;
      }

      const name =
        (props['name:en'] as string) ??
        (props['name:de'] as string) ??
        (props['name'] as string) ??
        `${tagType ? tourismLabel(tagType) : 'Unterkunft'} (${osmId})`;

      const region =
        (props['addr:city'] as string) ??
        (props['addr:region'] as string) ??
        null;

      const rawStars = props['stars'];
      const stars =
        rawStars != null
          ? Number(rawStars)
          : null;

      try {
        const place = await this.prisma.place.upsert({
          where: {
            source_sourceId: {
              source: 'osm',
              sourceId: osmId,
            },
          },
          create: {
            id: randomUUID(),
            source: 'osm',
            sourceId: osmId,
            type: 'hotel',
            name,
            region,
            countryCode: 'IS',
            lat,
            lon,
            metadata: {
              osmTags: props as any,
              tourism: tagType,
            } as any,
          },
          update: {
            name,
            region,
            lat,
            lon,
            metadata: {
              osmTags: props as any,
              tourism: tagType,
            } as any,
          },
        });

        await this.prisma.hotelProfile.upsert({
          where: { placeId: place.id },
          create: {
            placeId: place.id,
            stars: stars && stars > 0 && stars <= 5 ? stars : null,
          },
          update: {
            stars: stars && stars > 0 && stars <= 5 ? stars : null,
          },
        });

        if (!result.types[tagType ?? 'unknown']) {
          result.types[tagType ?? 'unknown'] = 0;
        }
        result.types[tagType ?? 'unknown']++;

        if (place.source === 'osm' && place.sourceId === osmId) {
          result.created++;
        } else {
          result.updated++;
        }
      } catch {
        result.skipped++;
      }
    }

    return result;
  }
}
