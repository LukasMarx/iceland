import { ChangeDetectionStrategy, Component, ElementRef, Input, inject } from '@angular/core';

@Component({
	selector: 'lib-option-group',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<ng-content></ng-content>`,
	styleUrl: './option-group.component.scss',
	host: {
		class: 'lib-option-group',
	},
})
export class LibOptionGroupComponent {}

@Component({
	selector: 'lib-option-group-item',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="option-item-head">
			<div class="option-item-copy">
				@if (info) {
					<span class="option-item-info">{{ info }}</span>
				}
				<h2>{{ title }}</h2>
				<p>{{ subtitle }}</p>
			</div>
			<span class="option-item-icon" aria-hidden="true">
				<ng-content select="[optionGroupIcon]"></ng-content>
			</span>
		</div>
	`,
	styleUrl: './option-group.component.scss',
	host: {
		class: 'lib-option-group-item',
		role: 'button',
		tabindex: '0',
		'[class.selected]': 'selected',
		'[attr.aria-pressed]': 'selected',
		'(keydown)': 'handleKeydown($event)',
	},
})
export class LibOptionGroupItemComponent {
	private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

	@Input({ required: true }) title = '';
	@Input({ required: true }) subtitle = '';
	@Input({ required: true }) info = '';
	@Input() selected = false;

	protected handleKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}

		event.preventDefault();
		this.elementRef.nativeElement.click();
	}
}