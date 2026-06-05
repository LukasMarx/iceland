import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LibInputComponent, LibButtonDirective } from '@islandhub/ui';
import { API_BASE_URL } from '../../api-base-url.token';
import { SpotService } from '../spot.service';

@Component({
  selector: 'app-spots-list',
  standalone: true,
  imports: [FormsModule, RouterLink, LibInputComponent, LibButtonDirective],
  templateUrl: './spots-list.html',
  styleUrl: './spots-list.scss',
})
export class SpotsListComponent {
  private readonly spotService = inject(SpotService);
  private readonly apiBaseUrl: string = inject(API_BASE_URL);

  readonly spots = signal<any[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly page = signal(1);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));

  ngOnInit(): void {
    this.loadSpots();
  }

  loadSpots(): void {
    this.loading.set(true);
    this.error.set(null);
    this.spotService.getSpots(this.page(), this.limit(), this.search() || undefined).subscribe({
      next: (response: any) => {
        this.spots.set(response.spots ?? []);
        this.total.set(response.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load spots.');
        this.loading.set(false);
      },
    });
  }

  onSearch(): void {
    this.page.set(1);
    this.loadSpots();
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.loadSpots();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.loadSpots();
    }
  }

  deleteSpot(id: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Are you sure you want to delete this spot?')) return;

    this.spotService.deleteSpot(id).subscribe({
      next: () => {
        this.loadSpots();
      },
      error: () => {
        this.error.set('Failed to delete spot.');
      },
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  }

  imageUrl(image: any): string {
    if (!image?.url) return '';
    if (image.url.startsWith('http://') || image.url.startsWith('https://')) return image.url;
    const base = this.apiBaseUrl.replace(/\/api$/, '');
    return `${base}${image.url}`;
  }
}
