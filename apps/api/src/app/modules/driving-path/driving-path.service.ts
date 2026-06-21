import { Injectable, Inject } from '@nestjs/common';
import type { DrivingPathRequest, DrivingPathResponse, GeoPoint, VehicleProfile } from '@islandhub/domain';
import { PrismaService } from '../../prisma.service';
import type { RoutingProvider } from './routing-provider.interface';
import { ROUTING_PROVIDER } from './routing-provider.interface';

/** Rounding precision for coordinate-based cache keys (~11 m). */
const COORD_ROUND_DECIMALS = 4;

/** Douglas-Peucker simplification tolerance in meters. */
const SIMPLIFICATION_TOLERANCE_M = 15;

/** Cache TTL: entries expire 7 days after creation. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Default vehicle profile when none is supplied. */
const DEFAULT_VEHICLE: VehicleProfile = 'car_2wd';

@Injectable()
export class DrivingPathService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ROUTING_PROVIDER) private readonly routingProvider: RoutingProvider,
  ) {}

  /**
   * Resolves a driving path for the given request.
   *
   * Pipeline: cache lookup → provider call (on miss) →
   * Douglas-Peucker simplification → cache write → response.
   */
  async getDrivingPath(request: DrivingPathRequest): Promise<DrivingPathResponse> {
    const vehicle = request.vehicle ?? DEFAULT_VEHICLE;
    const cacheKey = buildCacheKey(request.start, request.end, vehicle);

    // 1. Cache lookup
    const cached = await this.prisma.drivingPathCache.findUnique({
      where: { cacheKey },
    });

    if (cached && cached.validUntil > new Date()) {
      const coordinates = await this.readGeometryFromCache(cacheKey);
      return assembleResponse(cached, coordinates);
    }

    // 2. Provider call
    const result = await this.routingProvider.getRoute(
      request.start,
      request.end,
      vehicle,
    );

    if (result.kind === 'no_route') {
      // Return empty result without caching
      return {
        coordinates: [],
        driveMinutes: 0,
        distanceKm: 0,
        warnings: [],
      };
    }

    // 3. Simplify geometry
    const simplified = simplifyDouglasPeucker(
      result.coordinates,
      SIMPLIFICATION_TOLERANCE_M,
    );

    // 4. Cache write (upsert to handle concurrent writes gracefully)
    const validUntil = new Date(Date.now() + CACHE_TTL_MS);
    await this.prisma.drivingPathCache.upsert({
      where: { cacheKey },
      create: {
        cacheKey,
        provider: 'stub',
        vehicle,
        originKind: request.startRef?.kind ?? 'custom',
        originRefId: request.startRef?.refId ?? null,
        originLat: request.start.lat,
        originLon: request.start.lon,
        destinationKind: request.endRef?.kind ?? 'custom',
        destinationRefId: request.endRef?.refId ?? null,
        destinationLat: request.end.lat,
        destinationLon: request.end.lon,
        distanceKm: result.distanceKm,
        driveMinutes: result.driveMinutes,
        validUntil,
      },
      update: {
        provider: 'stub',
        vehicle,
        originKind: request.startRef?.kind ?? 'custom',
        originRefId: request.startRef?.refId ?? null,
        originLat: request.start.lat,
        originLon: request.start.lon,
        destinationKind: request.endRef?.kind ?? 'custom',
        destinationRefId: request.endRef?.refId ?? null,
        destinationLat: request.end.lat,
        destinationLon: request.end.lon,
        distanceKm: result.distanceKm,
        driveMinutes: result.driveMinutes,
        validUntil,
      },
    });

    // Store the simplified geometry as a PostGIS LineString
    await this.writeGeometryToCache(cacheKey, simplified);

    // 5. Assemble response
    return {
      coordinates: simplified,
      driveMinutes: result.driveMinutes,
      distanceKm: result.distanceKm,
      warnings: [],
    };
  }

  /**
   * Reads the route geometry from the PostGIS column and returns it as
   * GeoJSON-style `[lon, lat][]` coordinates.
   */
  private async readGeometryFromCache(
    cacheKey: string,
  ): Promise<[number, number][]> {
    const rows = await this.prisma.$queryRaw<{ geojson: string }[]>`
      SELECT ST_AsGeoJSON("routeGeometry")::text AS geojson
      FROM "driving_path_cache"
      WHERE "cacheKey" = ${cacheKey}
    `;

    if (!rows.length || !rows[0].geojson) return [];

    try {
      const geo = JSON.parse(rows[0].geojson) as {
        type: string;
        coordinates: [number, number][];
      };
      if (geo.type === 'LineString' && Array.isArray(geo.coordinates)) {
        return geo.coordinates;
      }
    } catch {
      // If parsing fails, return empty — the caller still gets metadata
    }

    return [];
  }

  /**
   * Writes simplified coordinates into the PostGIS LineString column.
   */
  private async writeGeometryToCache(
    cacheKey: string,
    coordinates: [number, number][],
  ): Promise<void> {
    const wkt = coordinatesToWKT(coordinates);
    await this.prisma.$executeRaw`
      UPDATE "driving_path_cache"
      SET "routeGeometry" = ST_GeomFromText(${wkt}, 4326)
      WHERE "cacheKey" = ${cacheKey}
    `;
  }
}

// ── helpers ──────────────────────────────────────────────────

/** Build a deterministic cache key from origin, destination, and vehicle. */
function buildCacheKey(
  origin: GeoPoint,
  destination: GeoPoint,
  vehicle: VehicleProfile,
): string {
  const round = (n: number) =>
    Math.round(n * 10 ** COORD_ROUND_DECIMALS) / 10 ** COORD_ROUND_DECIMALS;

  const oLat = round(origin.lat);
  const oLon = round(origin.lon);
  const dLat = round(destination.lat);
  const dLon = round(destination.lon);

  return `${oLat}:${oLon}|${dLat}:${dLon}|${vehicle}`;
}

/** Assemble a {@link DrivingPathResponse} from a cache row and geometry. */
function assembleResponse(
  cached: {
    distanceKm: number;
    driveMinutes: number;
    warnings?: unknown;
  },
  coordinates: [number, number][],
): DrivingPathResponse {
  return {
    coordinates,
    driveMinutes: cached.driveMinutes,
    distanceKm: cached.distanceKm,
    warnings: (cached.warnings as DrivingPathResponse['warnings']) ?? [],
  };
}

/**
 * Convert `[lon, lat][]` coordinates to a WKT LineString.
 * WKT order is `lon lat` (same as GeoJSON).
 */
function coordinatesToWKT(coordinates: [number, number][]): string {
  const points = coordinates.map(([lon, lat]) => `${lon} ${lat}`).join(', ');
  return `LINESTRING(${points})`;
}

// ── Douglas-Peucker ──────────────────────────────────────────

/**
 * Simplify a polyline using the Ramer–Douglas–Peucker algorithm.
 *
 * @param coordinates Array of `[lon, lat]` tuples (GeoJSON order).
 * @param toleranceMeters Maximum perpendicular distance (in meters) a point
 *   may have from the simplified line before being retained.
 * @returns Simplified coordinate array.
 */
function simplifyDouglasPeucker(
  coordinates: [number, number][],
  toleranceMeters: number,
): [number, number][] {
  if (coordinates.length <= 2) return coordinates;

  // Compute scaling factors for approximate meter conversion.
  // Average latitude provides sufficient accuracy for the short distances
  // typical of driving paths within Iceland.
  const avgLat =
    coordinates.reduce((sum, [, lat]) => sum + lat, 0) / coordinates.length;
  const latDegToM = 111_320;
  const lonDegToM = 111_320 * Math.cos((avgLat * Math.PI) / 180);

  const toMeters = ([lon, lat]: [number, number]): [number, number] => [
    lon * lonDegToM,
    lat * latDegToM,
  ];

  // Pre-convert all coordinates to approximate meters
  const meterCoords = coordinates.map(toMeters);

  // Use indices to avoid array slicing overhead
  function simplifyRange(startIdx: number, endIdx: number): number[] {
    if (endIdx - startIdx <= 1) return [startIdx, endIdx];

    let maxDist = 0;
    let maxIdx = startIdx;

    const startM = meterCoords[startIdx];
    const endM = meterCoords[endIdx];

    for (let i = startIdx + 1; i < endIdx; i++) {
      const dist = perpendicularDistanceM(meterCoords[i], startM, endM);
      if (dist > maxDist) {
        maxDist = dist;
        maxIdx = i;
      }
    }

    if (maxDist > toleranceMeters) {
      const leftIndices = simplifyRange(startIdx, maxIdx);
      const rightIndices = simplifyRange(maxIdx, endIdx);
      // Merge, dropping the duplicate split point
      return [...leftIndices.slice(0, -1), ...rightIndices];
    }

    return [startIdx, endIdx];
  }

  const simplifiedIndices = simplifyRange(0, coordinates.length - 1);
  return simplifiedIndices.map((i) => coordinates[i]);
}

/**
 * Perpendicular distance from a point to the infinite line defined by
 * two points. All coordinates in approximate meters.
 */
function perpendicularDistanceM(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number],
): number {
  const [px, py] = point;
  const [ax, ay] = lineStart;
  const [bx, by] = lineEnd;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // Start and end are the same point
    return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
  }

  // Project point onto the line segment, clamped to [0, 1]
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}
