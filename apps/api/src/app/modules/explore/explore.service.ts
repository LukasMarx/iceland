import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { DemoContextService } from '../../common/demo-context.service';
import { SEED_SPOTS, SEED_SPOT_MAP, SEED_CHECKED_AT } from '../../common/seed-spots';
import { mapSpot, buildSpotStatusForContext } from '../../common/spot-mapper';

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
export class ExploreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly demoContext: DemoContextService,
  ) {}

  async getExplore(query: {
    status?: string;
    category?: string;
    vehicle?: string;
    showFRoads?: string;
    maxDriveMinutes?: string;
    tripId?: string;
    date?: string;
    limit?: string;
    cursor?: string;
  }) {
    const tripId = query.tripId ?? this.demoContext.getTripId();
    const trip = await this.demoContext.resolveTrip(tripId);
    if (!trip?.activeHub) {
      throw new NotFoundException({ code: 'trip_not_found', message: 'No active trip or hub found.' });
    }

    const hub = trip.activeHub;
    const vehicle = (query.vehicle ?? trip.vehicle) as string;
    const showFRoads = query.showFRoads === 'true' || vehicle === 'car_4wd';
    const maxDrive = query.maxDriveMinutes ? Number(query.maxDriveMinutes) : undefined;
    const statusFilter = query.status ? query.status.split(',').filter(Boolean) : undefined;
    const categoryFilter = query.category ? query.category.split(',').filter(Boolean) : undefined;
    const limit = Math.min(Number(query.limit ?? 20), 50);

    const savedSpots = await this.prisma.savedSpot.findMany({
      where: { tripId },
      select: { spotId: true },
    });
    const savedSpotIds = new Set(savedSpots.map((s) => s.spotId));

    const where: Record<string, unknown> = { isPublished: true };
    if (!showFRoads) where['isFRoad'] = false;
    if (vehicle === 'car_2wd') {
      where['minVehicle'] = { in: ['car_2wd', 'unknown'] };
    }
    if (categoryFilter?.length) {
      where['categories'] = { some: { categoryId: { in: categoryFilter } } };
    }

    const spots = await this.prisma.spot.findMany({
      where,
      include: SPOT_INCLUDE,
      orderBy: [{ popularityScore: 'desc' }, { manualRank: 'asc' }],
      take: limit + 1,
    });

    const mapped = spots
      .map((s) => {
        const seed = SEED_SPOT_MAP.get(s.id);
        return mapSpot(s as any, savedSpotIds.has(s.id), seed?.driveMinutesFromHub);
      })
      .filter((s) => {
        if (statusFilter?.length && !statusFilter.includes(s.status.level)) return false;
        if (maxDrive && s.driveMinutesFromHub && s.driveMinutesFromHub > maxDrive) return false;
        return true;
      });

    const hasMore = mapped.length > limit;
    const page = mapped.slice(0, limit);

    const today = query.date ?? new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);
    const weekday = todayDate.toLocaleDateString('en-GB', { weekday: 'short' });
    const dayNum = todayDate.getDate();
    const month = todayDate.toLocaleDateString('en-GB', { month: 'short' });
    const dateLabel = `Today, ${weekday} ${dayNum} ${month}`;

    return {
      hub: { id: hub.id, placeId: hub.placeId, name: hub.name, type: hub.type, location: { lat: hub.lat, lon: hub.lon } },
      dateLabel,
      vehicle,
      dataAgeMinutes: 8,
      spots: page,
      smartRoutes: buildSmartRoutes(page, savedSpotIds),
      categories: await this.getCategories(),
      pageInfo: { hasMore, nextCursor: hasMore ? page.at(-1)?.id : undefined },
      map: { center: { lat: hub.lat, lon: hub.lon }, zoomHint: 9 },
    };
  }

  async getSpotContext(spotId: string, query: { tripId?: string; date?: string }) {
    const spot = await this.prisma.spot.findUnique({
      where: { id: spotId },
      include: SPOT_INCLUDE,
    });

    if (!spot) {
      throw new NotFoundException({ code: 'spot_not_found', message: `Spot ${spotId} not found.` });
    }

    const tripId = query.tripId ?? this.demoContext.getTripId();
    const savedSpots = await this.prisma.savedSpot.findMany({ where: { tripId }, select: { spotId: true } });
    const isSaved = savedSpots.some((s) => s.spotId === spotId);

    const seed = SEED_SPOT_MAP.get(spotId);
    const mappedSpot = mapSpot(spot as any, isSaved, seed?.driveMinutesFromHub);
    const { reasons } = buildSpotStatusForContext(spot as any);

    const level = mappedSpot.status.level;
    const primaryAction = level === 'green' || level === 'yellow'
      ? { code: 'add_to_today', label: level === 'yellow' ? 'Add to route anyway' : 'Add to today route', disabled: false }
      : level === 'red'
        ? { code: 'show_alternatives', label: 'Show safer alternatives', disabled: false }
        : { code: 'refresh_status', label: 'Refresh data', disabled: false };

    const secondaryAction = { code: 'plan_later', label: 'Plan for later', disabled: false };

    let alternatives: ReturnType<typeof mapSpot>[] = [];
    if (level === 'red' && seed) {
      const altSpots = await this.prisma.spot.findMany({
        where: {
          id: { not: spotId },
          isPublished: true,
          isFRoad: false,
        },
        include: SPOT_INCLUDE,
        take: 3,
      });
      alternatives = altSpots
        .filter((s) => {
          const altSeed = SEED_SPOT_MAP.get(s.id);
          return altSeed?.status === 'green';
        })
        .map((s) => {
          const altSeed = SEED_SPOT_MAP.get(s.id);
          return mapSpot(s as any, savedSpots.some((sv) => sv.spotId === s.id), altSeed?.driveMinutesFromHub);
        })
        .slice(0, 3);
    }

    return {
      spot: mappedSpot,
      primaryAction,
      secondaryAction,
      sourceSummary: `Wind · Veður.is, Road · Vegagerðin. Updated ${SEED_CHECKED_AT.slice(11, 16)}.`,
      alternatives: alternatives.length ? alternatives : undefined,
    };
  }

  async refreshSpotStatus(spotId: string, body: { tripId?: string; date?: string; force?: boolean }) {
    const spot = await this.prisma.spot.findUnique({ where: { id: spotId } });
    if (!spot) {
      throw new NotFoundException({ code: 'spot_not_found', message: `Spot ${spotId} not found.` });
    }

    const tripId = body.tripId ?? this.demoContext.getTripId();
    const now = new Date();

    const existing = await this.prisma.spotStatusSnapshot.findFirst({
      where: { spotId, tripId },
      orderBy: { calculatedAt: 'desc' },
      include: { sourceStamps: true },
    });

    const cacheWindowMinutes = 15;
    const fresh =
      !body.force &&
      existing &&
      now.getTime() - existing.calculatedAt.getTime() < cacheWindowMinutes * 60 * 1000;

    if (fresh && existing) {
      const seed = SEED_SPOT_MAP.get(spotId);
      const mapped = mapSpot({ ...spot, translations: [], categories: [], media: [], statusSnapshots: [{ ...existing, sourceStamps: existing.sourceStamps }] } as any);
      return {
        spot: mapped,
        refreshed: false,
        message: 'Status is current. Using cached snapshot.',
        sourceTimestamps: existing.sourceStamps.map((s) => ({
          source: s.source,
          label: s.label,
          checkedAt: s.checkedAt.toISOString(),
          validUntil: s.validUntil?.toISOString(),
        })),
      };
    }

    const seed = SEED_SPOT_MAP.get(spotId);
    const level = seed?.status ?? 'unknown';
    const snapshot = await this.prisma.spotStatusSnapshot.create({
      data: {
        spotId,
        tripId,
        vehicle: 'car_2wd',
        targetDate: new Date(body.date ?? now.toISOString().split('T')[0]),
        level,
        label: seed?.statusLabel ?? 'No data',
        reason: seed?.statusReason ?? 'Status not available.',
        reasons: seed?.statusReasons ?? [],
        calculatedAt: now,
        validUntil: new Date(now.getTime() + 60 * 60 * 1000),
        version: 1,
      },
      include: { sourceStamps: true },
    });

    const spotFull = await this.prisma.spot.findUnique({ where: { id: spotId }, include: SPOT_INCLUDE });
    const mapped = mapSpot(spotFull as any, undefined, seed?.driveMinutesFromHub);

    return {
      spot: mapped,
      refreshed: true,
      message: 'Status refreshed.',
      sourceTimestamps: [
        { source: 'weather', label: 'Veður.is', checkedAt: now.toISOString() },
        { source: 'road', label: 'Vegagerðin', checkedAt: now.toISOString() },
      ],
    };
  }

  private async getCategories() {
    const cats = await this.prisma.category.findMany({
      where: { isActive: true },
      include: { translations: { where: { locale: 'en' } } },
      orderBy: { sortOrder: 'asc' },
    });
    return cats.map((c) => ({
      id: c.id,
      label: c.translations[0]?.label ?? c.id,
      count: 0,
    }));
  }
}

function buildSmartRoutes(spots: ReturnType<typeof mapSpot>[], savedSpotIds: Set<string>) {
  const saved = spots.filter((s) => savedSpotIds.has(s.id) && s.status.level !== 'red');
  if (saved.length < 2) return [];

  const greenSpots = saved.filter((s) => s.status.level === 'green').slice(0, 4);
  const driveTotal = greenSpots.reduce((sum, s) => sum + (s.driveMinutesFromHub ?? 0), 0);

  if (greenSpots.length < 2) return [];

  return [
    {
      id: `smart-${greenSpots.map((s) => s.id).join('-')}`,
      title: `${greenSpots.map((s) => s.name).slice(0, 2).join(' · ')} loop`,
      reason: 'All selected spots are open today with good conditions.',
      spotIds: greenSpots.map((s) => s.id),
      driveMinutes: Math.round(driveTotal * 0.6),
      distanceKm: Math.round(driveTotal * 0.7),
      highestStatus: { level: 'green', label: 'All open', reason: 'All stops have green status.', updatedAt: SEED_CHECKED_AT, sourceTimestamps: [] },
    },
  ];
}
