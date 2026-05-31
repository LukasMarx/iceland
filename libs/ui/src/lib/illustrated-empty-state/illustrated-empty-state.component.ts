import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { LibButtonDirective } from '../button/button.directive';
import { LucideArrowRight, LucideNavigation, LucideRoute } from '../icons';

type IllustratedEmptyStateVariant = 'route' | 'today';

@Component({
  selector: 'lib-illustrated-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, LibButtonDirective, LucideArrowRight, LucideNavigation, LucideRoute],
  template: `
    <section class="illustrated-empty-state" [ngClass]="variant" [attr.data-testid]="testId || null">
      <div class="illustration" aria-hidden="true">
        @if (variant === 'route') {
          <div class="route-node start"></div>
          <div class="route-path"></div>
          <div class="route-node finish"><svg lucideRoute [size]="16" /></div>
        } @else {
          <div class="today-path"></div>
          <div class="today-node start">A</div>
          <div class="today-node active"></div>
          <div class="today-node finish"><svg lucideNavigation [size]="16" /></div>
        }
      </div>

      <div class="copy">
        <h2>{{ title }}</h2>
        <p>{{ message }}</p>
      </div>

      @if (actionLabel) {
        <button class="primary-action" [attr.data-testid]="actionTestId || null" libButton="primary" (click)="action.emit()">
          {{ actionLabel }} <svg lucideArrowRight [size]="16" />
        </button>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .illustrated-empty-state {
        display: grid;
        gap: 18px;
        justify-items: center;
        padding: 28px 22px 20px;
        border: 1px solid rgba(16, 17, 20, 0.12);
        border-radius: 28px;
        background:
          radial-gradient(circle at top, rgba(255, 255, 255, 0.92), rgba(255, 253, 250, 0.98)),
          linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(247, 242, 234, 0.95));
        box-shadow: 0 14px 32px rgba(16, 17, 20, 0.05);
        text-align: center;
      }

      .illustration {
        position: relative;
        width: min(100%, 240px);
        height: 86px;
        margin: 2px auto 0;
      }

      .copy {
        display: grid;
        gap: 12px;
      }

      h2,
      p {
        margin: 0;
      }

      h2 {
        font-size: 38px;
        line-height: 1;
        letter-spacing: -0.04em;
        color: #101114;
      }

      p {
        max-width: 280px;
        color: #414650;
        font-size: 18px;
        line-height: 1.45;
      }

      .primary-action {
        justify-content: center;
        width: 100%;
        min-height: 56px;
        --lib-button-primary-radius: 18px;
        font-size: 17px;
        font-weight: 800;
      }

      .route-path {
        position: absolute;
        inset: 16px 30px 8px;
        border-top: 2px dashed rgba(93, 100, 111, 0.55);
        border-radius: 999px;
        transform: rotate(-7deg);
      }

      .route-path::before,
      .route-path::after {
        content: '';
        position: absolute;
        width: 38%;
        height: 22px;
        border-bottom: 2px dashed rgba(93, 100, 111, 0.55);
        border-radius: 999px;
      }

      .route-path::before {
        left: 8%;
        top: -2px;
        transform: rotate(22deg);
      }

      .route-path::after {
        right: 4%;
        top: 12px;
        transform: rotate(-18deg);
      }

      .route-node,
      .today-node {
        position: absolute;
        display: grid;
        place-items: center;
        border: 1px solid rgba(16, 17, 20, 0.14);
        border-radius: 50%;
        box-shadow: 0 8px 18px rgba(16, 17, 20, 0.08);
      }

      .route-node {
        top: 22px;
        width: 28px;
        height: 28px;
        background: rgba(255, 253, 250, 0.96);
        color: #101114;
      }

      .route-node::after {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: currentColor;
      }

      .route-node.start {
        left: 18px;
      }

      .route-node.finish {
        right: 10px;
        top: 10px;
        width: 32px;
        height: 32px;
        background: #101114;
        color: #fffdfa;
      }

      .route-node.finish::after {
        display: none;
      }

      .today-path {
        position: absolute;
        left: 32px;
        right: 32px;
        top: 40px;
        border-top: 2px dashed rgba(93, 100, 111, 0.55);
      }

      .today-node {
        top: 22px;
        width: 34px;
        height: 34px;
        background: rgba(255, 253, 250, 0.98);
        color: #101114;
        font-size: 12px;
        font-weight: 800;
      }

      .today-node.start {
        left: 12px;
      }

      .today-node.active {
        left: calc(50% - 17px);
        border: 4px solid #efe4ca;
        background: #d6a545;
      }

      .today-node.active::after {
        content: '';
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #fffdfa;
      }

      .today-node.finish {
        right: 12px;
        top: 14px;
        background: #101114;
        color: #fffdfa;
      }

      .today-node.finish::after,
      .today-node.start::after {
        display: none;
      }
    `,
  ],
})
export class LibIllustratedEmptyStateComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) message = '';
  @Input({ required: true }) actionLabel = '';
  @Input() variant: IllustratedEmptyStateVariant = 'route';
  @Input() testId = '';
  @Input() actionTestId = '';

  @Output() readonly action = new EventEmitter<void>();
}