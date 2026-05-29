import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';

type AppHarness = App & {
  openSpot(spot: typeof mockSpot): void;
  saveSelectedSpot(): Promise<void>;
  skipSetup(): void;
  setMaxDriveMinutes(maxDriveMinutes: number): void;
  setShowFRoads(showFRoads: boolean): void;
};

describe('App', () => {
  const originalFetch = globalThis.fetch;
  let requestedUrls: string[];

  beforeEach(async () => {
    requestedUrls = [];
    globalThis.fetch = (async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      requestedUrls.push(url);

      return {
        ok: true,
        json: async () => mockApiResponse(url),
      } as Response;
    }) as typeof fetch;

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders the IslandHub onboarding promise', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/setup');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("See what's open today");
  });

  it('reloads Explore from the API when filters change', async () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance as unknown as AppHarness;
    await fixture.whenStable();

    requestedUrls = [];
    component.skipSetup();
    component.setShowFRoads(true);
    await fixture.whenStable();

    expect(requestedUrls.some((url) => url.includes('/api/explore?') && url.includes('showFRoads=true') && url.includes('maxDriveMinutes=180'))).toBe(true);

    requestedUrls = [];
    component.setMaxDriveMinutes(180);
    await fixture.whenStable();

    expect(requestedUrls.some((url) => url.includes('/api/explore?') && url.includes('showFRoads=true') && url.includes('maxDriveMinutes=180'))).toBe(true);
  });

  it('saves the selected spot through the API', async () => {
    const fixture = TestBed.createComponent(App);
    const component = fixture.componentInstance as unknown as AppHarness;
    await fixture.whenStable();

    requestedUrls = [];
    component.openSpot(mockSpot);
    await fixture.whenStable();
    await component.saveSelectedSpot();

    expect(requestedUrls.some((url) => url.includes('/api/saved-spots'))).toBe(true);
  });
});

function mockApiResponse(url: string) {
  if (url.includes('/health')) {
    return { status: 'ok', service: 'islandhub-api', mode: 'seed', version: 'test', checkedAt: '2026-05-25T07:42:00.000Z' };
  }

  if (url.includes('/today')) {
    return {
      title: 'Wind-light loop',
      dateLabel: 'Today - Thu 14 May',
      recheckedMinutesAgo: 8,
      stopProgress: '2/4',
      driveMinutes: 200,
      daylightLeft: '14h 32',
      update: 'Status updated.',
      stops: [],
    };
  }

  if (url.includes('/trip')) {
    return {
      trip: {
        title: 'Iceland spring run',
        dates: 'May 13-22',
        vehicle: 'car_2wd',
        pace: 'Relaxed',
        hub: mockHub,
        days: [],
      },
    };
  }

  if (url.includes('/routes/suggestions')) {
    return {
      savedSpots: [mockSpot],
      routes: [
        {
          id: 'wind-light-loop',
          title: 'Wind-light loop',
          summary: 'Geysir',
          driveMinutes: 74,
          stops: 1,
          distanceKm: 52,
          highestStatus: 'green',
          spotIds: ['geysir'],
          daylight: 'Comfortable day trip',
          reason: 'Best conditions for your saved waterfalls today.',
        },
      ],
    };
  }

  if (url.includes('/spots/geysir/context')) {
    return {
      spot: mockSpot,
      primaryAction: 'Add to today route',
      secondaryAction: 'Save spot',
      sourceSummary: 'Seed status shaped like official road and weather data.',
    };
  }

  if (url.includes('/saved-spots')) {
    return {
      savedSpotIds: ['geysir'],
      spots: [mockSpot],
      spot: mockSpot,
      message: 'Geysir saved to your trip list.',
    };
  }

  return {
    hub: mockHub,
    dateLabel: 'Today, Thu 14 May',
    vehicle: 'car_2wd',
    dataAgeMinutes: 8,
    spots: [mockSpot],
    smartRoutes: [
      {
        id: 'wind-light-loop',
        title: 'Wind-light loop',
        summary: 'Avoids Route 1 gusts.',
        driveMinutes: 200,
        stops: 4,
        distanceKm: 72,
        highestStatus: 'yellow',
      },
    ],
  };
}

const mockHub = {
  id: 'hub-reykholt',
  name: 'Reykholt Cabin',
  location: { lat: 64.663, lon: -21.292 },
  dateRange: '13-22 May',
  nights: 9,
};

const mockSpot = {
  id: 'geysir',
  name: 'Geysir',
  region: 'South Iceland',
  category: 'Geothermal',
  location: { lat: 64.313, lon: -20.300 },
  driveMinutes: 37,
  distanceKm: 52,
  stayMinutes: 35,
  tags: ['geothermal'],
  isFRoad: false,
  status: {
    spotId: 'geysir',
    status: 'green',
    label: 'Open',
    reasons: ['Roads open.'],
    roadStatus: 'Route 1 open',
    weatherStatus: 'Current',
    vehicleCompatibility: '2WD ok',
    sourceTimestamps: [],
    calculatedAt: '2026-05-25T07:42:00.000Z',
    validUntil: '2026-05-25T08:42:00.000Z',
    version: 1,
  },
};
