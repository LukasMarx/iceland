import { Injectable } from '@angular/core';
import type { AttractionRouteSummary } from '@islandhub/domain';
import type { Spot } from '@islandhub/domain';

export interface SelectedRouteStop {
  spot: Spot;
  driveFromPrevMinutes: number;
  distanceKm: number;
}

@Injectable({ providedIn: 'root' })
export class RoutePlanningService {
  selectedRouteStops(route: AttractionRouteSummary | null, spots: Spot[]): SelectedRouteStop[] {
    if (!route) {
      return [];
    }

    return route.spotIds
      .map((spotId, index) => {
        const spot = this.findSpot(spotId, spots);
        const driveFromPrevMinutes = index === 0
          ? (spot?.driveMinutes ?? 30)
          : Math.max(12, Math.round((spot?.driveMinutes ?? 45) / 3));
        const distanceKm = index === 0
          ? (spot?.distanceKm ?? 0)
          : Math.max(5, Math.round((spot?.distanceKm ?? 20) / 3));

        return { spot, driveFromPrevMinutes, distanceKm };
      })
      .filter((entry): entry is SelectedRouteStop => Boolean(entry.spot));
  }

  private findSpot(spotId: string, spots: Spot[]): Spot | undefined {
    return spots.find((spot) => spot.id === spotId);
  }
}
