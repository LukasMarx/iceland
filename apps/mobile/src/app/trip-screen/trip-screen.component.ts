import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { AppScreenBase } from '../screen-base';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-trip-screen',
  templateUrl: './trip-screen.component.html',
  styleUrl: './trip-screen.component.scss',
})
export class TripScreenComponent extends AppScreenBase {
  protected readonly trip = computed(() => this.app.trip().trip);

  protected formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}`;
  }

  protected routeDotClass(status: string): string {
    const map: Record<string, string> = {
      green: 'dot--green',
      yellow: 'dot--yellow',
      red: 'dot--red',
      unknown: 'dot--neutral',
    };
    return map[status] ?? 'dot--neutral';
  }
}

