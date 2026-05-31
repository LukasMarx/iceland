import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { AuthenticatedUser } from './authenticated-user.interface';

interface RequestContextState {
  user?: AuthenticatedUser;
  activeTripId?: string;
  activeHubId?: string;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextState>();

  run<T>(callback: () => T): T {
    return this.storage.run({}, callback);
  }

  setAuthState(state: {
    user: AuthenticatedUser;
    activeTripId?: string | null;
    activeHubId?: string | null;
  }) {
    const store = this.storage.getStore();
    if (!store) return;

    store.user = state.user;
    store.activeTripId = state.activeTripId ?? undefined;
    store.activeHubId = state.activeHubId ?? undefined;
  }

  clearAuthState() {
    const store = this.storage.getStore();
    if (!store) return;

    delete store.user;
    delete store.activeTripId;
    delete store.activeHubId;
  }

  hasAuthenticatedUser(): boolean {
    return !!this.storage.getStore()?.user;
  }

  getUser(): AuthenticatedUser | undefined {
    return this.storage.getStore()?.user;
  }

  getUserId(): string | undefined {
    return this.getUser()?.userId;
  }

  getTripId(): string | undefined {
    return this.storage.getStore()?.activeTripId;
  }

  getHubId(): string | undefined {
    return this.storage.getStore()?.activeHubId;
  }
}