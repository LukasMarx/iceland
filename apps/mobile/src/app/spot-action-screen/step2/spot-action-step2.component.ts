import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { AttractionRouteSummary } from '@islandhub/domain';
import { LibButtonDirective, LibWizardBodyComponent, LibWizardFooterComponent } from '@islandhub/ui';
import { AppStateService } from '../../services/app-state.service';
import { SpotActionWizardService } from '../spot-action-wizard.service';

interface RouteEntry {
  route: AttractionRouteSummary;
  addedKm: number;
  addedMinutes: number;
}

@Component({
  imports: [LibButtonDirective, LibWizardBodyComponent, LibWizardFooterComponent],
  selector: 'app-spot-action-step2',
  templateUrl: './spot-action-step2.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotActionStep2Component {
  protected readonly app = inject(AppStateService);
  protected readonly service = inject(SpotActionWizardService);

  protected readonly selectedRouteId = signal<string | null>(null);

  protected readonly routeEntries = computed((): RouteEntry[] => {
    const spot = this.service.targetSpot();
    if (!spot) return [];
    const routes: AttractionRouteSummary[] = this.app.routeSuggestions();
    return routes
      .map((route): RouteEntry => {
        const divisor = Math.max(1, route.stops + 2);
        const addedKm = Math.max(4, Math.round(spot.distanceKm / divisor));
        const addedMinutes = Math.max(8, Math.round(spot.driveMinutes / divisor));
        return { route, addedKm, addedMinutes };
      })
      .sort((a, b) => a.addedKm - b.addedKm);
  });

  protected selectRoute(routeId: string): void { this.selectedRouteId.set(routeId); }

  protected confirm(): void {
    const routeId = this.selectedRouteId();
    if (routeId) this.service.complete(routeId);
  }

  protected get confirmLabel(): string {
    if (!this.selectedRouteId()) return 'Select a route';
    const entry = this.routeEntries().find((e) => e.route.id === this.selectedRouteId());
    return entry ? `Add stop (+${entry.addedKm} km) →` : 'Add to route →';
  }
}
