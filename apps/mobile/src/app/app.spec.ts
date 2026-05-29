import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { Spot } from '@islandhub/domain';
import { API_BASE_URL } from './api-base-url.token';
import { App } from './app';
import { AppStateService } from './app-state.service';
import { appRoutes } from './app.routes';

describe('App', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(appRoutes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000/api' },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('renders the IslandHub onboarding promise', async () => {
    const fixture = TestBed.createComponent(App);
    await flushInitialApi(http);
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
    const appState = TestBed.inject(AppStateService);
    await flushInitialApi(http);
    await fixture.whenStable();

    appState.skipSetup();
    appState.setShowFRoads(true);

    const showFRoadsRequest = http.expectOne((request) => request.url.endsWith('/api/explore') && request.params.get('showFRoads') === 'true' && request.params.get('maxDriveMinutes') === '180');
    showFRoadsRequest.flush(mockExploreResponse());
    await fixture.whenStable();

    appState.setMaxDriveMinutes(180);

    const maxDriveRequest = http.expectOne((request) => request.url.endsWith('/api/explore') && request.params.get('showFRoads') === 'true' && request.params.get('maxDriveMinutes') === '180');
    maxDriveRequest.flush(mockExploreResponse());
  });

  it('saves the selected spot through the API', async () => {
    const fixture = TestBed.createComponent(App);
    const appState = TestBed.inject(AppStateService);
    await flushInitialApi(http);
    await fixture.whenStable();

    appState.openSpot(mockSpot);
    http.expectOne('http://localhost:3000/api/spots/geysir/context').flush({
      spot: mockSpot,
      primaryAction: 'Add to today route',
      secondaryAction: 'Save spot',
      sourceSummary: 'Seed status shaped like official road and weather data.',
    });
    await fixture.whenStable();

    const savePromise = appState.saveSelectedSpot();
    http.expectOne('http://localhost:3000/api/saved-spots').flush({
      savedSpotIds: ['geysir'],
      spots: [mockSpot],
      spot: mockSpot,
      message: 'Geysir saved to your trip list.',
    });
    await Promise.resolve();
    await Promise.resolve();
    http.expectOne('http://localhost:3000/api/routes/suggestions').flush(mockRouteSuggestionsResponse());
    await savePromise;
  });
});

async function flushInitialApi(http: HttpTestingController): Promise<void> {
  http.expectOne('http://localhost:3000/api/health').flush({ status: 'ok', service: 'islandhub-api', mode: 'seed', version: 'test', checkedAt: '2026-05-25T07:42:00.000Z' });
  http.expectOne((request) => request.url === 'http://localhost:3000/api/explore').flush(mockExploreResponse());
  http.expectOne('http://localhost:3000/api/today').flush({
    title: 'Wind-light loop',
    dateLabel: 'Today - Thu 14 May',
    recheckedMinutesAgo: 8,
    stopProgress: '2/4',
    driveMinutes: 200,
    daylightLeft: '14h 32',
    update: 'Status updated.',
    stops: [],
  });
  http.expectOne('http://localhost:3000/api/trip').flush({
    trip: {
      title: 'Iceland spring run',
      dates: 'May 13-22',
      vehicle: 'car_2wd',
      pace: 'Relaxed',
      hub: mockHub,
      days: [],
    },
  });

  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  http.expectOne('http://localhost:3000/api/saved-spots').flush({ savedSpotIds: ['geysir'], spots: [mockSpot] });
  http.expectOne('http://localhost:3000/api/routes/suggestions').flush(mockRouteSuggestionsResponse());
}

function mockExploreResponse() {
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

function mockRouteSuggestionsResponse() {
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

const mockHub = {
  id: 'hub-reykholt',
  name: 'Reykholt Cabin',
  location: { lat: 64.663, lon: -21.292 },
  dateRange: '13-22 May',
  nights: 9,
};

const mockSpot: Spot = {
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
