import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LibInputComponent, LibButtonDirective } from '@islandhub/ui';
import { SpotService } from '../spot.service';

@Component({
  selector: 'app-spot-create',
  standalone: true,
  imports: [ReactiveFormsModule, LibInputComponent, LibButtonDirective],
  templateUrl: './spot-create.html',
  styleUrl: './spot-create.scss',
})
export class SpotCreateComponent {
  private readonly spotService = inject(SpotService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

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

  error: string | null = null;
  submitting = false;

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

    this.error = null;
    this.submitting = true;

    const v = this.form.value;

    const translations: Array<{ locale: string; name: string; shortDescription?: string; longDescription?: string; safetyNotes?: string }> = [
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

    this.spotService.createSpot(payload).subscribe({
      next: () => {
        this.router.navigateByUrl('/spots');
      },
      error: (err) => {
        this.submitting = false;
        if (err.status === 400 && err.error?.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Failed to create spot. Please try again.';
        }
      },
    });
  }

  cancel(): void {
    this.router.navigateByUrl('/spots');
  }
}