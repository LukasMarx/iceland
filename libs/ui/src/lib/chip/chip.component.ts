import {
  ChangeDetectionStrategy,
  Component,
  HostBinding,
  Input,
} from '@angular/core';

export type LibChipVariant =
  | 'default'
  | 'tag'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export type LibChipSize = 'sm' | 'md' | 'lg';

/**
 * Shared chip/pill/tag component.
 *
 * Variants:
 *   - default   – white bg + border (filter chip, inactive)
 *   - tag       – warm beige bg, no border (route/spot label)
 *   - success   – soft green bg (open status)
 *   - warning   – soft yellow bg (partial / caution status)
 *   - danger    – soft red bg (closed / danger status)
 *   - neutral   – soft gray bg (unknown status)
 *
 * Modifiers:
 *   - [active]    – dark ink bg + white text (active filter chip)
 *   - [outlined]  – transparent bg + border (info pill, e.g. "re-checked X min ago")
 *
 * Sizes:
 *   - sm  – compact status pill  (min-height: 28px)
 *   - md  – standard tag / chip  (min-height: 36px)
 *   - lg  – large scrollable filter chip (min-height: 48px)
 *
 * Usage examples:
 *   <!-- Filter chip (scrollable row) -->
 *   <button lib-chip size="lg" [active]="isActive" (click)="toggle()">Waterfall</button>
 *
 *   <!-- Wrapping filter chip -->
 *   <button lib-chip [active]="isActive" (click)="toggle()">Geothermal</button>
 *
 *   <!-- Route / spot tag -->
 *   <span lib-chip variant="tag">Snæfellsjökull</span>
 *
 *   <!-- Status pill -->
 *   <span lib-chip variant="success" size="sm">✓ Open</span>
 *
 *   <!-- Info pill (outlined) -->
 *   <span lib-chip [outlined]="true">Re-checked 5 min ago</span>
 */
@Component({
  selector: '[lib-chip]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: var(--radius-pill, 999px);
        font-weight: 850;
        white-space: nowrap;
        line-height: 1.1;
        cursor: default;
        font-family: var(--font-family-sans, system-ui, sans-serif);
        transition:
          background 0.15s,
          color 0.15s,
          border-color 0.15s;
      }
    `,
  ],
})
export class LibChipComponent {
  @Input() variant: LibChipVariant = 'default';
  @Input() size: LibChipSize = 'md';
  @Input() active = false;
  @Input() outlined = false;

  // ── Size ──────────────────────────────────────────────────────────────────

  @HostBinding('style.min-height') protected get minHeight(): string {
    if (this.size === 'sm') return '28px';
    if (this.size === 'lg') return '42px';
    return '36px';
  }

  @HostBinding('style.padding') protected get padding(): string {
    if (this.size === 'sm') return '4px 10px';
    if (this.size === 'lg') return '0 22px';
    return '8px 14px';
  }

  @HostBinding('style.font-size') protected get fontSize(): string {
    if (this.size === 'lg') return '16px';
    return '14px';
  }

  // ── Color ─────────────────────────────────────────────────────────────────

  @HostBinding('style.background') protected get background(): string {
    if (this.active)
      return 'var(--lib-chip-active-bg, var(--color-ink, #101114))';
    if (this.outlined) return 'transparent';

    switch (this.variant) {
      case 'tag':
        return 'var(--lib-chip-tag-bg, #e8e1d6)';
      case 'success':
        return 'var(--lib-chip-success-bg, var(--color-success-soft, #e6eee1))';
      case 'warning':
        return 'var(--lib-chip-warning-bg, var(--color-warning-soft, #f5ead0))';
      case 'danger':
        return 'var(--lib-chip-danger-bg, var(--color-danger-soft, #f3ddd8))';
      case 'neutral':
        return 'var(--lib-chip-neutral-bg, var(--color-neutral-soft, #ececea))';
      default:
        return 'var(--lib-chip-bg, var(--color-white, white))';
    }
  }

  @HostBinding('style.color') protected get color(): string {
    if (this.active)
      return 'var(--lib-chip-active-color, var(--color-white, white))';

    switch (this.variant) {
      case 'tag':
        return 'var(--lib-chip-tag-color, #333741)';
      case 'success':
        return 'var(--lib-chip-success-color, var(--color-success-text, #53704d))';
      case 'warning':
        return 'var(--lib-chip-warning-color, var(--color-warning-text, #835f20))';
      case 'danger':
        return 'var(--lib-chip-danger-color, var(--color-danger-text, #87352d))';
      case 'neutral':
        return 'var(--lib-chip-neutral-color, var(--color-neutral-text, #626a72))';
      default:
        return 'var(--lib-chip-color, var(--color-muted, #666a73))';
    }
  }

  @HostBinding('style.border') protected get border(): string {
    if (this.active) return '1px solid transparent';

    if (this.outlined || this.variant === 'default') {
      return '1px solid var(--lib-chip-border, var(--color-line, var(--line, #d9d9d6)))';
    }

    return '1px solid transparent';
  }
}
