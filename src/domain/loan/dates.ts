import { LocalDate } from './types';

/**
 * Returns whether a year is a leap year.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Returns the number of days in a given month of a given year.
 * month is 1-indexed (1 = January, 12 = December).
 */
export function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/**
 * Parses 'YYYY-MM-DD' into components [year, month, day].
 */
export function parseLocalDateParts(date: LocalDate): [number, number, number] {
  const parts = date.split('-').map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return [year, month, day];
}

/**
 * Formats [year, month, day] into 'YYYY-MM-DD'.
 */
export function formatLocalDateParts(year: number, month: number, day: number): LocalDate {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Validates whether string is a valid 'YYYY-MM-DD' calendar date.
 */
export function isValidLocalDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = parseLocalDateParts(date);
  if (month < 1 || month > 12) return false;
  const maxDay = daysInMonth(year, month);
  return day >= 1 && day <= maxDay;
}

/**
 * Adds months to a calendar date, preserving the day of month when possible,
 * or clamping to the last valid day of the target month (e.g. Jan 31 + 1 mo = Feb 28 or 29).
 */
export function addMonthsToDate(date: LocalDate, monthsToAdd: number): LocalDate {
  const [year, month, day] = parseLocalDateParts(date);
  const totalMonths = year * 12 + (month - 1) + monthsToAdd;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const maxDays = daysInMonth(targetYear, targetMonth);
  const targetDay = Math.min(day, maxDays);
  return formatLocalDateParts(targetYear, targetMonth, targetDay);
}

/**
 * Calculates calendar days between two dates (end - start).
 * E.g. 2026-09-15 to 2026-10-05 = 20 days.
 */
export function daysBetween(start: LocalDate, end: LocalDate): number {
  const [y1, m1, d1] = parseLocalDateParts(start);
  const [y2, m2, d2] = parseLocalDateParts(end);
  const utcA = Date.UTC(y1, m1 - 1, d1);
  const utcB = Date.UTC(y2, m2 - 1, d2);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((utcB - utcA) / msPerDay);
}

/**
 * Compares two dates. Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareDates(a: LocalDate, b: LocalDate): number {
  return a.localeCompare(b);
}

export function isBefore(a: LocalDate, b: LocalDate): boolean {
  return a < b;
}

export function isAfter(a: LocalDate, b: LocalDate): boolean {
  return a > b;
}

export function isSameOrBefore(a: LocalDate, b: LocalDate): boolean {
  return a <= b;
}

export function isSameOrAfter(a: LocalDate, b: LocalDate): boolean {
  return a >= b;
}

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Formats a LocalDate into human readable string, e.g. "05 Oct 2026".
 */
export function formatDisplayDate(date: LocalDate): string {
  if (!isValidLocalDate(date)) return date;
  const [y, m, d] = parseLocalDateParts(date);
  const monthName = MONTH_NAMES_SHORT[m - 1] ?? '';
  const dayStr = String(d).padStart(2, '0');
  return `${dayStr} ${monthName} ${y}`;
}

/**
 * Formats a LocalDate into Month Year, e.g. "Oct 2026".
 */
export function formatMonthYear(date: LocalDate): string {
  if (!isValidLocalDate(date)) return date;
  const [y, m] = parseLocalDateParts(date);
  const monthName = MONTH_NAMES_SHORT[m - 1] ?? '';
  return `${monthName} ${y}`;
}

/**
 * Formats today's date into 'YYYY-MM-DD'.
 */
export function todayLocalDate(): LocalDate {
  const d = new Date();
  return formatLocalDateParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

