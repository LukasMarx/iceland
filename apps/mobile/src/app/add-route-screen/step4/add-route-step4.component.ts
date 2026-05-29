import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { SafetyStatus, Spot } from '@islandhub/domain';
import { LibButtonDirective, LibChipComponent, LibMapComponent } from '@islandhub/ui';
import type { LibChipVariant, MapMarker, MapRoute } from '@islandhub/ui';
import { AppScreenBase } from '../../screen-base';
import { spotImageBackground } from '../../spot-images';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  imports: [LibButtonDirective, LibChipComponent, LibMapComponent],
  selector: 'app-add-route-step4',
  templateUrl: './add-route-step4.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRouteStep4Component extends AppScreenBase {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);
  protected readonly manualMode = signal(this.service.flow() === 'edit');

  protected readonly candidateStops = computed(() => {
    const order: Record<SafetyStatus, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };

    return [...this.app.explore().spots]
      .sort((left: Spot, right: Spot) => {
        const statusDelta = order[left.status.status] - order[right.status.status];

        return statusDelta === 0 ? left.driveMinutes - right.driveMinutes : statusDelta;
      })
      .slice(0, 6);
  });

  protected readonly recommendedStops = computed(() => this.candidateStops()
    .filter((spot: Spot) => spot.status.status !== 'red')
    .slice(0, 3));

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

  protected readonly totalDriveMinutes = computed(() => this.directDriveMinutes() + this.selectedStops().reduce((sum, spot: Spot) => sum + Math.max(8, Math.round(spot.driveMinutes / 5)), 0));

  protected readonly totalTripMinutes = computed(() => this.totalDriveMinutes() + this.selectedStops().reduce((sum, spot: Spot) => sum + spot.stayMinutes, 0));

  protected readonly highestStatus = computed(() => this.highestStatusFor(this.selectedStops()));

  protected readonly wizardMarkers = computed((): MapMarker[] => {
    const base = this.service.base();
    const hotel = this.service.endHotel();
    const destination = hotel?.location ?? base?.location;
    const markers: MapMarker[] = [];

    if (base) {
      markers.push({ id: 'start', coordinates: [base.location.lon, base.location.lat], color: '#101114', size: 'lg', label: base.name });
    }

    for (const spot of this.candidateStops()) {
      markers.push({ id: spot.id, coordinates: [spot.location.lon, spot.location.lat], color: this.statusColor(spot.status.status), size: this.service.selectedStopIds().includes(spot.id) ? 'lg' : 'md', label: spot.name });
    }

    if (destination) {
      markers.push({ id: 'destination', coordinates: [destination.lon, destination.lat], color: '#2563eb', size: 'lg', label: hotel?.name ?? base?.name ?? 'Destination' });
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
        [base.location.lon, base.location.lat],
        ...this.selectedStops().map((spot: Spot): [number, number] => [spot.location.lon, spot.location.lat]),
        [destination.lon, destination.lat],
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

  protected statusVariant(status: SafetyStatus): LibChipVariant {
    return status === 'green' ? 'success' : status === 'yellow' ? 'warning' : status === 'red' ? 'danger' : 'neutral';
  }

  protected statusIcon(status: SafetyStatus): string {
    return status === 'green' ? '✓' : status === 'yellow' ? '!' : status === 'red' ? '⊘' : '?';
  }

  protected statusLabel(status: SafetyStatus): string {
    return status === 'green' ? 'Open' : status === 'yellow' ? 'Caution' : status === 'red' ? 'Closed' : 'No data';
  }

  protected minutesToDrive(minutes: number): string {
    return this.app.minutesToDrive(minutes);
  }

  protected extraDriveMinutes(spot: Spot): number {
    return Math.max(8, Math.round(spot.driveMinutes / 5));
  }

  protected attractionImage(spot: Spot): string {
    return spotImageBackground(spot.id);
  }

  protected isSelected(spot: Spot): boolean {
    return this.service.selectedStopIds().includes(spot.id);
  }

  private highestStatusFor(spots: Spot[]): SafetyStatus {
    const order: Record<SafetyStatus, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };

    return spots.reduce<SafetyStatus>((highest, spot) => order[spot.status.status] > order[highest] ? spot.status.status : highest, 'green');
  }

  private statusColor(status: SafetyStatus): string {
    if (status === 'green') return '#2f6f4f';
    if (status === 'yellow') return '#c9831f';
    if (status === 'red') return '#b42318';
    return '#6b7280';
  }
}