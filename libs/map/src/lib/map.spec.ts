import { projectIcelandPoint } from './map';

describe('map', () => {
  it('projects Iceland coordinates into a bounded canvas', () => {
    const point = projectIcelandPoint('hub', 'Reykholt Cabin', { lat: 64.663, lon: -21.292 });

    expect(point.x).toBeGreaterThanOrEqual(5);
    expect(point.x).toBeLessThanOrEqual(95);
    expect(point.y).toBeGreaterThanOrEqual(8);
    expect(point.y).toBeLessThanOrEqual(92);
  });
});
