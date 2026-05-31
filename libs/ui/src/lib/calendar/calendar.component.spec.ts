import type { DateClickArg } from '@fullcalendar/interaction';
import type { DayCellContentArg } from '@fullcalendar/core';
import { LibCalendarComponent } from './calendar.component';

describe('LibCalendarComponent', () => {
  let component: LibCalendarComponent;

  beforeEach(() => {
    component = new LibCalendarComponent();
    component.selectable = true;
  });

  it('selects a date range via two taps', () => {
    const emitted: Array<{ start: string; end: string; dates: string[] }> = [];
    component.rangeSelected.subscribe((range) => emitted.push(range));

    (component as any).handleDateClick({ dateStr: '2026-05-18' } as DateClickArg);

    expect((component as any).pendingStartDate()).toBe('2026-05-18');
    expect(emitted).toHaveLength(0);

    (component as any).handleDateClick({ dateStr: '2026-05-13' } as DateClickArg);

    expect(emitted).toEqual([
      {
        start: '2026-05-13',
        end: '2026-05-18',
        dates: ['2026-05-13', '2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18'],
      },
    ]);
    expect((component as any).pendingStartDate()).toBeNull();
  });

  it('highlights only the tapped start date until the end date is chosen', () => {
    component.highlightedDates = ['2026-05-01', '2026-05-02', '2026-05-03'];

    (component as any).handleDateClick({ dateStr: '2026-05-10' } as DateClickArg);

    const pendingClasses = (component as any).dayCellClassNames({ date: new Date('2026-05-10T00:00:00') } as DayCellContentArg);
    const oldRangeClasses = (component as any).dayCellClassNames({ date: new Date('2026-05-02T00:00:00') } as DayCellContentArg);

    expect(pendingClasses).toContain('lib-calendar-day--pending');
    expect(oldRangeClasses).toEqual([]);
  });

  it('re-renders the calendar immediately after the first tap', () => {
    const render = jest.fn();
    (component as any).calendarComponent = {
      getApi: () => ({ render }),
    };

    (component as any).handleDateClick({ dateStr: '2026-05-10' } as DateClickArg);

    expect(render).toHaveBeenCalledTimes(1);
  });
});