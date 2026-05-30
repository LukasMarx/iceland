import type { Spot as PrismaSpot, SpotTranslation, SpotCategory, MediaAsset, SpotStatusSnapshot, StatusSourceTimestamp } from '@prisma/client';
import { SEED_SPOT_MAP, SEED_CHECKED_AT, SEED_VALID_UNTIL } from './seed-spots';

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

export function mapSpot(spot: SpotWithRelations, isSaved?: boolean, driveMinutesFromHub?: number): MappedSpot {
  const translation = spot.translations.find((t) => t.locale === 'en') ?? spot.translations[0];
  const name = translation?.name ?? spot.id;

  const latestSnapshot = spot.statusSnapshots
    .sort((a, b) => b.calculatedAt.getTime() - a.calculatedAt.getTime())
    .at(0);

  const status = latestSnapshot
    ? mapSnapshotToStatus(latestSnapshot)
    : fallbackStatus(spot.id);

  const categoryIds = spot.categories.map((sc) => sc.categoryId);

  return {
    id: spot.id,
    name,
    categoryIds,
    location: { lat: spot.lat, lon: spot.lon },
    region: spot.region ?? undefined,
    driveMinutesFromHub: driveMinutesFromHub ?? SEED_SPOT_MAP.get(spot.id)?.driveMinutesFromHub,
    visitMinutes: spot.visitMinutes,
    isFRoad: spot.isFRoad,
    status,
    isSaved,
    media: spot.media.map((m) => ({
      id: m.id,
      type: m.type.toLowerCase(),
      url: m.url,
      thumbnailUrl: m.thumbnailUrl ?? undefined,
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

function fallbackStatus(spotId: string): MappedSafetyStatus {
  const seed = SEED_SPOT_MAP.get(spotId);
  if (seed) {
    return {
      level: seed.status,
      label: seed.statusLabel,
      reason: seed.statusReason,
      updatedAt: SEED_CHECKED_AT,
      sourceTimestamps: [
        { source: 'weather', label: 'Veður.is', checkedAt: SEED_CHECKED_AT, validUntil: SEED_VALID_UNTIL },
        { source: 'road', label: 'Vegagerðin', checkedAt: SEED_CHECKED_AT, validUntil: SEED_VALID_UNTIL },
      ],
    };
  }
  return {
    level: 'unknown',
    label: 'No data',
    reason: 'Status not available.',
    updatedAt: SEED_CHECKED_AT,
    sourceTimestamps: [],
  };
}

export function buildSpotStatusForContext(spot: SpotWithRelations) {
  const latestSnapshot = spot.statusSnapshots
    .sort((a, b) => b.calculatedAt.getTime() - a.calculatedAt.getTime())
    .at(0);

  const seed = SEED_SPOT_MAP.get(spot.id);
  const reasons = latestSnapshot
    ? (Array.isArray(latestSnapshot.reasons) ? (latestSnapshot.reasons as string[]) : [latestSnapshot.reason])
    : (seed?.statusReasons ?? []);

  return { reasons, seed };
}
