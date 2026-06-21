import { Injectable, signal } from '@angular/core';
import type { SafetyStatus } from '@islandhub/domain';

export type VehicleFilter = 'car_2wd' | 'car_4wd' | 'any';

/**
 * Holds user-controlled filter signals for the Explore screen.
 * Pure state — no API calls, no side effects.
 */
@Injectable({ providedIn: 'root' })
export class FilterStateService {
  readonly statusFilters = signal<SafetyStatus[]>(['green', 'yellow', 'unknown', 'red']);
  readonly categoryFilters = signal<string[]>([]);
  readonly vehicleFilter = signal<VehicleFilter>('car_2wd');
  readonly showFRoads = signal(true);
  readonly maxDriveMinutes = signal(180);

  toggleStatusFilter(status: SafetyStatus): void {
    this.statusFilters.update((filters) => {
      if (filters.includes(status)) {
        return filters.length === 1 ? filters : filters.filter((c) => c !== status);
      }
      return [...filters, status];
    });
  }

  toggleCategoryFilter(category: string): void {
    this.categoryFilters.update((filters) => {
      if (filters.includes(category)) {
        return filters.length === 1 ? filters : filters.filter((c) => c !== category);
      }
      return [...filters, category];
    });
  }

  setVehicleFilter(vehicle: VehicleFilter): void {
    this.vehicleFilter.set(vehicle);
    if (vehicle !== 'car_2wd') {
      this.showFRoads.set(true);
      this.maxDriveMinutes.set(180);
    }
  }

  setShowFRoads(show: boolean): void {
    this.showFRoads.set(show);
  }

  setMaxDriveMinutes(minutes: number): void {
    this.maxDriveMinutes.set(minutes);
  }

  setCategoryPreset(category: string | null): void {
    this.categoryFilters.set(category ? [category] : []);
  }

  isAllCategories(availableCount: number): boolean {
    const filters = this.categoryFilters();
    return filters.length === 0 || filters.length === availableCount;
  }

  reset(): void {
    this.statusFilters.set(['green', 'yellow', 'unknown', 'red']);
    this.categoryFilters.set([]);
    this.vehicleFilter.set('car_2wd');
    this.showFRoads.set(true);
    this.maxDriveMinutes.set(180);
  }
}
