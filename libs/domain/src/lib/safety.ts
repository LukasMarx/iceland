import type { Spot } from './types';

export type SafetyStatus = 'green' | 'yellow' | 'red' | 'unknown';

export const statusRank: Record<SafetyStatus, number> = {
  green: 0,
  yellow: 1,
  unknown: 2,
  red: 3,
};

export const statusCopy: Record<SafetyStatus, { label: string; icon: string }> = {
  green: { label: 'Open', icon: 'check' },
  yellow: { label: 'Caution', icon: 'alert' },
  red: { label: 'Closed', icon: 'block' },
  unknown: { label: 'No data', icon: 'help' },
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
