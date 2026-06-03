import { ChangeDetectionStrategy, Component, Input, model } from '@angular/core';

export type LibSwitchValue = 'left' | 'right';
export type LibSwitchSize = 'md' | 'lg';

@Component({
  selector: 'lib-switch',
  standalone: true,
  templateUrl: './switch.component.html',
  styleUrl: './switch.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'lib-switch-host',
    '[attr.data-selected]': 'value()',
    '[attr.data-size]': 'size',
    '[attr.aria-disabled]': 'disabled',
  },
})
export class LibSwitchComponent {
  readonly value = model<LibSwitchValue>('left');
  @Input() size: LibSwitchSize = 'lg';
  @Input() disabled = false;
  @Input() ariaLabel = 'Switch options';

  protected readonly leftValue: LibSwitchValue = 'left';
  protected readonly rightValue: LibSwitchValue = 'right';

  protected isSelected(option: LibSwitchValue): boolean {
    return this.value() === option;
  }

  protected setValue(option: LibSwitchValue): void {
    if (this.disabled || option === this.value()) {
      return;
    }

    this.value.set(option);
  }
}