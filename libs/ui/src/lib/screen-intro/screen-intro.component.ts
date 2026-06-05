import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
	selector: 'lib-screen-intro',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="screen-intro">
			<div class="screen-intro-header">
				<div class="screen-intro-title-wrap">
					@if (kicker) {
						<p class="screen-intro-kicker">{{ kicker }}</p>
					}
					<h1 [class]="titleClass || ''">{{ title }}</h1>
				</div>
				<ng-content select="[screenIntroAction]"></ng-content>
			</div>
			@if (subtitle) {
				<p class="screen-intro-subtitle">{{ subtitle }}</p>
			}
			<ng-content select="[screenIntroSubtitle]"></ng-content>
		</div>
	`,
	styles: [
		`
			:host {
				display: block;
			}

			.screen-intro {
				display: block;
			}

			.screen-intro-header {
				display: flex;
				align-items: flex-end;
				justify-content: space-between;
				gap: 12px;
			}

			.screen-intro-title-wrap {
				flex: 1;
				min-width: 0;
			}

			.screen-intro-kicker {
				margin: 0;
				color: var(--color-muted, var(--muted, #666a73));
				font-family: var(--font-family-mono, "SFMono-Regular", Consolas, monospace);
				font-size: 13px;
				letter-spacing: 0;
				line-height: 1.2;
				text-transform: uppercase;
			}

			h1 {
				max-width: var(--screen-intro-title-max-width, 360px);
				margin: 8px 0 0;
				font-family: var(--screen-intro-title-font-family, inherit);
				font-size: var(--screen-intro-title-font-size, 34px);
				font-style: var(--screen-intro-title-font-style, normal);
				font-weight: var(--screen-intro-title-font-weight, 700);
				line-height: var(--screen-intro-title-line-height, 1.04);
			}

			.screen-intro-subtitle {
				margin: 18px 0 0;
				color: var(--color-muted, var(--muted, #666a73));
				font-size: 16px;
				line-height: 1.35;
			}
		`,
	],
})
export class LibScreenIntroComponent {
	@Input() kicker = '';
	@Input() title = '';
	@Input() subtitle = '';
	@Input() titleClass = '';
}