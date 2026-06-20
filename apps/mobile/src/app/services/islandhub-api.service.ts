import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AddRouteStopRequest,
  AttractionRouteSummary,
  AuthLoginRequest,
  AuthRegisterRequest,
  AuthResponse,
  CreateTodayRouteRequest,
  ExploreQuery,
  ExploreResponse,
  HealthResponse,
  HotelsSearchResponse,
  InsertPreviewResponse,
  MeResponse,
  OfflineCacheRegionRequest,
  OfflineCacheRegionResponse,
  PlacesSearchResponse,
  PlanSpotResponse,
  RouteMutationResponse,
  RouteSuggestionsResponse,
  SavedSpotsResponse,
  SaveSpotResponse,
  SocialAuthRequest,
  SpotContextResponse,
  StartSuggestedRouteRequest,
  TodayResponse,
  TripResponse,
} from '@islandhub/domain';
import {
  normalizeAuthResponse,
  normalizeExplore,
  normalizeHotelsSearch,
  normalizeInsertPreview,
  normalizeMe,
  normalizeOfflineCacheRegion,
  normalizePlacesSearch,
  normalizePlanSpot,
  normalizePlannedRouteMutation,
  normalizePreferenceUpdate,
  normalizeRouteMutation,
  normalizeRouteSuggestions,
  normalizeSavedSpots,
  normalizeSaveSpot,
  normalizeSpotContext,
  normalizeToday,
  normalizeTripResponse,
} from '@islandhub/domain';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url.token';
import type { ApiClient } from './api-client.interface';

@Injectable({ providedIn: 'root' })
export class IslandhubApiService implements ApiClient {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  register(request: AuthRegisterRequest): Promise<AuthResponse> {
    return this.post<unknown>('/auth/register', request).then((r) => normalizeAuthResponse(r));
  }

  login(request: AuthLoginRequest): Promise<AuthResponse> {
    return this.post<unknown>('/auth/login', request).then((r) => normalizeAuthResponse(r));
  }

  loginWithSocial(request: SocialAuthRequest): Promise<AuthResponse> {
    return this.post<unknown>('/auth/social', request).then((r) => normalizeAuthResponse(r));
  }

  getHealth(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/health');
  }

  getExplore(query: ExploreQuery): Promise<ExploreResponse> {
    let params = new HttpParams()
      .set('vehicle', query.vehicle ?? 'car_2wd')
      .set('showFRoads', String(query.showFRoads ?? false))
      .set('maxDriveMinutes', String(query.maxDriveMinutes ?? 90));

    if (query.statuses?.length) {
      params = params.set('status', query.statuses.join(','));
    }
    if (query.categories?.length) {
      params = params.set('category', query.categories.join(','));
    }
    if (query.date) {
      params = params.set('date', query.date);
    }

    return firstValueFrom(this.http.get<unknown>(this.url('/explore'), { params }))
      .then((r) => normalizeExplore(r));
  }

  getToday(date?: string): Promise<TodayResponse> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return firstValueFrom(this.http.get<unknown>(this.url('/today'), { params }))
      .then((r) => normalizeToday(r));
  }

  getTrip(): Promise<TripResponse> {
    return this.get<unknown>('/trip').then((r) => normalizeTripResponse(r));
  }

  getSavedSpots(): Promise<SavedSpotsResponse> {
    return this.get<unknown>('/saved-spots').then((r) => normalizeSavedSpots(r));
  }

  getRouteSuggestions(date?: string): Promise<RouteSuggestionsResponse> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return firstValueFrom(this.http.get<unknown>(this.url('/routes/suggestions'), { params }))
      .then((r) => normalizeRouteSuggestions(r));
  }

  getSpotContext(spotId: string, date?: string): Promise<SpotContextResponse> {
    const params = date ? new HttpParams().set('date', date) : undefined;
    return firstValueFrom(this.http.get<unknown>(this.url(`/spots/${spotId}/context`), { params }))
      .then((r) => normalizeSpotContext(r));
  }

  previewInsert(spotId: string, date?: string): Promise<InsertPreviewResponse> {
    return this.post<unknown>('/routes/today/insert-preview', { spotId, date })
      .then((r) => normalizeInsertPreview(r));
  }

  addRouteStop(request: AddRouteStopRequest): Promise<RouteMutationResponse> {
    return this.post<unknown>('/routes/today/stops', request)
      .then((r) => normalizeRouteMutation(r));
  }

  createTodayRoute(request: CreateTodayRouteRequest): Promise<RouteMutationResponse> {
    return this.post<unknown>('/routes/today', request)
      .then((r) => normalizeRouteMutation(r));
  }

  planSpotForLater(spotId: string): Promise<PlanSpotResponse> {
    return this.post<unknown>('/draft-days', { spotId })
      .then((r) => normalizePlanSpot(r));
  }

  startSuggestedRoute(request: StartSuggestedRouteRequest): Promise<RouteMutationResponse> {
    return this.post<unknown>('/routes/suggestions/start', request)
      .then((r) => normalizeRouteMutation(r));
  }

  markStopDone(stopId: string, date?: string): Promise<RouteMutationResponse> {
    return firstValueFrom(this.http.patch<unknown>(this.url(`/routes/today/stops/${stopId}/done`), { date }))
      .then((r) => normalizeRouteMutation(r));
  }

  saveSpot(spotId: string): Promise<SaveSpotResponse> {
    return this.post<unknown>('/saved-spots', { spotId })
      .then((r) => normalizeSaveSpot(r));
  }

  getMe(): Promise<MeResponse> {
    return this.get<unknown>('/me').then((r) => normalizeMe(r));
  }

  searchPlaces(options: { q?: string; type?: string; limit?: number } = {}): Promise<PlacesSearchResponse> {
    let params = new HttpParams().set('limit', String(options.limit ?? 10));
    if (options.q) params = params.set('q', options.q);
    if (options.type) params = params.set('type', options.type);

    return firstValueFrom(this.http.get<unknown>(this.url('/places/search'), { params }))
      .then((r) => normalizePlacesSearch(r));
  }

  searchHotels(options: { q?: string; lat?: number; lon?: number; limit?: number } = {}): Promise<HotelsSearchResponse> {
    let params = new HttpParams().set('limit', String(options.limit ?? 10));
    if (options.q) params = params.set('q', options.q);
    if (options.lat !== undefined) params = params.set('lat', String(options.lat));
    if (options.lon !== undefined) params = params.set('lon', String(options.lon));

    return firstValueFrom(this.http.get<unknown>(this.url('/hotels/search'), { params }))
      .then((r) => normalizeHotelsSearch(r));
  }

  cacheOfflineRegions(request: OfflineCacheRegionRequest): Promise<OfflineCacheRegionResponse> {
    return this.post<unknown>('/offline/cache-regions', request)
      .then((r) => normalizeOfflineCacheRegion(r));
  }

  createPlannedRoute(request: {
    title?: string;
    date?: string;
    start: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    direction: 'ONE-WAY' | 'LOOP';
    spotIds: string[];
    source: 'wizard' | 'spot_action' | 'manual' | 'suggestion' | 'draft_day';
    makeActiveToday?: boolean;
    replaceExistingToday?: boolean;
  }): Promise<{ route: AttractionRouteSummary; today?: TodayResponse; message: string }> {
    return this.post<unknown>('/routes', request)
      .then((r) => normalizePlannedRouteMutation(r));
  }

  updatePlannedRoute(routeId: string, request: {
    title?: string;
    start?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    destination?: { id?: string; name?: string; type: string; location?: { lat: number; lon: number } };
    spotIds?: string[];
    direction?: 'ONE-WAY' | 'LOOP';
  }): Promise<{ route: AttractionRouteSummary; message: string }> {
    return firstValueFrom(this.http.patch<unknown>(this.url(`/routes/${routeId}`), request))
      .then((r) => normalizePlannedRouteMutation(r));
  }

  addPlannedStop(routeId: string, spotId: string): Promise<{ route: AttractionRouteSummary; message: string }> {
    return this.post<unknown>(`/routes/${routeId}/stops`, { spotId, position: 'recommended' })
      .then((r) => normalizePlannedRouteMutation(r));
  }

  updatePreferences(request: Partial<MeResponse['preferences']> & { safety?: Partial<MeResponse['safety']> }): Promise<Pick<MeResponse, 'preferences' | 'safety'>> {
    return firstValueFrom(this.http.patch<unknown>(this.url('/me/preferences'), request))
      .then((r) => normalizePreferenceUpdate(r));
  }

  private get<TResponse>(path: string): Promise<TResponse> {
    return firstValueFrom(this.http.get<TResponse>(this.url(path)));
  }

  private post<TResponse>(path: string, body: unknown): Promise<TResponse> {
    return firstValueFrom(this.http.post<TResponse>(this.url(path), body));
  }

  private url(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }
}
