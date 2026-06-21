import type { SafetyStatus } from './safety';
import type { AttractionRouteSummary, Spot } from './types';

// ---------------------------------------------------------------------------
// Pure presentation helpers — testable with plain inputs, no DI needed.
// ---------------------------------------------------------------------------

/** Maps a safety status to a CSS class suffix. */
export function statusClass(status: SafetyStatus): string {
  return `status-${status}`;
}

/**
 * Maps a safety status to a chip variant.
 * Return type is compatible with LibChipVariant from @islandhub/ui.
 */
export function statusVariant(status: SafetyStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  const map: Record<SafetyStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
    green: 'success',
    yellow: 'warning',
    red: 'danger',
    unknown: 'neutral',
  };
  return map[status];
}

/** Maps a safety status to a status icon character. */
export function statusIcon(status: SafetyStatus): string {
  const map: Record<SafetyStatus, string> = {
    green: '\u2713',
    yellow: '!',
    red: '\u2298',
    unknown: '?',
  };
  return map[status];
}

/** Maps a safety status to a human-readable label. */
export function statusLabel(status: SafetyStatus): string {
  const map: Record<SafetyStatus, string> = {
    green: 'Open',
    yellow: 'Caution',
    red: 'Closed',
    unknown: 'No data',
  };
  return map[status];
}

/** Returns a color suitable for rendering a status on a map or badge. */
export function statusColor(status: SafetyStatus): string {
  const map: Record<SafetyStatus, string> = {
    green: '#2f6f4f',
    yellow: '#c9831f',
    red: '#b42318',
    unknown: '#6b7280',
  };
  return map[status];
}

/** Returns a CSS class for a route dot based on safety status. */
export function routeDotClass(status: string): string {
  const map: Record<string, string> = {
    green: 'dot--green',
    yellow: 'dot--yellow',
    red: 'dot--red',
    unknown: 'dot--neutral',
  };
  return map[status] ?? 'dot--neutral';
}

/**
 * Formats a minute count into a compact drive-time string.
 * Examples: 90 → "1h 30", 45 → "45m"
 */
export function minutesToDrive(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours}h ${remainder.toString().padStart(2, '0')}` : `${remainder}m`;
}

/**
 * Formats a minute count as a duration label.
 * Examples: 90 → "1h 30", 60 → "1h"
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}`;
}

/**
 * Computes a human-readable summary for a route's highest safety status.
 */
export function routeStatusSummary(route: Pick<AttractionRouteSummary, 'highestStatus'>): string {
  if (route.highestStatus === 'yellow') return '1 caution';
  if (route.highestStatus === 'red') return 'Closed stop';
  if (route.highestStatus === 'unknown') return 'Needs refresh';
  return 'All open';
}

/**
 * Computes a CSS class for a route suggestion card based on its highest status
 * and position in a list.
 */
export function routeCardClass(route: Pick<AttractionRouteSummary, 'highestStatus'>, index: number): string {
  if (index === 0) return 'recommended';
  if (route.highestStatus === 'yellow') return 'caution';
  return '';
}

/**
 * Computes a CSS background style for a spot card.
 * Uses the first image media item if available; falls back to a generic gradient.
 */
export function spotBackground(
  spot: Pick<Spot, 'media'>,
  genericFallback?: string,
): string {
  const fallback = genericFallback ?? 'linear-gradient(135deg, #dfe7e2 0%, #8da39a 48%, #52655f 100%)';
  const imageUrl = spot.media?.find((m) => m.type === 'image' && m.url)?.url;
  return imageUrl
    ? `linear-gradient(145deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.24)), url("${imageUrl}")`
    : fallback;
}
