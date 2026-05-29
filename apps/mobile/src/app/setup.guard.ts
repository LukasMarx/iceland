import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { AppStateService } from './app-state.service';

export const setupCompleteGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const router = inject(Router);

  return appState.setupDone() ? true : router.createUrlTree(['/setup']);
};

export const setupPendingGuard: CanActivateFn = () => {
  const appState = inject(AppStateService);
  const router = inject(Router);

  return appState.setupDone() ? router.createUrlTree(['/explore']) : true;
};
