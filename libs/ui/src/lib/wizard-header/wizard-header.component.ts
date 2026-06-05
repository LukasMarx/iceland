import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideChevronLeft } from '../icons';

@Component({
	selector: 'lib-wizard-header',
	standalone: true,
	imports: [LucideChevronLeft],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<header class="lib-wizard-header" data-testid="wizard-header">
			<button
				type="button"
				class="lib-wizard-header-back"
				[attr.aria-label]="backAriaLabel"
				data-testid="wizard-header-back"
				(click)="back.emit()"
			>
				<svg lucideChevronLeft [size]="22" aria-hidden="true"></svg>
			</button>

			<div class="lib-wizard-header-steps" aria-hidden="true">
				@for (dot of stepDots(); track dot) {
					<span class="lib-wizard-header-step-dot" [class.active]="dot === step"></span>
				}
			</div>

			<span class="lib-wizard-header-label" data-testid="wizard-header-label">Step {{ step }} of {{ totalSteps }}</span>
		</header>
	`,
	styles: [
		`
			:host {
				display: block;
				height: 48px;
			}

			.lib-wizard-header {
				display: flex;
				align-items: center;
				gap: 14px;
				color: var(--color-ink, #101114);
				position: absolute;
				z-index: 10;
			}

			.lib-wizard-header-back {
				display: grid;
				place-items: center;
				flex: 0 0 auto;
				width: 44px;
				height: 44px;
				border: 1px solid var(--color-line, #e6e3dd);
				border-radius: 999px;
				background: rgba(255, 255, 255, 0.92);
				box-shadow: 0 2px 10px rgba(16, 17, 20, 0.08);
				color: inherit;
				cursor: pointer;
			}

			.lib-wizard-header-steps {
				display: flex;
				align-items: center;
				gap: 8px;
				flex: 0 0 auto;
			}

			.lib-wizard-header-step-dot {
				display: block;
				width: 10px;
				height: 10px;
				border-radius: 999px;
				background: #d8d4cc;
				transition: width 0.2s ease, background-color 0.2s ease;
			}

			.lib-wizard-header-step-dot.active {
				width: 34px;
				background: var(--color-ink, #101114);
			}

			.lib-wizard-header-label {
				min-width: 0;
				color: #666a73;
				font-size: 13px;
				font-weight: 500;
				letter-spacing: 0.01em;
				line-height: 1.2;
				white-space: nowrap;
			}

			:host-context(.wizard-map-step) .lib-wizard-header {
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				z-index: 10;
				background: linear-gradient(to bottom, rgba(245, 240, 232, 0.96) 60%, transparent);
			}

			@media (max-width: 380px) {
				.lib-wizard-header {
					gap: 10px;
				}

				.lib-wizard-header-step-dot.active {
					width: 28px;
				}

				.lib-wizard-header-label {
					font-size: 12px;
				}
			}
		`,
	],
})
export class LibWizardHeaderComponent {
	@Input({ required: true }) step!: number;
	@Input({ required: true }) totalSteps!: number;
	@Input() backAriaLabel = 'Go back';
	@Output() readonly back = new EventEmitter<void>();

	protected stepDots(): number[] {
		return Array.from({ length: Math.max(this.totalSteps, 0) }, (_, index) => index + 1);
	}
}