import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { Spot } from '@islandhub/domain';
import { minutesToDrive } from '@islandhub/domain';
import { LucideArrowRight, LucideCheck, LucideClock, LucideX } from '@lucide/angular';
import { LibChipComponent, LibChipVariant } from '../chip/chip.component';

@Component({
  selector: 'lib-route-stop-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, LibChipComponent, LucideArrowRight, LucideCheck, LucideClock, LucideX],
  templateUrl: './route-stop-card.component.html',
  styleUrl: './route-stop-card.component.scss',
  host: { class: 'rd-stop-card' },
})
export class LibRouteStopCardComponent {
  @Input({ required: true }) spot!: Spot;
  @Input() driveFromPrevMinutes = 0;
  @Input() distanceKm = 0;
  @Input() variant: LibChipVariant = 'neutral';
  @Input() removable = true;

  @Output() readonly remove = new EventEmitter<void>();

  protected minutesToDrive(minutes: number): string {
    return minutesToDrive(minutes);
  }
}
