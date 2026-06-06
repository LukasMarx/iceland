import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../api-base-url.token';

export interface PlaceItem {
  id: string;
  name: string;
  source: string;
  sourceId: string | null;
  region: string | null;
  lat: number;
  lon: number;
  tourismType: string | null;
  stars: number | null;
  bookingState: string;
  createdAt: string;
}

export interface PlacesResponse {
  places: PlaceItem[];
  total: number;
  page: number;
}

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getPlaces(page?: number, limit?: number, search?: string, source?: string) {
    let params = new HttpParams();
    if (page !== undefined) params = params.set('page', page);
    if (limit !== undefined) params = params.set('limit', limit);
    if (search) params = params.set('search', search);
    if (source) params = params.set('source', source);
    return this.http.get<PlacesResponse>(`${this.apiBaseUrl}/admin/places`, { params });
  }

  deletePlace(id: string) {
    return this.http.delete<void>(`${this.apiBaseUrl}/admin/places/${id}`);
  }
}
