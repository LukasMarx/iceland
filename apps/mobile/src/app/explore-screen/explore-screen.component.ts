import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LibAttractionCardComponent, LibChipComponent, LibEmptyStateComponent, LibMapComponent, LibScreenComponent, LibScreenIntroComponent } from '@islandhub/ui';
import type { MapMarker } from '@islandhub/ui';
import { AppStateService } from '../services/app-state.service';

const STATUS_COLORS: Record<string, string> = {
  green: '#4ade80',
  yellow: '#facc15',
  red: '#f87171',
  unknown: '#94a3b8',
  hub: '#101114',
};

@Component({
  imports: [LibAttractionCardComponent, LibChipComponent, LibScreenComponent, LibEmptyStateComponent, LibMapComponent, LibScreenIntroComponent],
  selector: 'app-explore-screen',
  templateUrl: './explore-screen.component.html',
  styleUrl: './explore-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExploreScreenComponent {
  protected readonly app = inject(AppStateService);

  protected readonly exploreMarkers = computed((): MapMarker[] =>
    this.app.mapPoints().map((point) => ({
      id: point.id,
      coordinates: { lat: point.lat, lon: point.lon },
      color: STATUS_COLORS[point.id === 'hub' ? 'hub' : this.app.mapPointStatus(point.id)] ?? STATUS_COLORS['unknown'],
      label: point.label,
      size: (point.id === 'hub' ? 'lg' : 'md') as 'lg' | 'md',
    })),
  );
}
