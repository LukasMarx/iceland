import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { SafetyStatus, Spot } from '@islandhub/domain';
import { highestStatusFor, estimateDriveMinutes, statusVariant, statusIcon, statusLabel, minutesToDrive } from '@islandhub/domain';
import { LibButtonDirective, LibChipComponent, LibStatsDarkChildComponent, LibStatsDarkComponent, LibWizardBodyComponent, LibWizardFooterComponent } from '@islandhub/ui';
import { AppStateService } from '../../services/app-state.service';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  imports: [LibButtonDirective, LibChipComponent, LibStatsDarkChildComponent, LibStatsDarkComponent, LibWizardBodyComponent, LibWizardFooterComponent],
  selector: 'app-add-route-step5',
  templateUrl: './add-route-step5.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddRouteStep5Component {
  protected readonly app = inject(AppStateService);
  protected readonly service = inject(AddRouteWizardService);
  private readonly router = inject(Router);

  constructor() {
    this.service.step.set(5);
    if (!this.service.base()) {
      this.service.init(this.app.currentWizardBase());
    }
  }

  protected readonly selectedStops = computed(() => this.service.selectedStopIds()
    .map((spotId) => this.app.explore().spots.find((spot: Spot) => spot.id === spotId))
    .filter((spot): spot is Spot => Boolean(spot)));

  protected readonly directDriveMinutes = computed(() => {
    const hotel = this.service.endHotel();
    if (hotel) return Math.max(25, Math.round(hotel.distanceKm * 0.75));
    return 90;
  });

  protected readonly totalDriveMinutes = computed(() => this.directDriveMinutes() + this.selectedStops().reduce((sum, spot: Spot) => sum + estimateDriveMinutes(spot.driveMinutes), 0));
  protected readonly totalTripMinutes = computed(() => this.totalDriveMinutes() + this.selectedStops().reduce((sum, spot: Spot) => sum + spot.stayMinutes, 0));
  protected readonly highestStatus = computed(() => highestStatusFor(this.selectedStops()));

  protected get destinationName(): string {
    return this.service.endHotel()?.name ?? this.service.base()?.name ?? 'Destination';
  }

  protected get routeTitle(): string {
    if (this.service.flow() === 'edit' && this.service.editingRouteTitle()) return this.service.editingRouteTitle() ?? '';
    const base = this.service.base()?.name ?? 'Start';
    return `${base} to ${this.destinationName}`;
  }

  protected editStops(): void { this.service.step.set(4); void this.router.navigateByUrl('/routes/add/step4'); }
  protected startToday(): void {
    if (this.service.flow() === 'edit') { void this.app.applyWizardRouteEdit(); return; }
    const baseName = this.service.base()?.name ?? this.app.explore().hub.name;
    void this.app.setWizardTodayRoute({
      baseName, destinationName: this.destinationName,
      selectedStops: this.selectedStops(),
      directDriveMinutes: this.directDriveMinutes(),
      totalDriveMinutes: this.totalDriveMinutes(),
    });
  }
  protected saveToTrip(): void { void this.app.saveWizardDraftDay(this.routeTitle); }

  protected statusVariant(status: SafetyStatus): ReturnType<typeof statusVariant> { return statusVariant(status); }
  protected statusIcon(status: SafetyStatus): string { return statusIcon(status); }
  protected statusLabel(status: SafetyStatus): string { return statusLabel(status); }
  protected minutesToDrive(minutes: number): string { return minutesToDrive(minutes); }
  protected extraDriveMinutes(spot: Spot): number { return estimateDriveMinutes(spot.driveMinutes); }
}
