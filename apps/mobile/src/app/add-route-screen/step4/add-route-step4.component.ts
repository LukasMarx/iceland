import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { SafetyStatus, Spot } from '@islandhub/domain';
import { highestStatusFor, estimateDriveMinutes, statusColor, statusVariant, statusIcon, statusLabel, minutesToDrive, spotBackground } from '@islandhub/domain';
import { LibButtonDirective, LibChipComponent, LibMapComponent, LibWizardBodyComponent, LibBottomSheetComponent } from '@islandhub/ui';
import type { MapMarker, MapRoute } from '@islandhub/ui';
import { AppScreenBase } from '../../screen-base';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  imports: [LibButtonDirective, LibChipComponent, LibMapComponent, LibWizardBodyComponent, LibBottomSheetComponent],
  selector: 'app-add-route-step4',
  templateUrl: './add-route-step4.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRouteStep4Component extends AppScreenBase {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);
  protected readonly manualMode = signal(this.service.flow() === 'edit');

  constructor() {
    super();
    this.service.step.set(4);
    if (!this.service.base()) {
      this.service.init(this.app.currentWizardBase());
    }
  }

  protected readonly candidateStops = computed(() => {
    const order: Record<SafetyStatus, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };

    return [...this.app.explore().spots]
      .sort((left: Spot, right: Spot) => {
        const statusDelta = order[left.status.status] - order[right.status.status];

        return statusDelta === 0 ? left.driveMinutes - right.driveMinutes : statusDelta;
      })
      .slice(0, 6);
  });

  protected readonly recommendedStops = computed(() => {
    const selectedIds = this.service.selectedStopIds();

    return this.candidateStops()
      .filter((spot: Spot) => spot.status.status !== 'red' && !selectedIds.includes(spot.id))
      .slice(0, 3);
  });

  protected readonly recommendedStopIds = computed(() => this.recommendedStops().map((spot: Spot) => spot.id));

  protected readonly selectedStops = computed(() => this.service.selectedStopIds()
    .map((spotId) => this.candidateStops().find((spot: Spot) => spot.id === spotId))
    .filter((spot): spot is Spot => Boolean(spot)));

  protected readonly directDriveMinutes = computed(() => {
    const hotel = this.service.endHotel();

    if (hotel) {
      return Math.max(25, Math.round(hotel.distanceKm * 0.75));
    }

    return 90;
  });

  protected readonly totalDriveMinutes = computed(() => this.directDriveMinutes() + this.selectedStops().reduce((sum, spot: Spot) => sum + estimateDriveMinutes(spot.driveMinutes), 0));

  protected readonly totalTripMinutes = computed(() => this.totalDriveMinutes() + this.selectedStops().reduce((sum, spot: Spot) => sum + spot.stayMinutes, 0));

  protected readonly highestStatus = computed(() => highestStatusFor(this.selectedStops()));

  protected readonly wizardMarkers = computed((): MapMarker[] => {
    const base = this.service.base();
    const hotel = this.service.endHotel();
    const destination = hotel?.location ?? base?.location;
    const markers: MapMarker[] = [];

    if (base) {
      markers.push({ id: 'start', coordinates: base.location, color: '#101114', size: 'lg', label: base.name });
    }

    for (const spot of this.candidateStops()) {
      markers.push({ id: spot.id, coordinates: spot.location, color: this.statusColorFn(spot.status.status), size: this.service.selectedStopIds().includes(spot.id) ? 'lg' : 'md', label: spot.name });
    }

    if (destination) {
      markers.push({ id: 'destination', coordinates: destination, color: '#2563eb', size: 'lg', label: hotel?.name ?? base?.name ?? 'Destination' });
    }

    return markers;
  });

  protected readonly routeLines = computed((): MapRoute[] => {
    const base = this.service.base();
    const hotel = this.service.endHotel();
    const destination = hotel?.location ?? base?.location;

    if (!base || !destination) {
      return [];
    }

    return [{
      id: 'wizard-route-corridor',
      coordinates: [
        base.location,
        ...this.selectedStops().map((spot: Spot) => spot.location),
        destination,
      ],
      color: '#101114',
      width: 4,
      opacity: 0.72,
    }];
  });

  protected get destinationName(): string {
    return this.service.endHotel()?.name ?? this.service.base()?.name ?? 'your destination';
  }

  protected useRecommended(): void {
    this.service.setSelectedStops(this.recommendedStopIds());
    this.continue();
  }

  protected chooseManually(): void {
    this.manualMode.set(true);
    if (this.service.selectedStopIds().length === 0) {
      this.service.setSelectedStops(this.recommendedStopIds().slice(0, 2));
    }
  }

  protected driveDirectly(): void {
    this.service.setSelectedStops([]);
    this.continue();
  }

  protected toggleStop(spot: Spot): void {
    this.service.toggleStop(spot.id);
  }

  protected onMarkerClick(markerId: string): void {
    const spot = this.candidateStops().find((candidate: Spot) => candidate.id === markerId);

    if (spot) {
      this.toggleStop(spot);
      this.manualMode.set(true);
    }
  }

  protected continue(): void {
    this.service.step.set(5);
    void this.router.navigateByUrl('/routes/add/step5');
  }

  protected statusVariant(status: SafetyStatus): ReturnType<typeof statusVariant> {
    return statusVariant(status);
  }

  protected statusIcon(status: SafetyStatus): string {
    return statusIcon(status);
  }

  protected statusLabel(status: SafetyStatus): string {
    return statusLabel(status);
  }

  protected minutesToDrive(minutes: number): string {
    return minutesToDrive(minutes);
  }

  protected extraDriveMinutes(spot: Spot): number {
    return estimateDriveMinutes(spot.driveMinutes);
  }

  protected attractionImage(spot: Spot): string {
    return spotBackground(spot);
  }

  protected isSelected(spot: Spot): boolean {
    return this.service.selectedStopIds().includes(spot.id);
  }

  private statusColorFn(status: SafetyStatus): string {
    return statusColor(status);
  }
}
