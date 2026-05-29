import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  AddRouteStopRequest,
  CreateTodayRouteRequest,
  ExploreQuery,
  ExploreResponse,
  HealthResponse,
  InsertPreviewResponse,
  PlanSpotResponse,
  RouteMutationResponse,
  RouteSuggestionsResponse,
  SavedSpotsResponse,
  SaveSpotResponse,
  SpotContextResponse,
  StartSuggestedRouteRequest,
  TodayResponse,
  TripResponse,
} from '@islandhub/api-contracts';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api-base-url.token';

@Injectable({ providedIn: 'root' })
export class IslandhubApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getHealth(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/health');
  }

  getExplore(query: ExploreQuery): Promise<ExploreResponse> {
    const params = new HttpParams({
      fromObject: {
        status: query.statuses?.join(',') ?? '',
        category: query.categories?.join(',') ?? '',
        vehicle: query.vehicle ?? 'car_2wd',
        showFRoads: String(query.showFRoads ?? false),
        maxDriveMinutes: String(query.maxDriveMinutes ?? 90),
      },
    });

    return firstValueFrom(this.http.get<ExploreResponse>(this.url('/explore'), { params }));
  }

  getToday(): Promise<TodayResponse> {
    return this.get<TodayResponse>('/today');
  }

  getTrip(): Promise<TripResponse> {
    return this.get<TripResponse>('/trip');
  }

  getSavedSpots(): Promise<SavedSpotsResponse> {
    return this.get<SavedSpotsResponse>('/saved-spots');
  }

  getRouteSuggestions(): Promise<RouteSuggestionsResponse> {
    return this.get<RouteSuggestionsResponse>('/routes/suggestions');
  }

  getSpotContext(spotId: string): Promise<SpotContextResponse> {
    return this.get<SpotContextResponse>(`/spots/${spotId}/context`);
  }

  previewInsert(spotId: string): Promise<InsertPreviewResponse> {
    return this.post<InsertPreviewResponse>('/routes/today/insert-preview', { spotId });
  }

  addRouteStop(request: AddRouteStopRequest): Promise<RouteMutationResponse> {
    return this.post<RouteMutationResponse>('/routes/today/stops', request);
  }

  createTodayRoute(request: CreateTodayRouteRequest): Promise<RouteMutationResponse> {
    return this.post<RouteMutationResponse>('/routes/today', request);
  }

  planSpotForLater(spotId: string): Promise<PlanSpotResponse> {
    return this.post<PlanSpotResponse>('/draft-days', { spotId });
  }

  startSuggestedRoute(request: StartSuggestedRouteRequest): Promise<RouteMutationResponse> {
    return this.post<RouteMutationResponse>('/routes/suggestions/start', request);
  }

  markStopDone(stopId: string): Promise<RouteMutationResponse> {
    return firstValueFrom(this.http.patch<RouteMutationResponse>(this.url(`/routes/today/stops/${stopId}/done`), null));
  }

  saveSpot(spotId: string): Promise<SaveSpotResponse> {
    return this.post<SaveSpotResponse>('/saved-spots', { spotId });
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
