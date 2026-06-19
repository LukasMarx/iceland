import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'lib-wizard-body',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
	styles: [
		`
			:host {
				display: flex;
				flex: 1;
				flex-direction: column;
				max-height: 100lvh;
			}
		`,
	],
})
export class LibWizardBodyComponent {}
