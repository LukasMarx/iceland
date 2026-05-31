import { HttpErrorResponse } from '@angular/common/http';
import { computed, Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthResponse, AuthUser } from '@islandhub/api-contracts';
import { IslandhubApiService } from './islandhub-api.service';
import { SocialAuthClientService } from './social-auth-client.service';

type AuthMode = 'none' | 'guest' | 'authenticated';
type AuthStep = 'email' | 'password';
type PasswordFlow = 'login' | 'register';

interface StoredAuthSession {
  mode: AuthMode;
  accessToken?: string;
  user?: AuthUser;
  email?: string;
}

const AUTH_STORAGE_KEY = 'islandhub.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(IslandhubApiService);
  private readonly router = inject(Router);
  private readonly socialAuthClient = inject(SocialAuthClientService);
  private readonly storage = this.resolveStorage();

  readonly mode = signal<AuthMode>('none');
  readonly accessToken = signal<string | null>(null);
  readonly user = signal<AuthUser | null>(null);
  readonly ready = signal(false);
  readonly step = signal<AuthStep>('email');
  readonly email = signal('');
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly passwordFlow = signal<PasswordFlow>('login');

  readonly hasSessionChoice = computed(() => this.mode() !== 'none');
  readonly isAuthenticated = computed(() => this.mode() === 'authenticated' && !!this.accessToken());
  readonly isGuest = computed(() => this.mode() === 'guest');
  readonly isRestoringSession = computed(() => !this.ready() && this.mode() === 'authenticated');
  readonly emailLabel = computed(() => this.email().trim().toLowerCase());
  readonly displayName = computed(() => {
    const currentUser = this.user();
    if (currentUser?.displayName) {
      return currentUser.displayName;
    }

    const localPart = this.emailLabel().split('@')[0] ?? 'traveller';
    return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Traveller';
  });

  constructor() {
    void this.initialize();
  }

  async refreshAuthenticatedSession(): Promise<boolean> {
    if (this.mode() !== 'authenticated' || !this.accessToken()) {
      this.ready.set(true);
      return false;
    }

    try {
      const me = await this.api.getMe();
      this.user.set({
        id: me.user.id,
        displayName: me.user.displayName,
        initials: me.user.initials,
        email: me.user.email,
      });
      this.email.set(me.user.email || this.emailLabel());
      this.persistSession();
      this.ready.set(true);
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        this.expireSession();
        return false;
      }

      this.ready.set(true);
      return false;
    }
  }

  continueWithEmail(rawEmail: string, flow: PasswordFlow = 'login'): boolean {
    const email = rawEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.error.set('Enter a valid email address.');
      return false;
    }

    this.email.set(email);
    this.step.set('password');
    this.passwordFlow.set(flow);
    this.error.set(null);
    this.info.set(null);
    this.persistSession();
    return true;
  }

  backToEmailStep(flow: PasswordFlow = 'login'): void {
    this.step.set('email');
    this.passwordFlow.set(flow);
    this.error.set(null);
    this.info.set(null);
  }

  setPasswordFlow(flow: PasswordFlow): void {
    this.passwordFlow.set(flow);
    this.error.set(null);
    this.info.set(null);
  }

  async submitPassword(rawPassword: string): Promise<boolean> {
    const password = rawPassword.trim();
    if (!password) {
      this.error.set('Enter your password.');
      return false;
    }
    if (this.passwordFlow() === 'register' && password.length < 8) {
      this.error.set('Use at least 8 characters for a new password.');
      return false;
    }

    this.pending.set(true);
    this.error.set(null);
    this.info.set(null);

    try {
      const response = this.passwordFlow() === 'register'
        ? await this.api.register({ email: this.emailLabel(), password, displayName: this.displayName() })
        : await this.api.login({ email: this.emailLabel(), password });

      this.finishAuthentication(response);
      return true;
    } catch {
      this.error.set(
        this.passwordFlow() === 'register'
          ? 'Could not create the account right now.'
          : 'Email and password do not match. You can try again or create an account.',
      );
      return false;
    } finally {
      this.pending.set(false);
    }
  }

  async continueWithSocial(provider: 'google' | 'apple'): Promise<boolean> {
    this.pending.set(true);
    this.error.set(null);
    this.info.set(null);

    try {
      const { idToken } = provider === 'google'
        ? await this.socialAuthClient.signInWithGoogle()
        : await this.socialAuthClient.signInWithApple();

      const response = await this.api.loginWithSocial({
        provider,
        idToken,
        displayName: this.displayName(),
      });

      this.finishAuthentication(response);
      return true;
    } catch {
      this.error.set(`${provider === 'google' ? 'Google' : 'Apple'} sign-in failed. Check the ID token and client configuration.`);
      return false;
    } finally {
      this.pending.set(false);
    }
  }

  continueAsGuest(): void {
    this.mode.set('none');
    this.accessToken.set(null);
    this.user.set(null);
    this.ready.set(true);
    this.step.set('email');
    this.passwordFlow.set('login');
    this.error.set('You need an account to continue.');
    this.info.set(null);
    this.persistSession();
    void this.router.navigateByUrl('/auth');
  }

  signOut(): void {
    this.mode.set('none');
    this.accessToken.set(null);
    this.user.set(null);
    this.ready.set(true);
    this.step.set('email');
    this.passwordFlow.set('login');
    this.error.set(null);
    this.info.set(null);
    this.persistSession();
    void this.router.navigateByUrl('/auth');
  }

  expireSession(): void {
    this.mode.set('none');
    this.accessToken.set(null);
    this.user.set(null);
    this.ready.set(true);
    this.step.set('email');
    this.passwordFlow.set('login');
    this.error.set('Your session expired. Sign in again.');
    this.info.set(null);
    this.persistSession();
    void this.router.navigateByUrl('/auth');
  }

  showPasswordResetHint(): void {
    this.info.set('Password reset is not wired yet in this prototype.');
    this.error.set(null);
  }

  showMagicLinkHint(): void {
    this.info.set('Magic links are not wired yet in this prototype.');
    this.error.set(null);
  }

  private finishAuthentication(response: AuthResponse): void {
    this.mode.set('authenticated');
    this.accessToken.set(response.accessToken);
    this.user.set(response.user);
    this.ready.set(true);
    this.email.set(response.user.email || this.emailLabel());
    this.step.set('email');
    this.passwordFlow.set('login');
    this.error.set(null);
    this.info.set(null);
    this.persistSession();
    void this.router.navigateByUrl('/setup');
  }

  private async initialize(): Promise<void> {
    this.restoreSession();

    if (this.mode() !== 'authenticated' || !this.accessToken()) {
      this.ready.set(true);
      return;
    }

    await this.refreshAuthenticatedSession();
  }

  private restoreSession(): void {
    const rawSession = this.storage?.getItem(AUTH_STORAGE_KEY);
    if (!rawSession) {
      return;
    }

    try {
      const session = JSON.parse(rawSession) as StoredAuthSession;
      if (session.mode === 'guest') {
        this.storage?.removeItem(AUTH_STORAGE_KEY);
        return;
      }

      this.mode.set(session.mode ?? 'none');
      this.accessToken.set(session.accessToken ?? null);
      this.user.set(session.user ?? null);
      this.email.set(session.email ?? session.user?.email ?? '');
    } catch {
      this.storage?.removeItem(AUTH_STORAGE_KEY);
    }
  }

  private persistSession(): void {
    if (!this.storage) {
      return;
    }

    if (this.mode() === 'none') {
      this.storage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    const session: StoredAuthSession = {
      mode: this.mode(),
      email: this.emailLabel(),
    };

    if (this.mode() === 'authenticated') {
      session.accessToken = this.accessToken() ?? undefined;
      session.user = this.user() ?? undefined;
    }

    this.storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  private resolveStorage(): Storage | null {
    return typeof window === 'undefined' ? null : window.localStorage;
  }
}