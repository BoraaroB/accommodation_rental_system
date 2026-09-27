import {
  addMonths,
  startOfMonth,
  today,
  type DateRange,
  type IsoDate,
} from '@ars/shared';
import { useState } from 'react';

/** How far ahead availability calendars go: the first month shown is at most a year away (D-060). */
const MAX_MONTHS_AHEAD = 11;

/**
 * The months of an availability calendar: from the current month to a year
 * ahead, opening on the month of `start` (today by default). `shown` is the
 * two months on screen from today on, which the API answers for (one month on
 * phones, so the next one is already loaded).
 */
export function useCalendarMonths(start?: IsoDate) {
  const firstDay = today();
  const minMonth = startOfMonth(firstDay);
  const maxMonth = addMonths(minMonth, MAX_MONTHS_AHEAD);
  const [month, setMonth] = useState(() => {
    const startMonth = startOfMonth(start ?? firstDay);
    return startMonth > maxMonth ? maxMonth : startMonth;
  });
  const shown: DateRange = {
    from: month < firstDay ? firstDay : month,
    to: addMonths(month, 2),
  };
  return { firstDay, minMonth, maxMonth, month, setMonth, shown };
}
