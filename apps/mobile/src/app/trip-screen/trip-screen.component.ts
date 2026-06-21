import { NgClass, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { formatDuration, routeDotClass } from '@islandhub/domain';
import { AppStateService } from '../services/app-state.service';
import { LibScreenComponent, LibBottomSheetComponent, LibCalendarComponent } from '@islandhub/ui';

@Component({
  imports: [NgClass, UpperCasePipe, LibScreenComponent, LibBottomSheetComponent, LibCalendarComponent],
  selector: 'app-trip-screen',
  templateUrl: './trip-screen.component.html',
  styleUrl: './trip-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripScreenComponent {
  protected readonly app = inject(AppStateService);

  protected readonly trip = computed(() => this.app.trip().trip);
  protected readonly bottomSheetExpanded = signal(false);
  protected readonly hasDates = computed(() => !!this.app.trip().trip.dates || this.app.setupSelectedDates().length > 0);

  protected toggleSheet(): void {
    this.bottomSheetExpanded.update((v) => !v);
  }

  protected onRangeSelected(range: { start: string; end: string; dates: string[] }): void {
    this.app.setSetupDateRange(range.start, range.end);
    this.bottomSheetExpanded.set(false);
  }

  protected formatDuration(minutes: number): string {
    return formatDuration(minutes);
  }

  protected routeDotClass(status: string): string {
    return routeDotClass(status);
  }
}
