import type { Spot as PrismaSpot, SpotTranslation, SpotCategory, MediaAsset, SpotStatusSnapshot, StatusSourceTimestamp } from '@prisma/client';
import { toImageUrl } from './image-url';

/**
 * Canonical Prisma include for loading a Spot with all relations needed
 * for mapping. Defined once here and shared by explore, routes, and
 * saved-spots services.
 */
export const SPOT_INCLUDE = {
  translations: true,
  categories: true,
  media: { orderBy: { sortOrder: 'asc' as const } },
  statusSnapshots: {
    include: { sourceStamps: true },
    orderBy: { calculatedAt: 'desc' as const },
    take: 1,
  },
} as const;

export type SpotWithRelations = PrismaSpot & {
  translations: SpotTranslation[];
  categories: (SpotCategory & { category?: { translations: { label: string; locale: string }[] } })[];
  media: MediaAsset[];
  statusSnapshots: (SpotStatusSnapshot & { sourceStamps: StatusSourceTimestamp[] })[];
};

export interface MappedSpot {
  id: string;
  name: string;
  categoryIds: string[];
  location: { lat: number; lon: number };
  region?: string;
  driveMinutesFromHub?: number;
  visitMinutes?: number;
  isFRoad: boolean;
  status: MappedSafetyStatus;
  isSaved?: boolean;
  media?: { id: string; type: string; url: string; thumbnailUrl?: string; alt: string; credit?: string }[];
}

export interface MappedSafetyStatus {
  level: string;
  label: string;
  reason: string;
  updatedAt: string;
  sourceTimestamps: { source: string; label: string; checkedAt: string; validUntil?: string }[];
}

export function mapSpot(spot: SpotWithRelations, isSaved?: boolean, driveMinutes?: number, baseUrl?: string): MappedSpot {
  const translation = spot.translations.find((t) => t.locale === 'en') ?? spot.translations[0];
  const name = translation?.name ?? spot.id;

  const latestSnapshot = spot.statusSnapshots
    .sort((a, b) => b.calculatedAt.getTime() - a.calculatedAt.getTime())
    .at(0);

  const status = latestSnapshot
    ? mapSnapshotToStatus(latestSnapshot)
    : fallbackStatus();

  const categoryIds = spot.categories.map((sc) => sc.categoryId);

  return {
    id: spot.id,
    name,
    categoryIds,
    location: { lat: spot.lat, lon: spot.lon },
    region: spot.region ?? undefined,
    driveMinutesFromHub: driveMinutes,
    visitMinutes: spot.visitMinutes,
    isFRoad: spot.isFRoad,
    status,
    isSaved,
    media: spot.media.map((m) => ({
      id: m.id,
      type: m.type.toLowerCase(),
      url: baseUrl ? toImageUrl(baseUrl, m.url) : m.url,
      thumbnailUrl: baseUrl ? toImageUrl(baseUrl, m.thumbnailUrl) : (m.thumbnailUrl ?? undefined),
      alt: m.alt,
      credit: m.credit ?? undefined,
    })),
  };
}

function mapSnapshotToStatus(
  snapshot: SpotStatusSnapshot & { sourceStamps: StatusSourceTimestamp[] },
): MappedSafetyStatus {
  return {
    level: snapshot.level,
    label: snapshot.label,
    reason: snapshot.reason,
    updatedAt: snapshot.calculatedAt.toISOString(),
    sourceTimestamps: snapshot.sourceStamps.map((s) => ({
      source: s.source,
      label: s.label,
      checkedAt: s.checkedAt.toISOString(),
      validUntil: s.validUntil?.toISOString(),
    })),
  };
}

function fallbackStatus(): MappedSafetyStatus {
  return {
    level: 'unknown',
    label: 'No data',
    reason: 'Status not available.',
    updatedAt: new Date().toISOString(),
    sourceTimestamps: [],
  };
}

export function buildSpotStatusForContext(spot: SpotWithRelations) {
  const latestSnapshot = spot.statusSnapshots
    .sort((a, b) => b.calculatedAt.getTime() - a.calculatedAt.getTime())
    .at(0);

  const reasons = latestSnapshot
    ? (Array.isArray(latestSnapshot.reasons) ? (latestSnapshot.reasons as string[]) : [latestSnapshot.reason])
    : [];

  return { reasons };
}
