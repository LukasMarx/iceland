import { Injectable, inject, signal } from '@angular/core';
import type { HotelSuggestion, PlaceSuggestion } from '@islandhub/domain';
import { Subject } from 'rxjs';
import { IslandhubApiService } from '../services/islandhub-api.service';

export interface WizardBase {
  id: string;
  name: string;
  region: string;
  type: 'hotel' | 'home' | 'airport' | 'city' | 'custom' | 'hub';
  location: { lat: number; lon: number };
}

export interface WizardHotel {
  id: string;
  name: string;
  region: string;
  distanceKm: number;
  stars: number;
  location: { lat: number; lon: number };
  heroImage?: string;
}

@Injectable({ providedIn: 'root' })
export class AddRouteWizardService {
  private readonly api = inject(IslandhubApiService);

  readonly flow = signal<'create' | 'edit'>('create');
  readonly editingRouteId = signal<string | null>(null);
  readonly editingRouteTitle = signal<string | null>(null);
  readonly base = signal<WizardBase | null>(null);
  readonly tripType = signal<'return' | 'one-way' | null>(null);
  readonly endHotel = signal<WizardHotel | null>(null);
  readonly selectedStopIds = signal<string[]>([]);
  readonly sheetExpanded = signal(false);
  readonly step = signal<1 | 2 | 3 | 4 | 5>(1);
  readonly bases = signal<WizardBase[]>([]);
  readonly hotels = signal<WizardHotel[]>([]);
  readonly basesLoading = signal(false);
  readonly hotelsLoading = signal(false);

  readonly totalSteps = 5;

  /** Emits when the wizard finishes successfully. */
  readonly completed$ = new Subject<void>();
  /** Emits when the user cancels/aborts the wizard. */
  readonly cancelled$ = new Subject<void>();

  init(defaultBase: WizardBase): void {
    this.flow.set('create');
    this.editingRouteId.set(null);
    this.editingRouteTitle.set(null);
    this.base.set(defaultBase);
    this.tripType.set(null);
    this.endHotel.set(null);
    this.selectedStopIds.set([]);
    this.sheetExpanded.set(false);
    this.step.set(1);
    void this.loadBases(defaultBase);
    void this.loadHotels(defaultBase);
  }

  initEdit(defaultBase: WizardBase, routeId: string, routeTitle: string, stopIds: string[]): void {
    this.flow.set('edit');
    this.editingRouteId.set(routeId);
    this.editingRouteTitle.set(routeTitle);
    this.base.set(defaultBase);
    this.tripType.set('return');
    this.endHotel.set(null);
    this.selectedStopIds.set(stopIds);
    this.sheetExpanded.set(true);
    this.step.set(4);
    void this.loadBases(defaultBase);
    void this.loadHotels(defaultBase);
  }

  selectBase(base: WizardBase): void {
    this.base.set(base);
    this.endHotel.set(null);
    void this.loadHotels(base);
  }

  selectTripType(tripType: 'return' | 'one-way'): void {
    this.tripType.set(tripType);
  }

  selectEndHotel(hotel: WizardHotel): void {
    this.endHotel.set(hotel);
    this.sheetExpanded.set(false);
  }

  setSelectedStops(stopIds: string[]): void {
    this.selectedStopIds.set([...new Set(stopIds)]);
  }

  toggleStop(spotId: string): void {
    const current = this.selectedStopIds();
    this.selectedStopIds.set(current.includes(spotId) ? current.filter((id) => id !== spotId) : [...current, spotId]);
  }

  selectHotelFromPin(hotelId: string): void {
    const hotel = this.hotels().find((h) => h.id === hotelId);
    if (hotel) {
      this.endHotel.set(hotel);
      this.sheetExpanded.set(true);
    }
  }

  complete(): void {
    this.completed$.next();
  }

  cancel(): void {
    this.cancelled$.next();
  }

  stepDots(): number[] {
    return Array.from({ length: this.displayTotalSteps() }, (_, i) => i + 1);
  }

  displayStep(): number {
    if (this.flow() === 'edit') {
      return this.step() === 5 ? 2 : 1;
    }

    if (this.tripType() === 'return' && this.step() >= 4) {
      return this.step() - 1;
    }

    return this.step();
  }

  displayTotalSteps(): number {
    if (this.flow() === 'edit') {
      return 2;
    }

    return this.tripType() === 'return' ? 4 : this.totalSteps;
  }

  setCurrentLocation(location: { lat: number; lon: number }): void {
    this.selectBase({
      id: 'device-location',
      name: 'Current location',
      region: 'Device GPS',
      type: 'custom',
      location,
    });
  }

  private readonly FALLBACK_BASES: WizardBase[] = [
    {
      id: 'keflavik-airport',
      name: 'Keflavik Airport',
      region: 'Suðurnes',
      type: 'airport',
      location: { lat: 63.985, lon: -22.6056 },
    },
    {
      id: 'reykjavik',
      name: 'Reykjavik',
      region: 'Höfuðborgarsvæðið',
      type: 'city',
      location: { lat: 64.1466, lon: -21.9426 },
    },
  ];

  private async loadBases(defaultBase: WizardBase): Promise<void> {
    this.basesLoading.set(true);
    try {
      const response = await this.api.searchPlaces({ limit: 20 });
      const places = response.places.map((place) => this.placeToBase(place));
      this.bases.set(this.uniqueBases([defaultBase, ...places, ...this.FALLBACK_BASES]));
    } catch {
      this.bases.set(this.uniqueBases([defaultBase, ...this.FALLBACK_BASES]));
    } finally {
      this.basesLoading.set(false);
    }
  }

  private async loadHotels(base: WizardBase): Promise<void> {
    this.hotelsLoading.set(true);
    try {
      const response = await this.api.searchHotels({ lat: base.location.lat, lon: base.location.lon, limit: 3000 });
      this.hotels.set(response.hotels.map((hotel) => this.hotelToWizardHotel(hotel, base)));
    } catch {
      this.hotels.set([]);
    } finally {
      this.hotelsLoading.set(false);
    }
  }

  private placeToBase(place: PlaceSuggestion): WizardBase {
    return {
      id: place.id,
      name: place.name,
      region: place.region,
      type: place.type,
      location: place.location,
    };
  }

  private hotelToWizardHotel(hotel: HotelSuggestion, base: WizardBase): WizardHotel {
    return {
      id: hotel.id,
      name: hotel.name,
      region: hotel.region,
      distanceKm: hotel.distanceKm ?? this.distanceKm(base.location, hotel.location),
      stars: hotel.stars ?? 0,
      location: hotel.location,
      heroImage: hotel.media?.[0]?.url,
    };
  }

  private uniqueBases(bases: WizardBase[]): WizardBase[] {
    const seen = new Set<string>();
    return bases.filter((base) => {
      if (seen.has(base.id)) return false;
      seen.add(base.id);
      return true;
    });
  }

  private distanceKm(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
    const earthRadiusKm = 6371;
    const latDelta = this.toRadians(to.lat - from.lat);
    const lonDelta = this.toRadians(to.lon - from.lon);
    const fromLat = this.toRadians(from.lat);
    const toLat = this.toRadians(to.lat);
    const haversine = Math.sin(latDelta / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;
    return Math.round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)));
  }

  private toRadians(value: number): number {
    return value * Math.PI / 180;
  }
}
