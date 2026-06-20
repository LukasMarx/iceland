import type { Spot } from './types';

export type SafetyStatus = 'green' | 'yellow' | 'red' | 'unknown';

export const statusRank: Record<SafetyStatus, number> = {
  green: 0,
  yellow: 1,
  unknown: 2,
  red: 3,
};

export function sortBySafetyThenDrive(spots: Spot[]): Spot[] {
  return [...spots].sort((left, right) => {
    const statusDelta = statusRank[left.status.status] - statusRank[right.status.status];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.driveMinutes - right.driveMinutes;
  });
}

/**
 * Returns the worst (highest-rank) safety status among a list of spots.
 * Uses statusRank: green (0) < yellow (1) < unknown (2) < red (3).
 * Returns 'green' for an empty list (no stops = no risk).
 */
export function highestStatusFor(spots: Pick<Spot, 'status'>[]): SafetyStatus {
  return spots.reduce<SafetyStatus>(
    (highest, spot) =>
      statusRank[spot.status.status] > statusRank[highest]
        ? spot.status.status
        : highest,
    'green',
  );
}

/**
 * Estimates the extra drive minutes added by detouring to a spot.
 * Uses a heuristic: max(8, round(driveMinutes / 5)).
 * This is the canonical implementation used by both route planning
 * (AddRouteStep4/5) and route creation on the server.
 */
export function estimateDriveMinutes(driveMinutesFromHub: number): number {
  return Math.max(8, Math.round(driveMinutesFromHub / 5));
}
