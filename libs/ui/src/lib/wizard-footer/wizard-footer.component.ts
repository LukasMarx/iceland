import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	selector: 'lib-wizard-footer',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
	styles: [
		`
			:host {
				display: block;
			}
		`,
	],
})
export class LibWizardFooterComponent {}
