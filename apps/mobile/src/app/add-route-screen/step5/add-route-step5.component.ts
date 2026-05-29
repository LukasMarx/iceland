import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { SafetyStatus, Spot } from '@islandhub/domain';
import { LibButtonDirective, LibChipComponent, LibStatsDarkComponent } from '@islandhub/ui';
import type { LibChipVariant } from '@islandhub/ui';
import { AppScreenBase } from '../../screen-base';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  imports: [LibButtonDirective, LibChipComponent, LibStatsDarkComponent],
  selector: 'app-add-route-step5',
  templateUrl: './add-route-step5.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRouteStep5Component extends AppScreenBase {
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);

  protected readonly selectedStops = computed(() => this.service.selectedStopIds()
    .map((spotId) => this.app.explore().spots.find((spot: Spot) => spot.id === spotId))
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

  protected get destinationName(): string {
    return this.service.endHotel()?.name ?? this.service.base()?.name ?? 'Destination';
  }

  protected get routeTitle(): string {
    if (this.service.flow() === 'edit' && this.service.editingRouteTitle()) {
      return this.service.editingRouteTitle() ?? '';
    }

    const base = this.service.base()?.name ?? 'Start';

    return `${base} to ${this.destinationName}`;
  }

  protected editStops(): void {
    this.service.step.set(4);
    void this.router.navigateByUrl('/routes/add/step4');
  }

  protected startToday(): void {
    if (this.service.flow() === 'edit') {
      this.app.applyWizardRouteEdit();
      return;
    }

    const baseName = this.service.base()?.name ?? this.app.explore().hub.name;
    const destinationName = this.destinationName;
    this.app.setWizardTodayRoute({
      baseName,
      destinationName,
      selectedStops: this.selectedStops(),
      directDriveMinutes: this.directDriveMinutes(),
      totalDriveMinutes: this.totalDriveMinutes(),
    });
  }

  protected saveToTrip(): void {
    const status = this.highestStatus();
    this.app.saveWizardDraftDay(this.routeTitle, `${this.selectedStops().length} stops - ${this.minutesToDrive(this.totalDriveMinutes())} drive`, status);
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

  private highestStatusFor(spots: Spot[]): SafetyStatus {
    const order: Record<SafetyStatus, number> = { green: 0, yellow: 1, unknown: 2, red: 3 };

    return spots.reduce<SafetyStatus>((highest, spot) => order[spot.status.status] > order[highest] ? spot.status.status : highest, 'green');
  }
}