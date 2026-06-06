import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LibButtonDirective } from '@islandhub/ui';
import { ImportOsmService, ImportResult } from './import-osm.service';

@Component({
  selector: 'app-import-osm',
  standalone: true,
  imports: [FormsModule, LibButtonDirective],
  templateUrl: './import-osm.html',
  styleUrl: './import-osm.scss',
})
export class ImportOsmComponent {
  private readonly importService = inject(ImportOsmService);

  readonly loading = signal(false);
  readonly result = signal<ImportResult | null>(null);
  readonly error = signal<string | null>(null);
  readonly fileName = signal<string | null>(null);
  readonly file = signal<File | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const f = input.files?.[0];
    if (f) {
      this.file.set(f);
      this.fileName.set(f.name);
      this.error.set(null);
    }
  }

  startImport(): void {
    const f = this.file();
    if (!f) return;

    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    this.importService.importFromGeoJson(f).subscribe({
      next: (res) => {
        this.result.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        const msg =
          err.error?.message ??
          err.message ??
          'Import fehlgeschlagen. Bitte versuche es erneut.';
        this.error.set(msg);
        this.loading.set(false);
      },
    });
  }

  reset(): void {
    this.result.set(null);
    this.error.set(null);
    this.file.set(null);
    this.fileName.set(null);
  }

  typeLabel(type: string): string {
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
    return labels[type] ?? type;
  }

  typeKeys(types: Record<string, number>): string[] {
    return Object.keys(types).sort();
  }
}
