import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PhotonFeature {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    country?: string;
  };
}

export interface PhotonResponse {
  features: PhotonFeature[];
}

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private apiUrl = 'https://photon.komoot.io/api/';
  private http = inject(HttpClient);

  searchAddress(query: string): Observable<string[]> {
    return this.http
      .get<PhotonResponse>(
        `${this.apiUrl}?q=${encodeURIComponent(query)}&lang=de&lat=64.9631&lon=-19.0208`,
      )
      .pipe(
        map((response) => {
          return response.features.map((feature) => {
            const p = feature.properties;
            return [p.name, p.street, p.housenumber, p.postcode, p.city]
              .filter(
                (teil) => teil !== undefined && teil !== null && teil !== '',
              )
              .join(', ');
          });
        }),
      );
  }
}
