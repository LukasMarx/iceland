import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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

export const STOP_ORDER = { orderBy: { position: 'asc' as const } } as const;

export async function buildTodayResponse(
  prisma: PrismaService,
  route: any,
  tripId: string,
  date: string,
) {
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

export async function buildRouteSummary(prisma: PrismaService, routeId: string) {
  const route = await prisma.route.findUnique({
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

export async function recalculateRoute(prisma: PrismaService, routeId: string): Promise<void> {
  const stops = await prisma.routeStop.findMany({ where: { routeId }, orderBy: { position: 'asc' } });
  const totalDrive = stops.reduce((sum, s) => sum + (s.driveMinutesFromPrevious ?? 0), 0);
  const totalVisit = stops.reduce((sum, s) => sum + s.visitMinutes, 0);

  await prisma.route.update({
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
