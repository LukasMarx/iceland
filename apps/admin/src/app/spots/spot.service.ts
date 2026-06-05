import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../api-base-url.token';

@Injectable({ providedIn: 'root' })
export class SpotService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getSpots(page?: number, limit?: number, search?: string) {
    let params = new HttpParams();
    if (page !== undefined) params = params.set('page', page);
    if (limit !== undefined) params = params.set('limit', limit);
    if (search) params = params.set('search', search);
    return this.http.get<any>(`${this.apiBaseUrl}/admin/spots`, { params });
  }

  getSpot(id: string) {
    return this.http.get<any>(`${this.apiBaseUrl}/admin/spots/${id}`);
  }

  createSpot(data: any) {
    return this.http.post<any>(`${this.apiBaseUrl}/admin/spots`, data);
  }

  updateSpot(id: string, data: any) {
    return this.http.patch<any>(`${this.apiBaseUrl}/admin/spots/${id}`, data);
  }

  deleteSpot(id: string) {
    return this.http.delete<void>(`${this.apiBaseUrl}/admin/spots/${id}`);
  }

  uploadImages(spotId: string, files: File[]) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    return this.http.post<any[]>(`${this.apiBaseUrl}/admin/spots/${spotId}/images`, formData);
  }

  reorderImages(spotId: string, imageIds: string[]) {
    return this.http.put<any[]>(`${this.apiBaseUrl}/admin/spots/${spotId}/images/reorder`, { imageIds });
  }

  deleteImage(spotId: string, imageId: string) {
    return this.http.delete<any>(`${this.apiBaseUrl}/admin/spots/${spotId}/images/${imageId}`);
  }
}
