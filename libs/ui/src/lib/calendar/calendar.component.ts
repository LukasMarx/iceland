import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, SimpleChanges, ViewChild, computed, signal } from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DateClickArg } from '@fullcalendar/interaction';
import type { CalendarOptions, DatesSetArg, DayCellContentArg } from '@fullcalendar/core';
import { LucideChevronLeft, LucideChevronRight } from '../icons';

@Component({
	selector: 'lib-calendar',
	standalone: true,
	imports: [FullCalendarModule, LucideChevronLeft, LucideChevronRight],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<section class="lib-calendar-shell">
			<header class="lib-calendar-head">
				<button type="button" class="lib-calendar-nav" aria-label="Previous month" (click)="navigatePrevious()">
					<svg lucideChevronLeft [size]="18" aria-hidden="true"></svg>
				</button>
				<strong>{{ currentTitle() }}</strong>
				<button type="button" class="lib-calendar-nav" aria-label="Next month" (click)="navigateNext()">
					<svg lucideChevronRight [size]="18" aria-hidden="true"></svg>
				</button>
			</header>
			<full-calendar #calendar [options]="calendarOptions"></full-calendar>
		</section>
	`,
	styles: [
		`
			:host {
				display: block;
                --fc-page-bg-color: transparent;
			}

			.lib-calendar-shell {
				padding: 0;
			}

			.lib-calendar-head {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: 12px;
			}

			.lib-calendar-head strong {
				font-size: 18px;
				font-weight: 850;
				letter-spacing: -0.02em;
			}

			.lib-calendar-nav {
				display: flex;
				align-items: center;
                justify-content: center;
				width: 36px;
				height: 36px;
				border: 1px solid var(--lib-calendar-nav-border, rgba(16, 17, 20, 0.1));
				border-radius: 999px;
				background: var(--lib-calendar-nav-bg, #fff);
				color: var(--lib-calendar-nav-color, #101114);
				line-height: 1;
				cursor: pointer;
			}

			.lib-calendar-nav:hover {
				background: var(--lib-calendar-nav-bg-hover, #f7f3ed);
			}

			.lib-calendar-selection-hint {
				margin: 14px 0 0;
				color: var(--lib-calendar-hint-color, #666a73);
				font-family: var(--font-family-mono, Consolas, monospace);
				font-size: 12px;
				font-weight: 700;
				text-transform: uppercase;
			}

			:host ::ng-deep .fc {
				margin-top: 18px;
				font-family: var(--font-family-sans, inherit);
			}

			:host ::ng-deep .fc-theme-standard td,
			:host ::ng-deep .fc-theme-standard th,
			:host ::ng-deep .fc-scrollgrid,
			:host ::ng-deep .fc-scrollgrid-section > * {
				border: 0;
			}

			:host ::ng-deep .fc-col-header-cell {
				padding-bottom: 8px;
			}

			:host ::ng-deep .fc-col-header-cell-cushion {
				padding: 0;
				color: var(--lib-calendar-weekday-color, #6a6f78);
				font-family: var(--font-family-mono, Consolas, monospace);
				font-size: 12px;
				font-weight: 700;
				text-transform: uppercase;
			}

			:host ::ng-deep .fc-daygrid-day-frame {
				min-height: 40px;
			}

			:host ::ng-deep .fc-daygrid-day-top {
				justify-content: center;
				padding-top: 2px;
			}

			:host ::ng-deep .fc-daygrid-day {
				cursor: pointer;
			}

			:host ::ng-deep .fc-daygrid-day-number {
				display: grid;
				place-items: center;
				width: 100%;
				min-height: 40px;
				padding: 0;
				border-radius: 10px;
				color: var(--lib-calendar-day-color, #2f333a);
				font-size: 17px;
			}

			:host ::ng-deep .fc-day-other {
				background: transparent;
				pointer-events: none;
				cursor: default;
			}

			:host ::ng-deep .fc-day-other .fc-daygrid-day-number {
				visibility: hidden;
			}

			:host ::ng-deep .fc-day-other .fc-daygrid-day-frame {
				background: transparent;
			}

			:host ::ng-deep .lib-calendar-day--range .fc-daygrid-day-number {
				background: var(--lib-calendar-range-bg, #e8e1d6);
			}

			:host ::ng-deep .lib-calendar-day--edge .fc-daygrid-day-number {
				background: var(--lib-calendar-edge-bg, #101114);
				color: var(--lib-calendar-edge-color, #fff);
				font-weight: 900;
			}

			:host ::ng-deep .lib-calendar-day--pending .fc-daygrid-day-number {
				outline: 2px solid var(--lib-calendar-pending-outline, #101114);
				outline-offset: -2px;
			}
		`
	],
})
export class LibCalendarComponent {
	@Input() highlightedDates: string[] = [];
	@Input() selectable = false;
	@Output() readonly rangeSelected = new EventEmitter<{ start: string; end: string; dates: string[] }>();

	@ViewChild('calendar') private calendarComponent?: FullCalendarComponent;

	protected readonly currentTitle = signal('');
	private readonly pendingStartDate = signal<string | null>(null);

	protected readonly calendarOptions: CalendarOptions = {
		plugins: [interactionPlugin, dayGridPlugin],
		initialView: 'dayGridMonth',
		headerToolbar: false,
		fixedWeekCount: false,
		showNonCurrentDates: false,
		firstDay: 1,
		height: 'auto',
		dayHeaderFormat: { weekday: 'narrow' },
		dayCellClassNames: (arg) => this.dayCellClassNames(arg),
		datesSet: (arg) => this.handleDatesSet(arg),
		dateClick: (arg) => this.handleDateClick(arg),
	};

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['selectable']) {
			if (!this.selectable) {
				this.pendingStartDate.set(null);
				this.refreshCalendarDecorations();
			}
		}

		if (changes['highlightedDates']?.currentValue) {
			this.pendingStartDate.set(null);
			this.refreshCalendarDecorations();
		}

		if (!changes['highlightedDates']) {
			return;
		}

		const firstHighlightedDate = this.highlightedDates[0];
		if (!firstHighlightedDate) {
			this.refreshCalendarDecorations();
			return;
		}

		this.calendarOptions.initialDate = firstHighlightedDate;
		this.calendarComponent?.getApi().gotoDate(firstHighlightedDate);
		this.refreshCalendarDecorations();
		this.updateCurrentTitle();
	}

	protected navigatePrevious(): void {
		this.calendarComponent?.getApi().prev();
		this.updateCurrentTitle();
	}

	protected navigateNext(): void {
		this.calendarComponent?.getApi().next();
		this.updateCurrentTitle();
	}

	private handleDatesSet(arg: DatesSetArg): void {
		this.currentTitle.set(arg.view.title);
	}

	private handleDateClick(arg: DateClickArg): void {
		if (!this.selectable) {
			return;
		}

		const clickedDate = arg.dateStr;
		const pendingStartDate = this.pendingStartDate();

		if (!pendingStartDate) {
			this.pendingStartDate.set(clickedDate);
			this.refreshCalendarDecorations();
			return;
		}

		const [start, end] = pendingStartDate <= clickedDate
			? [pendingStartDate, clickedDate]
			: [clickedDate, pendingStartDate];
		const dates = this.buildInclusiveDates(start, end);

		this.pendingStartDate.set(null);
		this.refreshCalendarDecorations();
		this.rangeSelected.emit({ start, end, dates });
	}

	private updateCurrentTitle(): void {
		const title = this.calendarComponent?.getApi().view.title;
		if (title) {
			this.currentTitle.set(title);
		}
	}

	private refreshCalendarDecorations(): void {
		this.calendarComponent?.getApi().render();
	}

	private dayCellClassNames(arg: DayCellContentArg): string[] {
		const pendingStartDate = this.pendingStartDate();
		const highlighted = pendingStartDate ? [pendingStartDate] : this.highlightedDates;
		if (highlighted.length === 0) {
			return [];
		}

		const day = this.formatDate(arg.date);
		if (!highlighted.includes(day)) {
			return [];
		}

		const classes = ['lib-calendar-day--range'];
		if (pendingStartDate === day) {
			classes.push('lib-calendar-day--pending');
		}
		if (day === highlighted[0] || day === highlighted[highlighted.length - 1]) {
			classes.push('lib-calendar-day--edge');
		}

		return classes;
	}

	private formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	private buildInclusiveDates(start: string, end: string): string[] {
		const dates: string[] = [];
		const current = new Date(`${start}T00:00:00`);
		const last = new Date(`${end}T00:00:00`);

		while (current <= last) {
			dates.push(this.formatDate(current));
			current.setDate(current.getDate() + 1);
		}

		return dates;
	}
}