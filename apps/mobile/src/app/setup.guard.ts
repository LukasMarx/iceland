import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AppStateService } from './app-state.service';
import { AuthService } from './auth.service';

export const setupCompleteGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth']);
  }

  return appState.setupDone() ? true : router.createUrlTree(['/setup']);
};

export const setupPendingGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth']);
  }

  return appState.setupDone() ? router.createUrlTree(['/explore']) : true;
};

export const authPendingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated() ? router.createUrlTree(['/setup']) : true;
};
