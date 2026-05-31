import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { environment } from '../environments/environment';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GooglePromptMomentNotification {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
  isDismissedMoment(): boolean;
  getNotDisplayedReason(): string;
  getSkippedReason(): string;
  getDismissedReason(): string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
  }): void;
  prompt(listener?: (notification: GooglePromptMomentNotification) => void): void;
  cancel(): void;
}

interface AppleSignInResponse {
  authorization?: {
    id_token?: string;
  };
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
    AppleID?: {
      auth: {
        init(config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state: string;
          nonce: string;
          usePopup: boolean;
        }): void;
        signIn(): Promise<AppleSignInResponse>;
      };
    };
  }
}

@Injectable({ providedIn: 'root' })
export class SocialAuthClientService {
  private readonly document = inject(DOCUMENT);

  async signInWithGoogle(): Promise<{ idToken: string }> {
    const clientId = environment.googleClientId;
    if (!clientId) {
      throw new Error('Google client ID is not configured.');
    }

    await this.loadScript('google-identity-client', 'https://accounts.google.com/gsi/client');

    const googleId = window.google?.accounts?.id;
    if (!googleId) {
      throw new Error('Google Identity Services did not load.');
    }

    return new Promise<{ idToken: string }>((resolve, reject) => {
      let settled = false;

      const finish = (callback: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        callback();
      };

      googleId.initialize({
        client_id: clientId,
        cancel_on_tap_outside: true,
        callback: (response) => {
          if (response.credential) {
            finish(() => resolve({ idToken: response.credential! }));
            return;
          }

          finish(() => reject(new Error('Google sign-in returned no ID token.')));
        },
      });

      googleId.prompt((notification) => {
        if (settled) {
          return;
        }

        if (notification.isNotDisplayed()) {
          finish(() => reject(new Error(notification.getNotDisplayedReason() || 'Google sign-in could not be displayed.')));
        } else if (notification.isSkippedMoment()) {
          finish(() => reject(new Error(notification.getSkippedReason() || 'Google sign-in was skipped.')));
        } else if (notification.isDismissedMoment()) {
          finish(() => reject(new Error(notification.getDismissedReason() || 'Google sign-in was dismissed.')));
        }
      });
    });
  }

  async signInWithApple(): Promise<{ idToken: string }> {
    const clientId = environment.appleClientId;
    if (!clientId) {
      throw new Error('Apple client ID is not configured.');
    }

    await this.loadScript(
      'apple-signin-client',
      'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
    );

    const appleAuth = window.AppleID?.auth;
    if (!appleAuth) {
      throw new Error('Apple Sign In JS did not load.');
    }

    appleAuth.init({
      clientId,
      scope: 'name email',
      redirectURI: environment.appleRedirectUri || window.location.origin,
      state: this.randomToken(),
      nonce: this.randomToken(),
      usePopup: true,
    });

    const response = await appleAuth.signIn();
    const idToken = response.authorization?.id_token;
    if (!idToken) {
      throw new Error('Apple sign-in returned no ID token.');
    }

    return { idToken };
  }

  private async loadScript(scriptId: string, src: string): Promise<void> {
    const existing = this.document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing?.dataset['loaded'] === 'true') {
      return;
    }

    if (existing) {
      await this.awaitScript(existing);
      return;
    }

    const script = this.document.createElement('script');
    script.id = scriptId;
    script.src = src;
    script.async = true;
    script.defer = true;

    const promise = this.awaitScript(script);
    this.document.head.appendChild(script);
    await promise;
  }

  private awaitScript(script: HTMLScriptElement): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      script.addEventListener('load', () => {
        script.dataset['loaded'] = 'true';
        resolve();
      }, { once: true });
      script.addEventListener('error', () => reject(new Error(`Could not load ${script.src}.`)), { once: true });
    });
  }

  private randomToken(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}