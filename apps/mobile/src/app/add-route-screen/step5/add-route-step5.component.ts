import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { RouteStop, SafetyStatus, Spot } from '@islandhub/domain';
import { LibButtonDirective, LibChipComponent, LibStatsDarkComponent } from '@islandhub/ui';
import type { LibChipVariant } from '@islandhub/ui';
import { AppScreenBase } from '../../screen-base';
import { AddRouteWizardService } from '../add-route-wizard.service';

@Component({
  standalone: true,
  imports: [LibButtonDirective, LibChipComponent, LibStatsDarkComponent],
  selector: 'app-add-route-step5',
  templateUrl: './add-route-step5.component.html',
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
    return this.service.endHotel()?.name ?? this.service.base()?.name ?? 'Ziel';
  }

  protected get routeTitle(): string {
    if (this.service.flow() === 'edit' && this.service.editingRouteTitle()) {
      return this.service.editingRouteTitle() ?? '';
    }

    const base = this.service.base()?.name ?? 'Start';

    return `${base} nach ${this.destinationName}`;
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
    const routeStops: RouteStop[] = this.selectedStops().map((spot: Spot, index: number) => ({
      id: spot.id,
      spotId: spot.id,
      title: spot.name,
      meta: `${this.minutesToDrive(Math.max(8, Math.round(spot.driveMinutes / 5)))} drive · ${spot.stayMinutes} min stay`,
      driveFromPreviousMinutes: Math.max(8, Math.round(spot.driveMinutes / 5)),
      stayMinutes: spot.stayMinutes,
      status: spot.status.status,
      state: index === 0 ? 'active' : 'open',
      note: spot.status.status === 'green' ? undefined : spot.status.reasons[0],
    }));

    this.app.today.set({
      title: this.selectedStops().length ? 'Roadtrip draft' : 'Direct drive',
      dateLabel: this.app.explore().dateLabel,
      recheckedMinutesAgo: this.app.explore().dataAgeMinutes,
      stopProgress: `0/${routeStops.length}`,
      driveMinutes: this.totalDriveMinutes(),
      daylightLeft: '14h 32',
      update: this.selectedStops().length ? 'Route checked against current road and weather snapshot.' : 'Direct leg saved without sightseeing stops.',
      stops: [
        { id: 'start', title: baseName, meta: 'start', driveFromPreviousMinutes: 0, stayMinutes: 0, status: 'green', state: 'start' },
        ...routeStops,
        { id: 'destination', title: destinationName, meta: 'destination', driveFromPreviousMinutes: this.directDriveMinutes(), stayMinutes: 0, status: 'green', state: 'return' },
      ],
    });
    this.app.activeRoute.set(true);
    this.app.actionNotice.set('Routenentwurf ist als heutige Route bereit.');
    this.app.navigateToTab('today');
  }

  protected saveToTrip(): void {
    const status = this.highestStatus();
    this.app.trip.update((response: any) => ({
      trip: {
        ...response.trip,
        days: [
          ...response.trip.days,
          {
            weekday: 'Draft',
            day: `${13 + response.trip.days.length}`,
            title: this.routeTitle,
            summary: `${this.selectedStops().length} Stopps · ${this.minutesToDrive(this.totalDriveMinutes())} Fahrzeit`,
            status,
          },
        ],
      },
    }));
    this.app.actionNotice.set('Routenentwurf wurde zur Reise gespeichert.');
    this.app.navigateToTab('trip');
  }

  protected statusVariant(status: SafetyStatus): LibChipVariant {
    return status === 'green' ? 'success' : status === 'yellow' ? 'warning' : status === 'red' ? 'danger' : 'neutral';
  }

  protected statusIcon(status: SafetyStatus): string {
    return status === 'green' ? '✓' : status === 'yellow' ? '!' : status === 'red' ? '⊘' : '?';
  }

  protected statusLabel(status: SafetyStatus): string {
    return status === 'green' ? 'Offen' : status === 'yellow' ? 'Achtung' : status === 'red' ? 'Gesperrt' : 'Keine Daten';
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