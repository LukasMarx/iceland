import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LibInputComponent, LibButtonDirective } from '@islandhub/ui';
import { PlacesService } from './places.service';

@Component({
  selector: 'app-places-list',
  standalone: true,
  imports: [FormsModule, LibInputComponent, LibButtonDirective],
  templateUrl: './places-list.html',
  styleUrl: './places-list.scss',
})
export class PlacesListComponent {
  private readonly placesService = inject(PlacesService);

  readonly places = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));

  ngOnInit(): void {
    this.loadPlaces();
  }

  loadPlaces(): void {
    this.loading.set(true);
    this.error.set(null);
    this.placesService.getPlaces(this.page(), this.limit(), this.search() || undefined).subscribe({
      next: (response) => {
        this.places.set(response.places ?? []);
        this.total.set(response.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Fehler beim Laden der Unterkünfte.');
        this.loading.set(false);
      },
    });
  }

  onSearch(): void {
    this.page.set(1);
    this.loadPlaces();
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadPlaces();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.loadPlaces();
    }
  }

  deletePlace(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Diese Unterkunft wirklich löschen?')) return;

    this.placesService.deletePlace(id).subscribe({
      next: () => this.loadPlaces(),
      error: () => this.error.set('Fehler beim Löschen.'),
    });
  }

  sourceLabel(source: string): string {
    return source === 'osm' ? 'OSM' : source;
  }

  tourismLabel(type: string | null): string {
    const labels: Record<string, string> = {
      hotel: 'Hotel',
      guest_house: 'Gästehaus',
      hostel: 'Hostel',
      motel: 'Motel',
      chalet: 'Ferienhaus',
      apartment: 'Ferienwohnung',
      camp_site: 'Campingplatz',
      caravan_site: 'Wohnmobilstellplatz',
      wilderness_hut: 'Schutzhütte',
    };
    return type ? (labels[type] ?? type) : '—';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  }
}
