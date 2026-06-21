import type { GeoPoint, VehicleProfile } from '@islandhub/domain';

/**
 * Result of a routing provider lookup.
 */
export type DrivingPathResult =
  | {
      kind: 'route';
      coordinates: [number, number][];
      driveMinutes: number;
      distanceKm: number;
    }
  | {
      kind: 'no_route';
    };

/**
 * Contract for a routing provider that returns driving directions
 * between an origin and destination.
 *
 * Implementations are responsible for calling an external routing
 * engine (e.g. OpenRouteService, Valhalla) and translating the
 * response into the canonical {@link DrivingPathResult} shape.
 */
export interface RoutingProvider {
  getRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    vehicle: VehicleProfile,
    options?: { avoidFRoads?: boolean },
  ): Promise<DrivingPathResult>;
}

export const ROUTING_PROVIDER = Symbol('ROUTING_PROVIDER');
