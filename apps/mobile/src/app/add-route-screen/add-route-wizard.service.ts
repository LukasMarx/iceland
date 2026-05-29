import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface WizardBase {
  id: string;
  name: string;
  region: string;
  type: 'hotel' | 'home' | 'airport';
  location: { lat: number; lon: number };
}

export interface WizardHotel {
  id: string;
  name: string;
  region: string;
  distanceKm: number;
  stars: number;
  location: { lat: number; lon: number };
}

export const WIZARD_BASES: WizardBase[] = [
  { id: 'reykjavik', name: 'Reykjavík', region: 'Capital Region', type: 'hotel', location: { lat: 64.1466, lon: -21.9426 } },
  { id: 'selfoss', name: 'Selfoss', region: 'South Iceland', type: 'home', location: { lat: 63.9331, lon: -20.9971 } },
  { id: 'reykholt-cabin', name: 'Reykholt Cabin', region: 'South Iceland', type: 'home', location: { lat: 64.663, lon: -21.292 } },
  { id: 'vik', name: 'Vík', region: 'South Iceland', type: 'home', location: { lat: 63.4186, lon: -19.006 } },
  { id: 'akureyri', name: 'Akureyri', region: 'North Iceland', type: 'hotel', location: { lat: 65.6885, lon: -18.1262 } },
  { id: 'hofn', name: 'Höfn', region: 'East Iceland', type: 'home', location: { lat: 64.2497, lon: -15.202 } },
];

export const KEFLAVIK_BASE: WizardBase = {
  id: 'keflavik-airport',
  name: 'Keflavík Airport',
  region: 'Capital Region',
  type: 'airport',
  location: { lat: 63.985, lon: -22.6056 },
};

export const WIZARD_HOTELS: WizardHotel[] = [
  { id: 'ion-adventure', name: 'ION Adventure Hotel', region: 'Golden Circle', distanceKm: 58, stars: 4, location: { lat: 64.13, lon: -20.95 } },
  { id: 'hotel-ranga', name: 'Hotel Rangá', region: 'South Iceland', distanceKm: 132, stars: 4, location: { lat: 63.65, lon: -20.05 } },
  { id: 'hotel-hamar', name: 'Hotel Hamar', region: 'West Iceland', distanceKm: 112, stars: 3, location: { lat: 64.53, lon: -22.18 } },
  { id: 'hotel-skafta', name: 'Hótel Skaftá', region: 'South Iceland', distanceKm: 178, stars: 3, location: { lat: 63.67, lon: -18.20 } },
  { id: 'hotel-budir', name: 'Hotel Búðir', region: 'Snæfellsnes', distanceKm: 164, stars: 4, location: { lat: 64.83, lon: -23.36 } },
  { id: 'fosshotel-glacier', name: 'Fosshotel Glacier', region: 'East Iceland', distanceKm: 248, stars: 3, location: { lat: 64.05, lon: -16.35 } },
];

@Injectable({ providedIn: 'root' })
export class AddRouteWizardService {
  readonly flow = signal<'create' | 'edit'>('create');
  readonly editingRouteId = signal<string | null>(null);
  readonly editingRouteTitle = signal<string | null>(null);
  readonly base = signal<WizardBase | null>(null);
  readonly tripType = signal<'return' | 'one-way' | null>(null);
  readonly endHotel = signal<WizardHotel | null>(null);
  readonly selectedStopIds = signal<string[]>([]);
  readonly sheetExpanded = signal(false);
  readonly step = signal<1 | 2 | 3 | 4 | 5>(1);

  readonly bases = WIZARD_BASES;
  readonly hotels = WIZARD_HOTELS;
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
  }

  selectBase(base: WizardBase): void {
    this.base.set(base);
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
    const hotel = WIZARD_HOTELS.find((h) => h.id === hotelId);
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
}
