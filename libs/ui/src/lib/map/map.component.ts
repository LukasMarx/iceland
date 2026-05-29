import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type maplibregl from 'maplibre-gl';
import type { Map } from 'maplibre-gl';
import { MapMarker, MapRadius, MapRoute } from './map.types';

@Component({
  selector: 'lib-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss',
})
export class LibMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  private readonly mapContainer!: ElementRef<HTMLDivElement>;

  /** Initial map center as [longitude, latitude]. Defaults to Iceland. */
  @Input() center: [number, number] = [-18.5, 64.9];

  /** Initial zoom level */
  @Input() zoom = 6;

  /** MapLibre style URL. Defaults to OpenFreeMap positron style (no token required). */
  @Input() style = 'https://tiles.openfreemap.org/styles/positron';

  /** List of map markers to display */
  @Input() markers: MapMarker[] = [];

  /** List of routes (polylines) to draw */
  @Input() routes: MapRoute[] = [];

  /** Optional radius circle */
  @Input() radius: MapRadius | null = null;

  /** When true, automatically fits the viewport to all markers and routes after rendering */
  @Input() autoFit = false;

  /** Emits the marker id when a marker is clicked */
  @Output() readonly markerClick = new EventEmitter<string>();

  private map: Map | null = null;
  private mapLoaded = false;
  private pendingRouteIds: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mgl: typeof maplibregl | null = null;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.hasWebGlSupport()) return;

    try {
      // Dynamic import keeps maplibre-gl out of the initial bundle
      this.mgl = (await import('maplibre-gl')).default;

      this.map = new this.mgl.Map({
        container: this.mapContainer.nativeElement,
        style: this.style,
        center: this.center,
        zoom: this.zoom,
        attributionControl: false,
      });

      this.map.addControl(new this.mgl.AttributionControl({ compact: true }), 'bottom-right');
      this.map.addControl(new this.mgl.NavigationControl(), 'top-right');

      this.map.on('load', () => {
        this.mapLoaded = true;
        this.renderMarkers();
        this.renderRoutes();
        this.renderRadius();
        if (this.autoFit) this.fitToContent();
      });
    } catch {
      this.map = null;
      this.mgl = null;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.mapLoaded || !this.map) return;

    if (changes['markers']) this.renderMarkers();
    if (changes['routes']) this.renderRoutes();
    if (changes['radius']) this.renderRadius();
    if (this.autoFit && (changes['markers'] || changes['routes'])) {
      this.fitToContent();
    } else if (!this.autoFit && (changes['center'] || changes['zoom'])) {
      this.map.flyTo({ center: this.center, zoom: this.zoom });
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = null;
  }

  // ---------------------------------------------------------------------------
  // Markers — rendered as a GeoJSON circle layer (WebGL) to avoid the
  // one-frame scroll lag that HTML Marker elements produce.
  // ---------------------------------------------------------------------------

  private renderMarkers(): void {
    if (!this.map || !this.mgl) return;

    // Remove previously added layers / source
    for (const id of ['lib-markers']) {
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    }
    if (this.map.getSource('lib-markers')) this.map.removeSource('lib-markers');

    if (this.markers.length === 0) return;

    const sizeMap: Record<string, number> = { sm: 5, md: 8, lg: 11 };

    this.map.addSource('lib-markers', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: this.markers.map(m => ({
          type: 'Feature' as const,
          properties: {
            id: m.id,
            color: m.color,
            radius: sizeMap[m.size ?? 'md'],
            label: m.label ?? '',
          },
          geometry: {
            type: 'Point' as const,
            coordinates: m.coordinates,
          },
        })),
      },
    });

    this.map.addLayer({
      id: 'lib-markers',
      type: 'circle',
      source: 'lib-markers',
      paint: {
        'circle-radius': ['get', 'radius'],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': 'rgba(255, 255, 255, 0.9)',
      },
    });

    // Popup on click when the marker has a label; also emit markerClick
    this.map.on('click', 'lib-markers', (e) => {
      if (!e.features?.[0] || !this.mgl || !this.map) return;
      const props = e.features[0].properties;
      const id: string | undefined = props?.['id'];
      if (id) this.markerClick.emit(id);
      const label = props?.['label'];
      if (!label) return;
      const coords = (e.features[0].geometry as unknown as { coordinates: [number, number] }).coordinates;
      new this.mgl.Popup({ closeButton: false, offset: 12 })
        .setLngLat(coords)
        .setText(label)
        .addTo(this.map);
    });

    this.map.on('mouseenter', 'lib-markers', () => {
      if (this.map) this.map.getCanvas().style.cursor = 'pointer';
    });
    this.map.on('mouseleave', 'lib-markers', () => {
      if (this.map) this.map.getCanvas().style.cursor = '';
    });
  }

  private fitToContent(): void {
    if (!this.map || !this.mgl) return;

    const coords: [number, number][] = [
      ...this.markers.map(m => m.coordinates),
      ...this.routes.flatMap(r => r.coordinates),
    ];

    if (coords.length === 0) return;
    if (coords.length === 1) {
      this.map.setCenter(coords[0]);
      this.map.setZoom(this.zoom);
      return;
    }

    const lngs = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    const bounds = new this.mgl.LngLatBounds(
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    );

    this.map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 0 });
  }

  private hasWebGlSupport(): boolean {
    if (typeof WebGLRenderingContext === 'undefined') return false;

    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  }

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------

  private renderRoutes(): void {
    if (!this.map) return;

    // Remove previously added route layers/sources
    for (const id of this.pendingRouteIds) {
      if (this.map.getLayer(id)) this.map.removeLayer(id);
      if (this.map.getSource(id)) this.map.removeSource(id);
    }
    this.pendingRouteIds = [];

    for (const route of this.routes) {
      const sourceId = `lib-route-${route.id}`;

      this.map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: route.coordinates,
          },
        },
      });

      this.map.addLayer({
        id: sourceId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': route.color ?? '#0066CC',
          'line-width': route.width ?? 3,
          'line-opacity': route.opacity ?? 1,
        },
      });

      this.pendingRouteIds.push(sourceId);
    }
  }

  // ---------------------------------------------------------------------------
  // Radius
  // ---------------------------------------------------------------------------

  private renderRadius(): void {
    if (!this.map) return;

    const fillId = 'lib-radius-fill';
    const outlineId = 'lib-radius-outline';
    const sourceId = 'lib-radius';

    for (const id of [fillId, outlineId]) {
      if (this.map.getLayer(id)) this.map.removeLayer(id);
    }
    if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);

    if (!this.radius) return;

    this.map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [this.buildCircleCoords(this.radius.center, this.radius.radiusKm)],
        },
      },
    });

    this.map.addLayer({
      id: fillId,
      type: 'fill',
      source: sourceId,
      paint: {
        'fill-color': this.radius.color ?? '#0066CC',
        'fill-opacity': this.radius.opacity ?? 0.15,
      },
    });

    this.map.addLayer({
      id: outlineId,
      type: 'line',
      source: sourceId,
      paint: {
        'line-color': this.radius.color ?? '#0066CC',
        'line-width': 2,
        'line-opacity': 0.6,
      },
    });
  }

  /**
   * Approximates a geodesic circle as a closed GeoJSON polygon ring.
   * Uses the haversine-based destination point formula.
   */
  private buildCircleCoords(center: [number, number], radiusKm: number, steps = 64): [number, number][] {
    const coords: [number, number][] = [];
    const R = 6371; // Earth's mean radius in km
    const lat = (center[1] * Math.PI) / 180;
    const lng = (center[0] * Math.PI) / 180;
    const d = radiusKm / R;

    for (let i = 0; i <= steps; i++) {
      const bearing = (i / steps) * 2 * Math.PI;
      const destLat = Math.asin(
        Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(bearing),
      );
      const destLng =
        lng +
        Math.atan2(
          Math.sin(bearing) * Math.sin(d) * Math.cos(lat),
          Math.cos(d) - Math.sin(lat) * Math.sin(destLat),
        );
      coords.push([(destLng * 180) / Math.PI, (destLat * 180) / Math.PI]);
    }

    return coords;
  }
}
