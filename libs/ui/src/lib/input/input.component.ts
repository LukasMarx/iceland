import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';

@Component({
  selector: 'lib-input',
  standalone: true,
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibInputComponent {
  readonly value = model('');
  readonly id = input<string | null>(null);
  readonly type = input('text');
  readonly placeholder = input('');
  readonly autocomplete = input<string | null>(null);
  readonly inputMode = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly autofocus = input(false, { transform: booleanAttribute });
  readonly showPasswordToggle = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | null>(null);
  readonly dataTestId = input<string | null>(null);
  readonly toggleTestId = input<string | null>(null);
  readonly showPasswordLabel = input('SHOW');
  readonly hidePasswordLabel = input('HIDE');

  protected readonly passwordVisible = signal(false);
  protected readonly isPasswordField = computed(() => this.type() === 'password');
  protected readonly hasPasswordToggle = computed(() => this.isPasswordField() && this.showPasswordToggle());
  protected readonly resolvedType = computed(() => (this.hasPasswordToggle() && this.passwordVisible() ? 'text' : this.type()));
  protected readonly effectiveAriaLabel = computed(() => this.ariaLabel() || this.placeholder() || null);

  protected handleInput(nextValue: string): void {
    this.value.set(nextValue);
  }

  protected togglePasswordVisibility(): void {
    if (this.disabled()) {
      return;
    }

    this.passwordVisible.update((visible) => !visible);
  }
}