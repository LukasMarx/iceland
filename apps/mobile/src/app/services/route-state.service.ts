import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  AttractionRouteSummary,
  RouteSuggestionsResponse,
  Spot,
  StartSuggestedRouteRequest,
} from '@islandhub/domain';
import { I18nService } from '@islandhub/domain';
import { IslandhubApiService } from './islandhub-api.service';
import { RoutePlanningService } from './route-planning.service';
import { AddRouteWizardService } from '../add-route-screen/add-route-wizard.service';
import type { WizardBase } from '../add-route-screen/add-route-wizard.service';
import { ExploreStateService } from './explore-state.service';
import { TodayStateService } from './today-state.service';

type RouteSummary = AttractionRouteSummary & { suggestionId?: string; expiresAt?: string };

/**
 * Manages route suggestions, the selected route detail, and route-related
 * actions (start, edit, wizard coordination, save to trip, etc.).
 */
@Injectable({ providedIn: 'root' })
export class RouteStateService {
  private readonly api = inject(IslandhubApiService);
  private readonly routePlanning = inject(RoutePlanningService);
  private readonly wizard = inject(AddRouteWizardService);
  private readonly exploreState = inject(ExploreStateService);
  private readonly todayState = inject(TodayStateService);
  private readonly i18n = inject(I18nService);

  readonly routeSuggestions = signal<RouteSummary[]>([]);
  readonly selectedRoute = signal<RouteSummary | null>(null);

  readonly selectedRouteStops = computed(() =>
    this.routePlanning.selectedRouteStops(this.selectedRoute(), this.exploreState.explore().spots),
  );

  // ---- Actions ----------------------------------------------------------

  currentWizardBase(): WizardBase {
    const hub = this.exploreState.explore().hub;
    if (!hub.id) {
      return {
        id: 'keflavik-airport',
        name: 'Keflavik Airport',
        region: 'Su\u00f0urnes',
        type: 'airport',
        location: { lat: 63.985, lon: -22.6056 },
      };
    }
    return { id: hub.id, name: hub.name, region: 'Current trip', type: 'home', location: hub.location };
  }

  addCustomRoute(): string {
    this.wizard.init(this.currentWizardBase());
    return '/routes/add/step1';
  }

  openRouteDetail(route: RouteSummary): string {
    this.selectedRoute.set(route);
    return '/route-detail';
  }

  editRoute(route: RouteSummary): string {
    this.selectedRoute.set(route);
    this.wizard.initEdit(this.currentWizardBase(), route.id, route.title, route.spotIds);
    return '/routes/add/step4';
  }

  closeRouteDetail(): string {
    this.selectedRoute.set(null);
    return '/routes';
  }

  openBestRoute(): string | null {
    const route = this.routeSuggestions()[0];
    if (!route) return null;
    this.selectedRoute.set(route);
    return '/route-detail';
  }

  removeSpotFromSelectedRoute(spotId: string): void {
    const route = this.selectedRoute();
    if (!route) return;
    const spotIds = route.spotIds.filter((id) => id !== spotId);
    this.selectedRoute.set({ ...route, spotIds, stops: spotIds.length });
  }

  routeDetailTotalMinutes(): number {
    const route = this.selectedRoute();
    if (!route) return 0;
    const stayTotal = this.selectedRouteStops().reduce((sum, e) => sum + e.spot.stayMinutes, 0);
    return route.driveMinutes + stayTotal;
  }

  routeSpotName(spotId: string): string {
    return this.exploreState.findSpot(spotId)?.name ?? spotId;
  }

  async startRoute(
    route: RouteSummary,
    activeTripDate: string | undefined,
    onSuccess: (message: string) => void,
    onError: (msg: string) => void,
  ): Promise<string | null> {
    const request: StartSuggestedRouteRequest = {
      suggestionId: route.suggestionId ?? route.id,
      date: activeTripDate,
      replaceExisting: true,
    };
    try {
      const response = await this.api.startSuggestedRoute(request);
      this.todayState.today.set(response.today);
      onSuccess(this.i18n.t('route.started', { route: route.title }));
      this.selectedRoute.set(null);
      this.todayState.activeRoute.set(true);
      return '/today';
    } catch {
      onError(`Could not start ${route.title}.`);
      return null;
    }
  }

  async addSpotToExistingRoute(
    routeId: string,
    spotId: string,
    spotName: string,
    onSuccess: (message: string) => void,
    onError: (msg: string) => void,
  ): Promise<string | null> {
    const route = this.routeSuggestions().find((c) => c.id === routeId);
    if (!route) return null;
    try {
      const response = await this.api.addPlannedStop(routeId, spotId);
      this.routeSuggestions.update((routes) =>
        routes.map((c) => (c.id === routeId ? response.route : c)),
      );
      onSuccess(this.i18n.t('route.spotAdded', { spot: spotName, route: route.title }));
      return '/routes';
    } catch {
      onError(`Could not add ${spotName} to ${route.title}.`);
      return null;
    }
  }

  async applyWizardRouteEdit(
    onSuccess: (message: string) => void,
    onError: (msg: string) => void,
  ): Promise<string | null> {
    const route = this.selectedRoute();
    if (!route) return '/routes';
    try {
      const response = await this.api.updatePlannedRoute(route.id, {
        title: this.wizard.editingRouteTitle() ?? route.title,
        start: this.wizardBasePayload(this.wizard.base() ?? this.currentWizardBase()),
        spotIds: this.wizard.selectedStopIds(),
      });
      this.selectedRoute.set(response.route);
      this.routeSuggestions.update((routes) =>
        routes.map((c) => (c.id === response.route.id ? response.route : c)),
      );
      onSuccess(this.i18n.t('route.updated'));
      return '/route-detail';
    } catch {
      onError('Could not update route.');
      return null;
    }
  }

  async setWizardTodayRoute(
    params: {
      baseName: string;
      destinationName: string;
      selectedStops: Spot[];
      directDriveMinutes: number;
      totalDriveMinutes: number;
    },
    activeTripDate: string | undefined,
    onSuccess: (message: string) => void,
    onError: (msg: string) => void,
  ): Promise<string | null> {
    try {
      const response = await this.api.createPlannedRoute({
        title: `${params.baseName} to ${params.destinationName}`,
        date: activeTripDate,
        start: this.wizardBasePayload(this.wizard.base() ?? this.currentWizardBase()),
        destination: this.wizard.endHotel() ? this.wizardBasePayload(this.wizard.endHotel()!) : undefined,
        direction: this.wizard.tripType() === 'one-way' ? 'ONE-WAY' : 'LOOP',
        spotIds: params.selectedStops.map((s) => s.id),
        source: 'wizard',
        makeActiveToday: true,
        replaceExistingToday: true,
      });
      if (response.today) this.todayState.today.set(response.today);
      this.todayState.activeRoute.set(true);
      onSuccess(this.i18n.t('route.draftReadyToday'));
      return '/today';
    } catch {
      onError('Could not start route for today.');
      return null;
    }
  }

  async saveWizardDraftDay(
    title: string,
    activeTripDate: string | undefined,
    onSuccess: (message: string) => void,
    onError: (msg: string) => void,
    reloadData: () => Promise<void>,
  ): Promise<string | null> {
    try {
      await this.api.createPlannedRoute({
        title,
        date: activeTripDate,
        start: this.wizardBasePayload(this.wizard.base() ?? this.currentWizardBase()),
        destination: this.wizard.endHotel() ? this.wizardBasePayload(this.wizard.endHotel()!) : undefined,
        direction: this.wizard.tripType() === 'one-way' ? 'ONE-WAY' : 'LOOP',
        spotIds: this.wizard.selectedStopIds(),
        source: 'draft_day',
      });
      await reloadData();
      onSuccess(this.i18n.t('route.draftSavedToTrip'));
      return '/trip';
    } catch {
      onError('Could not save draft route.');
      return null;
    }
  }

  routeEditorComingSoonMessage(): string {
    return this.i18n.t('route.editorComingSoon');
  }

  async loadSuggestions(activeTripDate: string | undefined, onError: (msg: string) => void): Promise<string[]> {
    try {
      const response: RouteSuggestionsResponse = await this.api.getRouteSuggestions(activeTripDate);
      this.routeSuggestions.set(response.routes);
      return response.savedSpots.map((s) => s.id);
    } catch {
      onError('Could not load route suggestions.');
      return [];
    }
  }

  // ---- Private helpers ----------------------------------------------------

  private wizardBasePayload(place: { id: string; name: string; type?: string; location: { lat: number; lon: number } }) {
    return { id: place.id, name: place.name, type: place.type ?? 'hotel', location: place.location };
  }
}
