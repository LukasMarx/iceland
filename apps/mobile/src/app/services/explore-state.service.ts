import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  ExploreQuery,
  ExploreResponse,
  Spot,
  SpotContextResponse,
} from '@islandhub/domain';
import { projectIcelandPoint, sortBySafetyThenDrive } from '@islandhub/domain';
import type { SafetyStatus } from '@islandhub/domain';
import { IslandhubApiService } from './islandhub-api.service';
import { FilterStateService, VehicleFilter } from './filter-state.service';

const emptyExplore: ExploreResponse = {
  hub: {
    id: '',
    name: 'Loading hub',
    location: { lat: 64.9, lon: -18.5 },
    dateRange: '',
    nights: 0,
  },
  dateLabel: 'Loading',
  vehicle: 'unknown',
  dataAgeMinutes: 0,
  spots: [],
  smartRoutes: [],
};

/**
 * Holds explore response data and derived computed signals.
 * Filtered view (visibleSpots, mapPoints, statusCounts) is computed reactively
 * from FilterStateService signals and the raw explore data.
 */
@Injectable({ providedIn: 'root' })
export class ExploreStateService {
  private readonly api = inject(IslandhubApiService);
  private readonly filterState = inject(FilterStateService);

  readonly explore = signal<ExploreResponse>(emptyExplore);
  readonly exploreLoading = signal(false);
  readonly categoryOptions = signal<string[]>([]);

  private exploreRequestId = 0;

  // ---- Computed views --------------------------------------------------

  readonly visibleSpots = computed(() => {
    const spots = this.explore().spots;
    const statuses = this.filterState.statusFilters();
    const categories = this.filterState.categoryFilters();
    const vehicle = this.filterState.vehicleFilter();
    const showFRoads = this.filterState.showFRoads();
    const maxDrive = this.filterState.maxDriveMinutes();

    return sortBySafetyThenDrive(
      spots.filter((spot) => {
        if (!statuses.includes(spot.status.status)) return false;
        if (categories.length > 0 && !categories.includes(spot.category)) return false;
        if (spot.driveMinutes > maxDrive) return false;
        if (vehicle === 'car_2wd' && spot.isFRoad && !showFRoads) return false;
        return true;
      }),
    );
  });

  readonly mapPoints = computed(() => [
    projectIcelandPoint('hub', this.explore().hub.name, this.explore().hub.location),
    ...this.visibleSpots().map((s) => projectIcelandPoint(s.id, s.name, s.location)),
  ]);

  readonly statusCounts = computed(() =>
    this.visibleSpots().reduce<Record<SafetyStatus, number>>(
      (counts, spot) => ({ ...counts, [spot.status.status]: counts[spot.status.status] + 1 }),
      { green: 0, yellow: 0, red: 0, unknown: 0 },
    ),
  );

  readonly availableCategories = computed(() =>
    Array.from(new Set([...this.categoryOptions(), ...this.explore().spots.map((s) => s.category)])),
  );

  // ---- Actions ----------------------------------------------------------

  mapPointStatus(pointId: string): SafetyStatus | 'unknown' {
    return this.explore().spots.find((s) => s.id === pointId)?.status.status ?? 'unknown';
  }

  statusCount(status: SafetyStatus): number {
    return this.statusCounts()[status];
  }

  findSpot(spotId: string): Spot | undefined {
    return this.explore().spots.find((s) => s.id === spotId);
  }

  /**
   * Load (or refresh) explore data with the given query.
   * @param activeTripDate  the active trip date (from facade), or undefined
   * @param onError         callback for offline / error handling
   */
  async load(activeTripDate: string | undefined, onError: (msg: string) => void): Promise<void> {
    const requestId = ++this.exploreRequestId;
    this.exploreLoading.set(true);

    const query: ExploreQuery = {
      statuses: this.filterState.statusFilters(),
      categories: this.filterState.categoryFilters(),
      vehicle: this.filterState.vehicleFilter() as VehicleFilter,
      showFRoads: this.filterState.showFRoads(),
      maxDriveMinutes: this.filterState.maxDriveMinutes(),
      date: activeTripDate,
    };

    try {
      const data = await this.api.getExplore(query);
      if (requestId !== this.exploreRequestId) return;
      this.explore.set(data);
      this.categoryOptions.set(
        Array.from(new Set([...this.categoryOptions(), ...data.spots.map((s) => s.category).filter(Boolean)])),
      );
    } catch {
      if (requestId === this.exploreRequestId) {
        onError('Could not refresh Explore.');
      }
    } finally {
      if (requestId === this.exploreRequestId) {
        this.exploreLoading.set(false);
      }
    }
  }

  async openSpot(spot: Spot, activeTripDate: string | undefined, onError: (msg: string) => void): Promise<SpotContextResponse | null> {
    try {
      return await this.api.getSpotContext(spot.id, activeTripDate);
    } catch {
      onError(`Could not load ${spot.name}.`);
      return null;
    }
  }
}
