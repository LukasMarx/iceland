import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
	selector: 'lib-empty-state',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="empty-state">
			<strong>{{ title }}</strong>
			<span>{{ message }}</span>
		</div>
	`,
	styles: [
		`
			:host {
				display: block;
			}

			.empty-state {
				display: grid;
				place-content: center;
				min-height: 132px;
				padding: 18px;
				border: 1px dashed var(--color-line, var(--line, #d9d9d6));
				border-radius: 16px;
				color: var(--color-muted, var(--muted, #666a73));
				text-align: center;
			}

			strong {
				color: var(--color-ink, var(--ink, #101114));
			}
		`,
	],
})
export class LibEmptyStateComponent {
	@Input() title = '';
	@Input() message = '';
}