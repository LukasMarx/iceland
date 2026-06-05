import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { API_BASE_URL } from '../api-base-url.token';
import { authInterceptor } from '../auth.interceptor';
import { AuthService } from './auth.service';
import { appRoutes } from '../app.routes';
import { SocialAuthClientService } from '../social-auth-client.service';

describe('AuthService', () => {
  let http: HttpTestingController;
  let socialAuthClient: {
    signInWithGoogle: ReturnType<typeof vi.fn<() => Promise<{ idToken: string }>>>;
    signInWithApple: ReturnType<typeof vi.fn<() => Promise<{ idToken: string }>>>;
  };

  beforeEach(async () => {
    localStorage.clear();
    socialAuthClient = {
      signInWithGoogle: vi.fn().mockResolvedValue({ idToken: 'google-token' }),
      signInWithApple: vi.fn().mockResolvedValue({ idToken: 'apple-token' }),
    };

    await TestBed.configureTestingModule({
      providers: [
        provideRouter(appRoutes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000/api' },
        { provide: SocialAuthClientService, useValue: socialAuthClient },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('advances from email to password step', () => {
    const auth = TestBed.inject(AuthService);

    expect(auth.continueWithEmail('lukas@pixx.io')).toBe(true);
    expect(auth.step()).toBe('password');
    expect(auth.emailLabel()).toBe('lukas@pixx.io');
  });

  it('stores an authenticated session after login', async () => {
    const auth = TestBed.inject(AuthService);
    auth.continueWithEmail('lukas@pixx.io');

    const loginPromise = auth.submitPassword('Sup3rSafe!');

    http.expectOne('http://localhost:3000/api/auth/login').flush({
      accessToken: 'token-123',
      user: {
        id: 'user-1',
        displayName: 'Lukas',
        initials: 'LK',
        email: 'lukas@pixx.io',
      },
    });

    await expect(loginPromise).resolves.toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.accessToken()).toBe('token-123');
    expect(JSON.parse(localStorage.getItem('islandhub.auth.session') ?? '{}').mode).toBe('authenticated');
  });

  it('refreshes an authenticated session from /me', async () => {
    const auth = TestBed.inject(AuthService);
    auth.mode.set('authenticated');
    auth.accessToken.set('token-123');
    auth.user.set({
      id: 'user-1',
      displayName: 'Lukas',
      initials: 'LK',
      email: 'lukas@pixx.io',
    });

    const refreshPromise = auth.refreshAuthenticatedSession();

    const meRequest = http.expectOne('http://localhost:3000/api/me');
    expect(meRequest.request.headers.get('Authorization')).toBe('Bearer token-123');
    meRequest.flush({
      user: {
        id: 'user-1',
        displayName: 'Lukas K.',
        initials: 'LK',
        email: 'lukas@pixx.io',
        joinedAt: '2026-05-13T00:00:00.000Z',
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
    await expect(refreshPromise).resolves.toBe(true);

    expect(auth.ready()).toBe(true);
    expect(auth.user()?.displayName).toBe('Lukas K.');
  });

  it('keeps the stored session on transient /me failures', async () => {
    const auth = TestBed.inject(AuthService);
    auth.mode.set('authenticated');
    auth.accessToken.set('token-123');
    auth.user.set({
      id: 'user-1',
      displayName: 'Lukas',
      initials: 'LK',
      email: 'lukas@pixx.io',
    });
    auth.email.set('lukas@pixx.io');

    const refreshPromise = auth.refreshAuthenticatedSession();

    const meRequest = http.expectOne('http://localhost:3000/api/me');
    expect(meRequest.request.headers.get('Authorization')).toBe('Bearer token-123');
    meRequest.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    await expect(refreshPromise).resolves.toBe(false);

    expect(auth.ready()).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.accessToken()).toBe('token-123');
    expect(auth.error()).toBeNull();
  });

  it('expires the session on unauthorized /me responses', async () => {
    const auth = TestBed.inject(AuthService);
    auth.mode.set('authenticated');
    auth.accessToken.set('token-123');
    auth.user.set({
      id: 'user-1',
      displayName: 'Lukas',
      initials: 'LK',
      email: 'lukas@pixx.io',
    });
    auth.email.set('lukas@pixx.io');

    const refreshPromise = auth.refreshAuthenticatedSession();

    const meRequest = http.expectOne('http://localhost:3000/api/me');
    meRequest.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    await expect(refreshPromise).resolves.toBe(false);

    expect(auth.ready()).toBe(true);
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.accessToken()).toBeNull();
    expect(auth.error()).toBe('Your session expired. Sign in again.');
    expect(localStorage.getItem('islandhub.auth.session')).toBeNull();
  });

  it('uses the Google social client to exchange an ID token', async () => {
    const auth = TestBed.inject(AuthService);
    auth.continueWithEmail('lukas@pixx.io');

    const loginPromise = auth.continueWithSocial('google');
    await Promise.resolve();

    expect(socialAuthClient.signInWithGoogle).toHaveBeenCalled();
    http.expectOne('http://localhost:3000/api/auth/social').flush({
      accessToken: 'social-token',
      user: {
        id: 'user-1',
        displayName: 'Lukas',
        initials: 'LK',
        email: 'lukas@pixx.io',
      },
    });

    await expect(loginPromise).resolves.toBe(true);
    expect(auth.accessToken()).toBe('social-token');
  });
});