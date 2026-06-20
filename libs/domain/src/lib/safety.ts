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
