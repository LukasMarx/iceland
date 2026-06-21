import {
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import type { DrivingPathRequest } from '@islandhub/domain';
import { DrivingPathService } from './driving-path.service';
import type { RoutingProvider } from './routing-provider.interface';

/** Sample GeoJSON LineString for cache-hit geometry reads. */
function cachedGeoJSON(coords: [number, number][]): string {
  return JSON.stringify({ type: 'LineString', coordinates: coords });
}

/** Factory: a minimal, valid DrivingPathRequest. */
function makeRequest(
  overrides: Partial<DrivingPathRequest> = {},
): DrivingPathRequest {
  return {
    start: { lat: 64.145981, lon: -21.942236 },
    end: { lat: 64.258006, lon: -21.123456 },
    ...overrides,
  };
}

describe('DrivingPathService', () => {
  let service: DrivingPathService;
  let mockPrisma: any;
  let mockProvider: jest.Mocked<RoutingProvider>;

  beforeEach(() => {
    mockPrisma = {
      drivingPathCache: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    };
    mockProvider = {
      getRoute: jest.fn(),
    } as any;

    service = new DrivingPathService(mockPrisma, mockProvider);
  });

  // ── Happy path ─────────────────────────────────────────────

  it('returns geometry, driveMinutes, distanceKm, and empty warnings on provider response', async () => {
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    mockProvider.getRoute.mockResolvedValue({
      kind: 'route',
      coordinates: [
        [-21.942, 64.146],
        [-21.942 + (-21.123 + 21.942) * 0.5, 64.146 + (64.258 - 64.146) * 0.5],
        [-21.123, 64.258],
      ],
      driveMinutes: 42,
      distanceKm: 35.7,
    });
    mockPrisma.drivingPathCache.upsert.mockResolvedValue({});
    mockPrisma.$executeRaw.mockResolvedValue(undefined);

    const result = await service.getDrivingPath(makeRequest());

    expect(result.coordinates.length).toBeGreaterThan(0);
    expect(result.driveMinutes).toBe(42);
    expect(result.distanceKm).toBe(35.7);
    expect(result.warnings).toEqual([]);
  });

  // ── Vehicle default ────────────────────────────────────────

  it('defaults vehicle to car_2wd when omitted', async () => {
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    mockProvider.getRoute.mockResolvedValue({
      kind: 'route',
      coordinates: [
        [-21.942, 64.146],
        [-21.123, 64.258],
      ],
      driveMinutes: 10,
      distanceKm: 8,
    });
    mockPrisma.drivingPathCache.upsert.mockResolvedValue({});
    mockPrisma.$executeRaw.mockResolvedValue(undefined);

    await service.getDrivingPath(makeRequest({ vehicle: undefined }));

    expect(mockProvider.getRoute).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 64.145981, lon: -21.942236 }),
      expect.objectContaining({ lat: 64.258006, lon: -21.123456 }),
      'car_2wd',
    );
  });

  it('passes through explicit vehicle to the provider', async () => {
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    mockProvider.getRoute.mockResolvedValue({
      kind: 'route',
      coordinates: [
        [-21.942, 64.146],
        [-21.123, 64.258],
      ],
      driveMinutes: 10,
      distanceKm: 8,
    });
    mockPrisma.drivingPathCache.upsert.mockResolvedValue({});
    mockPrisma.$executeRaw.mockResolvedValue(undefined);

    await service.getDrivingPath(makeRequest({ vehicle: 'car_4wd' }));

    expect(mockProvider.getRoute).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      'car_4wd',
    );
  });

  // ── Cache miss ─────────────────────────────────────────────

  it('calls provider on cache miss and persists result', async () => {
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    mockProvider.getRoute.mockResolvedValue({
      kind: 'route',
      coordinates: [
        [-21.942, 64.146],
        [-21.123, 64.258],
      ],
      driveMinutes: 15,
      distanceKm: 12.3,
    });
    mockPrisma.drivingPathCache.upsert.mockResolvedValue({});
    mockPrisma.$executeRaw.mockResolvedValue(undefined);

    await service.getDrivingPath(makeRequest());

    expect(mockProvider.getRoute).toHaveBeenCalledTimes(1);
    expect(mockPrisma.drivingPathCache.upsert).toHaveBeenCalledTimes(1);

    const upsertCall = mockPrisma.drivingPathCache.upsert.mock.calls[0][0];
    expect(upsertCall.create.driveMinutes).toBe(15);
    expect(upsertCall.create.distanceKm).toBe(12.3);
    // validUntil should be ~7 days from now
    const validUntil = new Date(upsertCall.create.validUntil);
    const sevenDays = Date.now() + 7 * 24 * 60 * 60 * 1000;
    expect(validUntil.getTime()).toBeGreaterThan(Date.now());
    expect(validUntil.getTime()).toBeLessThanOrEqual(sevenDays + 5000);
  });

  // ── Cache hit ──────────────────────────────────────────────

  it('returns cached result without calling provider on cache hit', async () => {
    const futureDate = new Date(Date.now() + 3600_000);
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue({
      cacheKey: '64.146:-21.9422|64.258:-21.1235|car_2wd',
      distanceKm: 35.7,
      driveMinutes: 42,
      validUntil: futureDate,
      warnings: null,
    });
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        geojson: cachedGeoJSON([
          [-21.942, 64.146],
          [-21.123, 64.258],
        ]),
      },
    ]);

    const result = await service.getDrivingPath(makeRequest());

    expect(mockProvider.getRoute).not.toHaveBeenCalled();
    expect(result.coordinates).toHaveLength(2);
    expect(result.driveMinutes).toBe(42);
    expect(result.distanceKm).toBe(35.7);
  });

  it('ignores expired cache entries and calls provider', async () => {
    const pastDate = new Date(Date.now() - 3600_000); // 1 hour ago
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue({
      cacheKey: '64.146:-21.9422|64.258:-21.1235|car_2wd',
      distanceKm: 35.7,
      driveMinutes: 42,
      validUntil: pastDate,
      warnings: null,
    });
    mockProvider.getRoute.mockResolvedValue({
      kind: 'route',
      coordinates: [
        [-21.942, 64.146],
        [-21.123, 64.258],
      ],
      driveMinutes: 15,
      distanceKm: 12.3,
    });
    mockPrisma.drivingPathCache.upsert.mockResolvedValue({});
    mockPrisma.$executeRaw.mockResolvedValue(undefined);

    const result = await service.getDrivingPath(makeRequest());

    expect(mockProvider.getRoute).toHaveBeenCalledTimes(1);
    expect(result.coordinates.length).toBeGreaterThan(0);
  });

  // ── Cache hit → call count unchanged ───────────────────────

  it('does not increase provider call count on repeated calls with same params', async () => {
    // First call: cache miss → provider called
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    mockProvider.getRoute.mockResolvedValue({
      kind: 'route',
      coordinates: [
        [-21.942, 64.146],
        [-21.942 + (-21.123 + 21.942) * 0.5, 64.146 + (64.258 - 64.146) * 0.5],
        [-21.123, 64.258],
      ],
      driveMinutes: 15,
      distanceKm: 12.3,
    });
    mockPrisma.drivingPathCache.upsert.mockResolvedValue({});
    mockPrisma.$executeRaw.mockResolvedValue(undefined);

    await service.getDrivingPath(makeRequest());
    expect(mockProvider.getRoute).toHaveBeenCalledTimes(1);

    // Second call: cache hit → provider NOT called again
    const futureDate = new Date(Date.now() + 3600_000);
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue({
      cacheKey: '64.146:-21.9422|64.258:-21.1235|car_2wd',
      distanceKm: 12.3,
      driveMinutes: 15,
      validUntil: futureDate,
      warnings: null,
    });
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        geojson: cachedGeoJSON([
          [-21.942, 64.146],
          [-21.123, 64.258],
        ]),
      },
    ]);

    await service.getDrivingPath(makeRequest());
    expect(mockProvider.getRoute).toHaveBeenCalledTimes(1); // still 1
  });

  // ── Geometry simplification ────────────────────────────────

  it('simplifies dense provider coordinates within ~15m tolerance', async () => {
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    // Provide 8 points — after 15m simplification some should be dropped
    mockProvider.getRoute.mockResolvedValue({
      kind: 'route',
      coordinates: [
        [-21.942, 64.146],
        [-21.943, 64.147],
        [-21.945, 64.149],
        [-21.950, 64.152],
        [-21.955, 64.156],
        [-21.960, 64.160],
        [-21.115, 64.250],
        [-21.123, 64.258],
      ],
      driveMinutes: 15,
      distanceKm: 12.3,
    });
    mockPrisma.drivingPathCache.upsert.mockResolvedValue({});
    mockPrisma.$executeRaw.mockResolvedValue(undefined);

    const result = await service.getDrivingPath(makeRequest());

    // After 15m simplification, the 8-point input should be reduced
    expect(result.coordinates.length).toBeLessThan(8);
    // But at least start and end should remain
    expect(result.coordinates.length).toBeGreaterThanOrEqual(2);
  });

  // ── Entity-typed cache key ─────────────────────────────────

  it('produces the same cache key with and without startRef/endRef (same coords)', async () => {
    const futureDate = new Date(Date.now() + 3600_000);

    // First: request WITHOUT refs but WITH coordinates
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    mockProvider.getRoute.mockResolvedValue({
      kind: 'route',
      coordinates: [
        [-21.942, 64.146],
        [-21.123, 64.258],
      ],
      driveMinutes: 15,
      distanceKm: 12.3,
    });
    mockPrisma.drivingPathCache.upsert.mockResolvedValue({});
    mockPrisma.$executeRaw.mockResolvedValue(undefined);

    await service.getDrivingPath(makeRequest());

    // Now set up cache hit for the second request WITH refs (same coords)
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue({
      cacheKey: '64.146:-21.9422|64.258:-21.1235|car_2wd',
      distanceKm: 12.3,
      driveMinutes: 15,
      validUntil: futureDate,
      warnings: null,
    });
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        geojson: cachedGeoJSON([
          [-21.942, 64.146],
          [-21.123, 64.258],
        ]),
      },
    ]);

    await service.getDrivingPath(
      makeRequest({
        startRef: { kind: 'hub', refId: 'hub-1' },
        endRef: { kind: 'spot', refId: 'spot-42' },
      }),
    );

    // Provider should NOT be called again (same cache key due to same coords)
    expect(mockProvider.getRoute).toHaveBeenCalledTimes(1);
  });

  // ── No-route handling ──────────────────────────────────────

  it('returns straight-line fallback when provider returns no_route', async () => {
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    mockProvider.getRoute.mockResolvedValue({ kind: 'no_route' });

    const result = await service.getDrivingPath(makeRequest());

    // Two-point straight line from start to end
    expect(result.coordinates).toEqual([
      [-21.942236, 64.145981],
      [-21.123456, 64.258006],
    ]);
    // Haversine distance Reykjavik to nearby: ~65 km
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.distanceKm).toBeLessThan(100);
    // Drive time = distance / 80 km/h in minutes
    expect(result.driveMinutes).toBeGreaterThan(0);
    expect(result.warnings).toEqual([
      {
        type: 'fallback_estimate',
        message: 'No car route found; showing straight-line estimate.',
      },
    ]);
    // Should NOT write to cache on no_route
    expect(mockPrisma.drivingPathCache.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('does NOT cache fallback results — second call re-invokes provider', async () => {
    // Use the StubRoutingProvider callCount pattern on mockProvider
    let providerCalls = 0;
    mockProvider.getRoute.mockImplementation(async () => {
      providerCalls++;
      return { kind: 'no_route' as const };
    });
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);

    await service.getDrivingPath(makeRequest());
    expect(providerCalls).toBe(1);

    await service.getDrivingPath(makeRequest());
    // Fallback is NOT cached, so provider is called again
    expect(providerCalls).toBe(2);
  });

  // ── Input validation ───────────────────────────────────────

  it('throws 400 when start is missing', async () => {
    await expect(
      service.getDrivingPath(makeRequest({ start: undefined as any })),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.getDrivingPath(makeRequest({ start: undefined as any })),
    ).rejects.toMatchObject({
      response: {
        code: 'invalid_request',
        message: 'start and end coordinates are required.',
      },
    });
  });

  it('throws 400 when end is missing', async () => {
    await expect(
      service.getDrivingPath(makeRequest({ end: undefined as any })),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.getDrivingPath(makeRequest({ end: undefined as any })),
    ).rejects.toMatchObject({
      response: {
        code: 'invalid_request',
        message: 'start and end coordinates are required.',
      },
    });
  });

  it('throws 400 when start lat is out of range', async () => {
    await expect(
      service.getDrivingPath(
        makeRequest({ start: { lat: 91, lon: 0 } }),
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'invalid_request',
        message: 'start coordinates are outside valid range.',
      },
    });
  });

  it('throws 400 when start lon is out of range', async () => {
    await expect(
      service.getDrivingPath(
        makeRequest({ start: { lat: 0, lon: -181 } }),
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'invalid_request',
        message: 'start coordinates are outside valid range.',
      },
    });
  });

  it('throws 400 when end lat is out of range', async () => {
    await expect(
      service.getDrivingPath(
        makeRequest({ end: { lat: -91, lon: 0 } }),
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'invalid_request',
        message: 'end coordinates are outside valid range.',
      },
    });
  });

  it('throws 400 when end lon is out of range', async () => {
    await expect(
      service.getDrivingPath(
        makeRequest({ end: { lat: 0, lon: 181 } }),
      ),
    ).rejects.toMatchObject({
      response: {
        code: 'invalid_request',
        message: 'end coordinates are outside valid range.',
      },
    });
  });

  // ── Provider error ─────────────────────────────────────────

  it('throws 502 Bad Gateway when routing provider throws', async () => {
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    mockProvider.getRoute.mockRejectedValue(new Error('ORS timeout'));

    await expect(
      service.getDrivingPath(makeRequest()),
    ).rejects.toThrow(BadGatewayException);

    await expect(
      service.getDrivingPath(makeRequest()),
    ).rejects.toMatchObject({
      response: {
        code: 'routing_provider_error',
        message: 'ORS timeout',
      },
    });
  });

  it('throws 502 with fallback message when provider throws a non-Error', async () => {
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    mockProvider.getRoute.mockRejectedValue('some string error');

    await expect(
      service.getDrivingPath(makeRequest()),
    ).rejects.toMatchObject({
      response: {
        code: 'routing_provider_error',
        message: 'Routing provider unavailable',
      },
    });
  });

  // ── Geometry write ─────────────────────────────────────────

  it('writes simplified geometry to the PostGIS column after provider call', async () => {
    mockPrisma.drivingPathCache.findUnique.mockResolvedValue(null);
    mockProvider.getRoute.mockResolvedValue({
      kind: 'route',
      coordinates: [
        [-21.942, 64.146],
        [-21.123, 64.258],
      ],
      driveMinutes: 10,
      distanceKm: 8,
    });
    mockPrisma.drivingPathCache.upsert.mockResolvedValue({});
    mockPrisma.$executeRaw.mockResolvedValue(undefined);

    await service.getDrivingPath(makeRequest());

    // $executeRaw should be called once to write the geometry
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(1);
    // With tagged template literal, the WKT value is the second argument
    const callArgs = mockPrisma.$executeRaw.mock.calls[0];
    const templateParts: string[] = callArgs[0];
    const rawSql = templateParts.join('?');
    expect(rawSql).toContain('ST_GeomFromText');
    // The second argument (first value) should be the WKT LINESTRING
    const wktValue: string = callArgs[1];
    expect(wktValue).toContain('LINESTRING');
  });
});
