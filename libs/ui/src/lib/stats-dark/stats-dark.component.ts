import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'lib-stats-dark',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
	styles: [
		`
			:host {
				display: grid;
				grid-template-columns: repeat(4, 1fr);
				align-items: stretch;
				gap: 0;
				margin-top: 0;
				margin-bottom: 20px;
				padding: 0;
				border-radius: 16px;
				overflow: hidden;
				background: #101114;
				color: white;
			}
		`,
	],
})
export class LibStatsDarkComponent {}
