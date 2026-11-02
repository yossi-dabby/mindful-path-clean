import { isBefore, parseISO, startOfDay } from 'date-fns';

// Goal deadlines are calendar dates. Today's date is not overdue at midnight.
export function isGoalDateOverdue(value, now = new Date()) {
  if (typeof value !== 'string') return false;
  return isBefore(parseISO(value.slice(0, 10)), startOfDay(now));
}
