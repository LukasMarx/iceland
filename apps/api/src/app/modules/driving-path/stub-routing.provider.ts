import { Injectable } from '@nestjs/common';
import type { GeoPoint, VehicleProfile } from '@islandhub/domain';
import type { DrivingPathResult, RoutingProvider } from './routing-provider.interface';

/**
 * Stub implementation of {@link RoutingProvider} that returns
 * canned geometry for development and testing.
 *
 * Replaced by the real OpenRouteService provider in a follow-up slice.
 */
@Injectable()
export class StubRoutingProvider implements RoutingProvider {
  /** Exposed for test assertions — tracks how many times getRoute was called. */
  callCount = 0;

  async getRoute(
    origin: GeoPoint,
    destination: GeoPoint,
    _vehicle: VehicleProfile,
    _options?: { avoidFRoads?: boolean },
  ): Promise<DrivingPathResult> {
    this.callCount++;

    // Return canned geometry: a few points between origin and destination
    // with some intermediate points to exercise the simplification pipeline
    const midLat = (origin.lat + destination.lat) / 2;
    const midLon = (origin.lon + destination.lon) / 2;

    const coordinates: [number, number][] = [
      [origin.lon, origin.lat],
      [origin.lon + (midLon - origin.lon) * 0.25, origin.lat + (midLat - origin.lat) * 0.25],
      [origin.lon + (midLon - origin.lon) * 0.5, origin.lat + (midLat - origin.lat) * 0.5],
      [midLon, midLat],
      [midLon + (destination.lon - midLon) * 0.25, midLat + (destination.lat - midLat) * 0.25],
      [midLon + (destination.lon - midLon) * 0.5, midLat + (destination.lat - midLat) * 0.5],
      [midLon + (destination.lon - midLon) * 0.75, midLat + (destination.lat - midLat) * 0.75],
      [destination.lon, destination.lat],
    ];

    // Compute distance using Haversine approximation on the straight line
    const distanceKm = haversineKm(origin, destination);
    // Rough drive-time estimate: average 60 km/h, add 5 min base
    const driveMinutes = Math.max(1, Math.round((distanceKm / 60) * 60 + 5));

    return {
      kind: 'route',
      coordinates,
      driveMinutes,
      distanceKm: Math.round(distanceKm * 10) / 10,
    };
  }
}

/**
 * Haversine distance in kilometres between two geographic points.
 */
function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const aVal =
    sinDLat * sinDLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
}
