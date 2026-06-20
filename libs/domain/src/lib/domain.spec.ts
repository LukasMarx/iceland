import { sortBySafetyThenDrive, type Spot } from './safety';

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
