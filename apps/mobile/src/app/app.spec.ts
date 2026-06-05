import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { Spot } from '@islandhub/domain';
import { API_BASE_URL } from './api-base-url.token';
import { App } from './app';
import { AppStateService } from './services/app-state.service';
import { AuthService } from './auth.service';
import { appRoutes } from './app.routes';

describe('App', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();

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
    localStorage.clear();
  });

  it('renders the IslandHub onboarding promise', async () => {
    const fixture = TestBed.createComponent(App);
    await enterAuthenticatedMode(fixture);
    await flushInitialApi(http);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/setup');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("See what's open today");
  });

  it('updates locale from the onboarding language selector', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await enterAuthenticatedMode(fixture);
    await flushInitialApi(http);
    await router.navigateByUrl('/setup');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('[data-testid="setup-locale-de"]') as HTMLButtonElement).click();

    http.expectOne('http://localhost:3000/api/me/preferences').flush({
      preferences: {
        locale: 'de',
        units: 'metric',
        temperatureUnit: 'C',
        currency: 'EUR',
      },
      safety: {
        pushAlertsTomorrowRoute: true,
        notifyStatusWorsensEnRoute: true,
        emergencyContactsCount: 0,
      },
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(compiled.querySelector('[data-testid="setup-locale-de"]')?.classList.contains('active')).toBe(true);
  });

  it('stores a selected onboarding date range and reflects it in the setup summary', async () => {
    const fixture = TestBed.createComponent(App);
    const appState = TestBed.inject(AppStateService);
    const router = TestBed.inject(Router);

    await enterAuthenticatedMode(fixture);
    await flushInitialApi(http);
    appState.setupStep.set(2);
    await router.navigateByUrl('/setup');
    fixture.detectChanges();
    await fixture.whenStable();

    appState.setSetupDateRange('2026-05-13', '2026-05-18');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(appState.setupCalendar().dates).toEqual(['2026-05-13', '2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18']);
    expect(appState.setupDateSummary().nights).toBe(5);
    expect(compiled.textContent).toContain('May 13 - May 18');
    expect(localStorage.getItem('islandhub.mobile.setup')).toContain('"rangeStart":"2026-05-13"');
    expect(localStorage.getItem('islandhub.mobile.setup')).toContain('"rangeEnd":"2026-05-18"');
  });

  it('renders the onboarding wizard header and goes back one step when pressed', async () => {
    const fixture = TestBed.createComponent(App);
    const appState = TestBed.inject(AppStateService);
    const router = TestBed.inject(Router);

    await enterAuthenticatedMode(fixture);
    await flushInitialApi(http);
    appState.setupStep.set(2);
    await router.navigateByUrl('/setup');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const headerLabel = compiled.querySelector('[data-testid="wizard-header-label"]');
    const backButton = compiled.querySelector('[data-testid="wizard-header-back"]') as HTMLButtonElement;

    expect(headerLabel?.textContent).toContain('Step 3 of 4');

    backButton.click();
    fixture.detectChanges();

    expect(appState.setupStep()).toBe(1);
    expect(localStorage.getItem('islandhub.mobile.setup')).toContain('"step":1');
  });

  it('reloads Explore from the API when filters change', async () => {
    const fixture = TestBed.createComponent(App);
    const appState = TestBed.inject(AppStateService);
    await enterAuthenticatedMode(fixture);
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
    await enterAuthenticatedMode(fixture);
    await flushInitialApi(http);
    await fixture.whenStable();

    appState.openSpot(mockSpot);
    http.expectOne('http://localhost:3000/api/spots/geysir/context').flush({
      spot: mockSpot,
      primaryAction: 'Add to today route',
      secondaryAction: 'Save spot',
      sourceSummary: 'Seed status shaped like official road and weather data.',
    });
    await settleApiStep();
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

  it('restores completed onboarding after a reload', async () => {
    const fixture = TestBed.createComponent(App);
    const appState = TestBed.inject(AppStateService);

    await enterAuthenticatedMode(fixture);
    await flushInitialApi(http);
    await fixture.whenStable();

    appState.skipSetup();

    expect(localStorage.getItem('islandhub.mobile.setup')).toBe(JSON.stringify({ done: true, step: appState.setupScreens().length - 1 }));

    const restoredState = TestBed.runInInjectionContext(() => new AppStateService());

    expect(restoredState.setupDone()).toBe(true);
    expect(restoredState.setupStep()).toBe(restoredState.setupScreens().length - 1);
  });

  it('only includes the hub step when setup planning mode is hub', async () => {
    const fixture = TestBed.createComponent(App);
    const appState = TestBed.inject(AppStateService);

    await enterAuthenticatedMode(fixture);
    await flushInitialApi(http);

    expect(appState.setupScreens()).toHaveLength(4);

    appState.selectSetupPlanningMode('hub');

    expect(appState.setupScreens()).toHaveLength(5);

    appState.selectSetupPlanningMode('draft');

    expect(appState.setupScreens()).toHaveLength(4);
  });

  it('updates vehicle selection from onboarding and refreshes Explore', async () => {
    const fixture = TestBed.createComponent(App);
    const appState = TestBed.inject(AppStateService);
    const router = TestBed.inject(Router);

    await enterAuthenticatedMode(fixture);
    await flushInitialApi(http);

    appState.setupStep.set(3);
    await router.navigateByUrl('/setup');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    (compiled.querySelector('[data-testid="setup-vehicle-4wd"]') as HTMLElement).click();

    const exploreRequest = http.expectOne((request) => request.url.endsWith('/api/explore') && request.params.get('vehicle') === 'car_4wd');
    exploreRequest.flush({ ...mockExploreResponse(), vehicle: 'car_4wd' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(appState.setupVehicle()).toBe('car_4wd');
    expect(compiled.querySelector('[data-testid="setup-vehicle-4wd"]')?.classList.contains('selected')).toBe(true);
  });

  it('shows the routes empty placeholder and hides add route buttons when no routes exist', async () => {
    const fixture = TestBed.createComponent(App);
    const appState = TestBed.inject(AppStateService);
    const router = TestBed.inject(Router);

    await enterAuthenticatedMode(fixture);
    await flushInitialApi(http, mockEmptyRouteSuggestionsResponse());
    appState.skipSetup();
    await router.navigateByUrl('/routes');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="routes-empty-state"]')?.textContent).toContain('No routes');
    expect(compiled.querySelector('[data-testid="routes-empty-primary-cta"]')?.textContent).toContain('Create your first trip');
    expect(compiled.querySelectorAll('.add-route-btn')).toHaveLength(0);
  });

  it('shows the today empty placeholder when no route has started yet', async () => {
    const fixture = TestBed.createComponent(App);
    const appState = TestBed.inject(AppStateService);
    const router = TestBed.inject(Router);

    await enterAuthenticatedMode(fixture);
    await flushInitialApi(http);
    appState.skipSetup();
    await router.navigateByUrl('/today');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="today-empty-state"]')?.textContent).toContain('No route active yet');
    expect(compiled.querySelector('[data-testid="today-empty-primary-cta"]')?.textContent).toContain('Choose a route');
    expect(compiled.querySelectorAll('.timeline li')).toHaveLength(0);
  });
});

async function flushInitialApi(http: HttpTestingController, routeSuggestionsResponse = mockRouteSuggestionsResponse()): Promise<void> {
  http.expectOne('http://localhost:3000/api/health').flush({ status: 'ok', service: 'islandhub-api', mode: 'seed', version: 'test', checkedAt: '2026-05-25T07:42:00.000Z' });
  await settleApiStep();
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
  await settleApiStep();
  const exploreRequest = http.match((request) => request.urlWithParams.includes('/api/explore'))[0];
  expect(exploreRequest).toBeTruthy();
  exploreRequest.flush(mockExploreResponse());
  await settleApiStep();
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
  await settleApiStep();
  http.expectOne('http://localhost:3000/api/me').flush({
    user: {
      id: 'user-1',
      displayName: 'Lukas',
      initials: 'LK',
      email: 'lukas@pixx.io',
      joinedAt: '2026-05-25T07:42:00.000Z',
    },
    subscription: {
      plan: 'free',
      trialAvailable: true,
      headline: 'Headline',
      subcopy: 'Subcopy',
    },
    preferences: {
      locale: 'en',
      units: 'metric',
      temperatureUnit: 'C',
      currency: 'EUR',
    },
    safety: {
      pushAlertsTomorrowRoute: true,
      notifyStatusWorsensEnRoute: true,
      emergencyContactsCount: 0,
    },
    offline: {},
  });
  await settleApiStep();

  http.expectOne('http://localhost:3000/api/saved-spots').flush({ savedSpotIds: ['geysir'], spots: [mockSpot] });
  await settleApiStep();
  http.expectOne('http://localhost:3000/api/routes/suggestions').flush(routeSuggestionsResponse);
}

async function enterAuthenticatedMode(fixture: { whenStable(): Promise<unknown> }): Promise<void> {
  const auth = TestBed.inject(AuthService);
  auth.mode.set('authenticated');
  auth.accessToken.set('token-123');
  auth.user.set({
    id: 'user-1',
    displayName: 'Lukas',
    initials: 'LK',
    email: 'lukas@pixx.io',
  });
  auth.ready.set(true);
  await fixture.whenStable();
  await settleApiStep();
}

async function settleApiStep(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
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

function mockEmptyRouteSuggestionsResponse() {
  return {
    savedSpots: [],
    routes: [],
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
