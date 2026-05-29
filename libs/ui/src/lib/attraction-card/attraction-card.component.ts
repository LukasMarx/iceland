import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Spot } from '@islandhub/domain';
import { LibButtonDirective } from '../button/button.directive';
import { LibChipComponent, LibChipVariant } from '../chip/chip.component';

@Component({
  selector: 'lib-attraction-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LibButtonDirective, LibChipComponent],
  templateUrl: './attraction-card.component.html',
  styleUrl: './attraction-card.component.scss',
  host: { class: 'attraction-card' },
})
export class LibAttractionCardComponent {
  @Input({ required: true }) spot!: Spot;
  @Input() variant: LibChipVariant = 'neutral';

  @Output() readonly openSpot = new EventEmitter<void>();
  @Output() readonly planRoute = new EventEmitter<void>();
}
