export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface MapPoint extends GeoPoint {
  id: string;
  label: string;
  x: number;
  y: number;
}

const bounds = {
  north: 66.7,
  south: 63.2,
  west: -24.8,
  east: -13.0,
};

export function projectIcelandPoint(id: string, label: string, point: GeoPoint): MapPoint {
  const x = ((point.lon - bounds.west) / (bounds.east - bounds.west)) * 100;
  const y = ((bounds.north - point.lat) / (bounds.north - bounds.south)) * 100;

  return {
    id,
    label,
    lat: point.lat,
    lon: point.lon,
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(8, Math.min(92, y)),
  };
}
