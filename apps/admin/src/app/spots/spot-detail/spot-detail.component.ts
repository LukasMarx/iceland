import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LibInputComponent, LibButtonDirective } from '@islandhub/ui';
import { API_BASE_URL } from '../../api-base-url.token';
import { SpotService } from '../spot.service';

@Component({
  selector: 'app-spot-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LibInputComponent, LibButtonDirective],
  templateUrl: './spot-detail.html',
  styleUrl: './spot-detail.scss',
})
export class SpotDetailComponent implements OnInit {
  private readonly spotService = inject(SpotService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly apiBaseUrl: string = inject(API_BASE_URL);

  readonly form = this.fb.group({
    nameEn: ['', Validators.required],
    nameDe: [''],
    nameIs: [''],
    slug: ['', Validators.required],
    region: [''],
    lat: [null as number | null, [Validators.required, Validators.min(-90), Validators.max(90)]],
    lon: [null as number | null, [Validators.required, Validators.min(-180), Validators.max(180)]],
    visitMinutes: [30 as number | null],
    minVehicle: ['unknown'],
    isFRoad: [false],
    isPublished: [false],
  });

  spotId = '';
  readonly spot = signal<any>(null);
  readonly images = signal<any[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly uploadError = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly draggedIndex = signal<number | null>(null);

  ngOnInit(): void {
    this.spotId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.spotId) {
      this.error.set('Missing spot ID.');
      this.loading.set(false);
      return;
    }
    this.loadSpot();
  }

  private loadSpot(): void {
    this.loading.set(true);
    this.error.set(null);
    this.spotService.getSpot(this.spotId).subscribe({
      next: (spot) => {
        this.spot.set(spot);
        this.images.set(spot.media ?? []);
        this.patchForm(spot);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load spot.');
        this.loading.set(false);
      },
    });
  }

  private patchForm(spot: any): void {
    const en = spot.translations?.find((t: any) => t.locale === 'en');
    const de = spot.translations?.find((t: any) => t.locale === 'de');
    const is = spot.translations?.find((t: any) => t.locale === 'is');

    this.form.patchValue({
      nameEn: en?.name ?? '',
      nameDe: de?.name ?? '',
      nameIs: is?.name ?? '',
      slug: spot.slug,
      region: spot.region ?? '',
      lat: spot.lat,
      lon: spot.lon,
      visitMinutes: spot.visitMinutes ?? 30,
      minVehicle: spot.minVehicle ?? 'unknown',
      isFRoad: spot.isFRoad ?? false,
      isPublished: spot.isPublished ?? false,
    });
  }

  parseNum(value: string | null): number | null {
    if (!value) return null;
    const n = Number(value);
    return isNaN(n) ? null : n;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set(null);
    this.saving.set(true);

    const v = this.form.value;
    const translations: Array<{ locale: string; name: string }> = [
      { locale: 'en', name: v.nameEn! },
    ];
    if (v.nameDe) translations.push({ locale: 'de', name: v.nameDe });
    if (v.nameIs) translations.push({ locale: 'is', name: v.nameIs });

    const payload = {
      slug: v.slug!,
      region: v.region || undefined,
      lat: v.lat!,
      lon: v.lon!,
      defaultLocale: 'en',
      visitMinutes: v.visitMinutes ?? 30,
      minVehicle: v.minVehicle ?? 'unknown',
      isFRoad: v.isFRoad ?? false,
      isPublished: v.isPublished ?? false,
      translations,
    };

    this.spotService.updateSpot(this.spotId, payload).subscribe({
      next: (updated) => {
        this.spot.set(updated);
        this.images.set(updated.media ?? []);
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        if (err.status === 400 && err.error?.message) {
          this.error.set(err.error.message);
        } else {
          this.error.set('Failed to update spot.');
        }
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.uploadError.set(null);
    this.uploading.set(true);
    const files = Array.from(input.files);

    this.spotService.uploadImages(this.spotId, files).subscribe({
      next: (created) => {
        this.images.update((current) => [...current, ...created]);
        this.uploading.set(false);
        input.value = '';
      },
      error: () => {
        this.uploadError.set('Failed to upload images.');
        this.uploading.set(false);
      },
    });
  }

  deleteImage(imageId: string): void {
    if (!confirm('Remove this image?')) return;

    this.spotService.deleteImage(this.spotId, imageId).subscribe({
      next: () => {
        this.images.update((current) => current.filter((img: any) => img.id !== imageId));
      },
      error: () => {
        this.error.set('Failed to delete image.');
      },
    });
  }

  onDragStart(index: number): void {
    this.draggedIndex.set(index);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(index: number): void {
    const fromIndex = this.draggedIndex();
    if (fromIndex === null || fromIndex === index) {
      this.draggedIndex.set(null);
      return;
    }

    const items = [...this.images()];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(index, 0, moved);
    this.images.set(items);
    this.draggedIndex.set(null);

    this.spotService.reorderImages(this.spotId, items.map((img: any) => img.id)).subscribe({
      next: (reordered) => {
        this.images.set(reordered);
      },
    });
  }

  onDragEnd(): void {
    this.draggedIndex.set(null);
  }

  imageUrl(image: any): string {
    if (!image?.url) return '';
    if (image.url.startsWith('http://') || image.url.startsWith('https://')) return image.url;
    const base = this.apiBaseUrl.replace(/\/api$/, '');
    return `${base}${image.url}`;
  }

  deleteSpot(): void {
    if (!confirm('Are you sure you want to delete this spot?')) return;
    this.spotService.deleteSpot(this.spotId).subscribe({
      next: () => this.router.navigateByUrl('/spots'),
      error: () => { this.error.set('Failed to delete spot.'); },
    });
  }
}
