import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
	selector: 'lib-stats-dark-child',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<span class="title">{{ title() }}</span><span class="value">{{ value() }}</span>`,
	styles: [
		`
			:host {
				display: flex;
                flex-direction: column;
                gap: 4px;
                padding: 16px;
                flex: 1 1 0;
                box-sizing: border-box;
            }

            :host(:not(:last-child)) {
                border-right: 1px solid rgba(255, 255, 255, 0.12);
			}

            .title {
                font-size: 14px;
                color: #d0cbc3;
                text-transform: uppercase;
                font-family: var(--font-family-mono);
            }

            .value {
                font-size: 22px;
                font-weight: bold;
                color: white;
            }
		`,
	],
})
export class LibStatsDarkChildComponent {
	readonly title = input('title');
	readonly value = input<string | number>('value');
}
