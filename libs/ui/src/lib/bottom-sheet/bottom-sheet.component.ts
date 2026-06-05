import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
	selector: 'lib-bottom-sheet',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="wizard-bottom-sheet" [class.expanded]="expanded()" [class.stops-sheet]="cssClass() === 'stops-sheet'">
			<button class="wizard-sheet-handle-row" type="button" (click)="toggle.emit()">
				<span class="wizard-sheet-handle"></span>
				<span class="wizard-sheet-peek-label">{{ peekLabel() }}</span>
			</button>
			<ng-content></ng-content>
		</div>
	`,
	styles: [
		`
			:host {
				display: contents;
			}

			.wizard-bottom-sheet {
				position: absolute;
				left: 0;
				right: 0;
				bottom: 0;
				z-index: 8;
				display: flex;
				flex-direction: column;
				max-height: 85%;
				overflow: hidden;
				border-radius: 24px 24px 0 0;
				background: white;
				box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.14);
				transition: max-height 0.35s cubic-bezier(0.32, 0, 0.18, 1);
			}

			.wizard-sheet-handle-row {
				display: flex;
				flex-shrink: 0;
				flex-direction: column;
				align-items: center;
				gap: 10px;
				padding: 14px 20px 12px;
				background: white;
				text-align: center;
				cursor: pointer;
				border: none;
				width: 100%;
			}

			.wizard-sheet-handle {
				display: block;
				width: 36px;
				height: 4px;
				border-radius: 2px;
				background: #d0cbc3;
			}

			.wizard-sheet-peek-label {
				color: var(--color-ink, #101114);
				font-size: 14px;
				font-weight: 700;
			}

			.wizard-sheet-list {
				display: grid;
				flex: 1;
				gap: 8px;
				overflow-y: auto;
				padding: 4px 16px 0;
			}

			.wizard-bottom-sheet:not(.expanded) .wizard-sheet-list {
				max-height: 148px;
				overflow: hidden;
			}

			.expanded {
				height: 60%;
			}

		`,
	],
})
export class LibBottomSheetComponent {
	readonly expanded = input.required<boolean>();
	readonly peekLabel = input.required<string>();
	readonly cssClass = input<string>('');
	readonly toggle = output<void>();
}
