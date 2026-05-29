import { Directive, HostBinding, Input } from '@angular/core';

type LibButtonVariant = 'primary' | 'secondary' | 'text';
type LibButtonSize = 'md' | 'sm';

@Directive({
  selector: 'button[libButton], a[libButton]',
  standalone: true,
})
export class LibButtonDirective {
  @Input() libButton: LibButtonVariant = 'primary';
  @Input() libButtonSize: LibButtonSize = 'md';
  @Input() libButtonBlock = true;

  @HostBinding('class.lib-button') protected readonly hostClass = true;

  @HostBinding('style.display') protected readonly display = 'flex';
  @HostBinding('style.align-items') protected readonly alignItems = 'center';
  @HostBinding('style.justify-content') protected readonly justifyContent = 'center';
  @HostBinding('style.gap') protected readonly gap = '8px';

  @HostBinding('style.width') protected get width() {
    return this.libButtonBlock ? '100%' : null;
  }

  @HostBinding('style.min-height') protected get minHeight() {
    if (this.libButton === 'text') {
      return '40px';
    }

    return this.libButtonSize === 'sm' ? '48px' : '56px';
  }

  @HostBinding('style.border-radius') protected get borderRadius() {
    return this.libButtonSize === 'sm' ? '14px' : '16px';
  }

  @HostBinding('style.font-weight') protected get fontWeight() {
    return this.libButton === 'text' ? '700' : '900';
  }

  @HostBinding('style.font-size') protected readonly fontSize = '16px';
  @HostBinding('style.padding-inline') protected get paddingInline() {
    return this.libButton === 'text' ? '0' : this.libButtonSize === 'sm' ? '18px' : '20px';
  }

  @HostBinding('style.background') protected get background() {
    if (this.libButton === 'secondary') {
      return 'var(--lib-button-secondary-bg, var(--color-white, white))';
    }

    if (this.libButton === 'text') {
      return 'transparent';
    }

    return 'var(--lib-button-primary-bg, var(--color-ink, #101114))';
  }


  @HostBinding('style.color') protected get color() {
    if (this.libButton === 'secondary') {
      return 'var(--lib-button-secondary-color, var(--color-ink, #101114))';
    }

    if (this.libButton === 'text') {
      return 'var(--lib-button-text-color, var(--color-muted, var(--muted, #666a73)))';
    }

    return 'var(--lib-button-primary-color, var(--color-white, white))';
  }

  @HostBinding('style.border') protected get border() {
    return this.libButton === 'secondary'
      ? '1px solid var(--lib-button-secondary-border, var(--color-line, var(--line, #d9d9d6)))'
      : '0';
  }

  @HostBinding('style.line-height') protected readonly lineHeight = '1.1';
}