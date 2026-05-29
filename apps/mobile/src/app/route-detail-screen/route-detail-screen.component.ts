import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { LibButtonDirective, LibChipComponent, LibMapComponent, LibRouteStopCardComponent, LibStatsDarkComponent, LucideArrowRight, LucideCheck, LucideClock, LucideChevronLeft, LucideSlidersHorizontal } from '@islandhub/ui';
import type { MapMarker, MapRoute } from '@islandhub/ui';
import { AppScreenBase } from '../screen-base';

const STATUS_COLORS: Record<string, string> = {
  green: '#4ade80',
  yellow: '#facc15',
  red: '#f87171',
  unknown: '#94a3b8',
};

@Component({
  standalone: true,
  imports: [CommonModule, LibButtonDirective, LibChipComponent, LibMapComponent, LibRouteStopCardComponent, LibStatsDarkComponent, LucideArrowRight, LucideCheck, LucideClock, LucideChevronLeft, LucideSlidersHorizontal],
  selector: 'app-route-detail-screen',
  templateUrl: './route-detail-screen.component.html',
  styleUrl: './route-detail-screen.component.scss',
})
export class RouteDetailScreenComponent extends AppScreenBase {
  protected readonly routeMarkers = computed((): MapMarker[] => {
    const hub = this.app.explore().hub;
    const stops = this.app.selectedRouteStops();
    if (!hub) return [];
    return [
      { id: 'hub', coordinates: [hub.location.lon, hub.location.lat] as [number, number], color: '#101114', size: 'lg', label: hub.name },
      ...stops.map((e: any) => ({
        id: e.spot.id,
        coordinates: [e.spot.location.lon, e.spot.location.lat] as [number, number],
        color: STATUS_COLORS[e.spot.status.status] ?? STATUS_COLORS['unknown'],
        size: 'md' as const,
        label: e.spot.name,
      })),
    ];
  });

  protected readonly routeLines = computed((): MapRoute[] => {
    const hub = this.app.explore().hub;
    const stops = this.app.selectedRouteStops();
    if (!hub || stops.length === 0) return [];
    const hubCoord: [number, number] = [hub.location.lon, hub.location.lat];
    return [{
      id: 'route',
      coordinates: [
        hubCoord,
        ...stops.map((e: any): [number, number] => [e.spot.location.lon, e.spot.location.lat]),
        hubCoord,
      ],
      color: '#101114',
      width: 2,
      opacity: 0.5,
    }];
  });

  protected readonly routeCenter = computed((): [number, number] => {
    const hub = this.app.explore().hub;
    return hub ? [hub.location.lon, hub.location.lat] : [-18.5, 64.9];
  });
}
