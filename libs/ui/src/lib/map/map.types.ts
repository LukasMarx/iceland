export interface MapMarker {
  /** Unique identifier for the marker */
  id: string;
  /** [longitude, latitude] */
  coordinates: [number, number];
  /** CSS color string, e.g. '#E53E3E' or 'var(--color-danger)' */
  color: string;
  /** Optional popup / tooltip label */
  label?: string;
  /** Visual size of the pin dot */
  size?: 'sm' | 'md' | 'lg';
}

export interface MapRoute {
  /** Unique identifier for the route */
  id: string;
  /** Ordered list of [longitude, latitude] waypoints */
  coordinates: [number, number][];
  /** Stroke color (default #0066CC) */
  color?: string;
  /** Stroke width in px (default 3) */
  width?: number;
  /** Stroke opacity 0–1 (default 1) */
  opacity?: number;
}

export interface MapRadius {
  /** [longitude, latitude] center */
  center: [number, number];
  /** Radius in kilometres */
  radiusKm: number;
  /** Fill and outline color (default #0066CC) */
  color?: string;
  /** Fill opacity 0–1 (default 0.15) */
  opacity?: number;
}
