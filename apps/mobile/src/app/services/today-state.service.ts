import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  AddRouteStopRequest,
  CreateTodayRouteRequest,
  TodayResponse,
} from '@islandhub/domain';
import { IslandhubApiService } from './islandhub-api.service';

const emptyToday: TodayResponse = {
  title: 'Loading today',
  dateLabel: 'Today',
  recheckedMinutesAgo: 0,
  stopProgress: '0/0',
  driveMinutes: 0,
  daylightLeft: '',
  update: 'Loading live route data.',
  stops: [],
};

/**
 * Holds today's active-route state: the current route, next stop, and
 * navigation-relevant actions (insert stop, create route from spot, mark done).
 */
@Injectable({ providedIn: 'root' })
export class TodayStateService {
  private readonly api = inject(IslandhubApiService);

  readonly today = signal<TodayResponse>(emptyToday);
  readonly activeRoute = signal(true);

  readonly nextStop = computed(() =>
    this.today().stops.find((s) => s.state === 'active') ??
    this.today().stops.find((s) => s.state === 'open'),
  );

  readonly navigationLabel = computed(() =>
    `-> Navigate to ${this.nextStop()?.title ?? 'next stop'}`,
  );

  // ---- Actions ----------------------------------------------------------

  stopTitle(stopId?: string): string | null {
    if (!stopId) return null;
    const stop = this.today().stops.find((s) => s.id === stopId || s.spotId === stopId);
    return stop?.title ?? null;
  }

  async insertRouteStop(
    spotId: string,
    position: 'recommended' | 'end',
    activeTripDate: string | undefined,
    onError: (msg: string) => void,
  ): Promise<boolean> {
    const request: AddRouteStopRequest = { spotId, position, date: activeTripDate };
    try {
      const response = await this.api.addRouteStop(request);
      this.today.set(response.today);
      this.activeRoute.set(true);
      return true;
    } catch {
      onError('Could not add the stop to the route.');
      return false;
    }
  }

  async createRouteFromSpot(
    spotId: string,
    spotName: string,
    activeTripDate: string | undefined,
    onError: (msg: string) => void,
  ): Promise<TodayResponse | null> {
    const request: CreateTodayRouteRequest = { spotId, date: activeTripDate, replaceExisting: true };
    try {
      const response = await this.api.createTodayRoute(request);
      this.today.set(response.today);
      this.activeRoute.set(true);
      return response.today;
    } catch {
      onError(`Could not create today's route for ${spotName}.`);
      return null;
    }
  }

  async markActiveStopDone(
    activeTripDate: string | undefined,
    onError: (msg: string) => void,
  ): Promise<boolean> {
    const activeStop = this.today().stops.find((s) => s.state === 'active');
    if (!activeStop) return false;

    try {
      const response = await this.api.markStopDone(activeStop.id, activeTripDate);
      this.today.set(response.today);
      return true;
    } catch {
      onError(`Could not mark ${activeStop.title} as done.`);
      return false;
    }
  }
}
