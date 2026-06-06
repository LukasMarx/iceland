import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api-base-url.token';

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  types: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class ImportOsmService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  importFromGeoJson(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportResult>(
      `${this.apiBaseUrl}/admin/places/import-from-geojson`,
      formData,
    );
  }
}
