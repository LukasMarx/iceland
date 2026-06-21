import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { GeoPoint } from '@islandhub/domain';
import { LibButtonDirective, LibChipComponent, LibMapComponent, LibRouteStopCardComponent, LibStatsDarkComponent, LucideArrowRight, LucideCheck, LucideClock, LucideChevronLeft, LucideSlidersHorizontal } from '@islandhub/ui';
import type { MapMarker, MapRoute } from '@islandhub/ui';
import { AppStateService } from '../services/app-state.service';

const STATUS_COLORS: Record<string, string> = {
  green: '#4ade80',
  yellow: '#facc15',
  red: '#f87171',
  unknown: '#94a3b8',
};

@Component({
  imports: [LibButtonDirective, LibChipComponent, LibMapComponent, LibRouteStopCardComponent, LibStatsDarkComponent, LucideArrowRight, LucideCheck, LucideClock, LucideChevronLeft, LucideSlidersHorizontal],
  selector: 'app-route-detail-screen',
  templateUrl: './route-detail-screen.component.html',
  styleUrl: './route-detail-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteDetailScreenComponent {
  protected readonly app = inject(AppStateService);

  protected readonly routeMarkers = computed((): MapMarker[] => {
    const hub = this.app.explore().hub;
    const stops = this.app.selectedRouteStops();
    if (!hub) return [];
    return [
      { id: 'hub', coordinates: hub.location, color: '#101114', size: 'lg', label: hub.name },
      ...stops.map((entry) => ({
        id: entry.spot.id,
        coordinates: entry.spot.location,
        color: STATUS_COLORS[entry.spot.status.status] ?? STATUS_COLORS['unknown'],
        size: 'md' as const,
        label: entry.spot.name,
      })),
    ];
  });

  protected readonly routeLines = computed((): MapRoute[] => {
    const hub = this.app.explore().hub;
    const stops = this.app.selectedRouteStops();
    if (!hub || stops.length === 0) return [];
    return [{
      id: 'route',
      coordinates: [
        hub.location,
        ...stops.map((entry) => entry.spot.location),
        hub.location,
      ],
      color: '#101114',
      width: 2,
      opacity: 0.5,
    }];
  });

  protected readonly routeCenter = computed((): GeoPoint => {
    const hub = this.app.explore().hub;
    return hub ? hub.location : { lat: 64.9, lon: -18.5 };
  });
}
