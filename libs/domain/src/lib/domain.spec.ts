import { sortBySafetyThenDrive, highestStatusFor, estimateDriveMinutes, type SafetyStatus } from './safety';
import type { Spot } from './types';

describe('domain — safety', () => {
  it('sorts safer statuses before risky statuses', () => {
    const base = {
      region: 'South Iceland',
      category: 'Waterfall',
      location: { lat: 64, lon: -20 },
      distanceKm: 1,
      stayMinutes: 30,
      tags: [],
      isFRoad: false,
      status: {
        spotId: 'spot',
        label: 'Open',
        reasons: [],
        roadStatus: 'open',
        weatherStatus: 'current',
        vehicleCompatibility: '2WD ok',
        sourceTimestamps: [],
        calculatedAt: '',
        validUntil: '',
        version: 1,
      },
    } satisfies Omit<Spot, 'id' | 'name' | 'driveMinutes' | 'status'> & { status: Omit<Spot['status'], 'status'> };

    const sorted = sortBySafetyThenDrive([
      { ...base, id: 'closed', name: 'Closed', driveMinutes: 10, status: { ...base.status, spotId: 'closed', status: 'red' } },
      { ...base, id: 'open', name: 'Open', driveMinutes: 30, status: { ...base.status, spotId: 'open', status: 'green' } },
      { ...base, id: 'caution', name: 'Caution', driveMinutes: 5, status: { ...base.status, spotId: 'caution', status: 'yellow' } },
    ]);

    expect(sorted.map((spot) => spot.id)).toEqual(['open', 'caution', 'closed']);
  });
});

describe('highestStatusFor', () => {
  const makeSpot = (status: SafetyStatus) => ({
    status: { status },
  }) as Pick<Spot, 'status'>;

  it('returns green for an empty list', () => {
    expect(highestStatusFor([])).toBe('green');
  });

  it('returns the worst status among spots', () => {
    expect(highestStatusFor([makeSpot('green'), makeSpot('yellow')])).toBe('yellow');
    expect(highestStatusFor([makeSpot('green'), makeSpot('red')])).toBe('red');
    expect(highestStatusFor([makeSpot('yellow'), makeSpot('unknown')])).toBe('unknown');
  });

  it('returns red when any spot is red', () => {
    expect(highestStatusFor([makeSpot('green'), makeSpot('yellow'), makeSpot('red')])).toBe('red');
  });
});

describe('estimateDriveMinutes', () => {
  it('returns at least 8 minutes', () => {
    expect(estimateDriveMinutes(0)).toBe(8);
    expect(estimateDriveMinutes(10)).toBe(8);
    expect(estimateDriveMinutes(39)).toBe(8);
  });

  it('scales with driveMinutes / 5', () => {
    expect(estimateDriveMinutes(50)).toBe(10);
    expect(estimateDriveMinutes(100)).toBe(20);
    expect(estimateDriveMinutes(250)).toBe(50);
  });
});
