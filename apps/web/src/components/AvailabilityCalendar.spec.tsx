import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AvailabilityCalendar,
  type AvailabilityCalendarProps,
  type DayStatus,
} from './AvailabilityCalendar';

function renderCalendar(props: Partial<AvailabilityCalendarProps> = {}) {
  const onMonthChange = vi.fn();
  render(
    <AvailabilityCalendar
      month="2026-10-01"
      minMonth="2026-09-01"
      maxMonth="2027-08-01"
      onMonthChange={onMonthChange}
      getDayStatus={() => 'available'}
      {...props}
    />,
  );
  return { onMonthChange };
}

describe('AvailabilityCalendar', () => {
  it('lays a month out in weeks from Monday', () => {
    renderCalendar();
    const october = screen.getByRole('grid', { name: 'October 2026' });
    // The weekday header is hidden from the accessibility tree; rows are weeks.
    const [firstWeek] = within(october).getAllByRole('row');
    const days = within(firstWeek).getAllByRole('gridcell');

    // 1 October 2026 is a Thursday.
    expect(days.slice(0, 3).map((day) => day.textContent)).toEqual([
      '',
      '',
      '',
    ]);
    expect(days[3]).toHaveAccessibleName('Thursday, 1 October 2026, available');
  });

  it('labels each day with its status and the highlighted stay', () => {
    const statuses: Record<string, DayStatus> = {
      '2026-10-01': 'past',
      '2026-10-02': 'unavailable',
      '2026-10-03': 'unknown',
    };
    renderCalendar({
      getDayStatus: (day) => statuses[day] ?? 'available',
      highlight: { from: '2026-10-04', to: '2026-10-06' },
    });

    for (const name of [
      'Thursday, 1 October 2026, in the past',
      'Friday, 2 October 2026, unavailable',
      'Saturday, 3 October 2026, loading',
      'Sunday, 4 October 2026, available, your dates',
      'Monday, 5 October 2026, available, your dates',
      // The departure day is not part of the stay.
      'Tuesday, 6 October 2026, available',
    ]) {
      expect(screen.getByRole('gridcell', { name })).toBeInTheDocument();
    }
  });

  it('moves one month at a time', async () => {
    const user = userEvent.setup();
    const { onMonthChange } = renderCalendar();

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(onMonthChange.mock.calls).toEqual([['2026-11-01'], ['2026-09-01']]);
  });

  it.each([
    ['Previous month', { month: '2026-09-01' }],
    ['Next month', { month: '2027-08-01' }],
  ])('stops %s at the limit', async (button, props) => {
    const user = userEvent.setup();
    const { onMonthChange } = renderCalendar(props);

    await user.click(screen.getByRole('button', { name: button }));

    expect(onMonthChange).not.toHaveBeenCalled();
  });
});
