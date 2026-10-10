import { getLocale, tr } from '../i18n/index.ts';
/**
 * Date Utility Functions for NutriAI Android
 * 
 * Rules:
 * 1. Use local YYYY-MM-DD date keys strictly without UTC shift.
 * 2. Week starts on Monday (1).
 * 3. Handle leap years, cross-month, and cross-year week transitions correctly.
 */

export interface DayInfo {
  dateKey: string;      // YYYY-MM-DD
  dayName: string;      // Mon, Tue...
  dayNum: number;       // 1..31
  monthName: string;    // Sep
  year: number;         // 2026
  isToday: boolean;
  displayLabel: string;
}

export interface CalendarDayCell {
  dateKey: string;
  dayNum: number;
  month: number;        // 1..12
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

/**
 * Formats a local Date into YYYY-MM-DD string key.
 */
export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Backwards-compatible alias for formatLocalDateKey.
 */
export const formatDateKey = formatLocalDateKey;

/**
 * Parses a YYYY-MM-DD string key into a local Date instance.
 * Avoids new Date('YYYY-MM-DD') which parses as UTC and causes day shifts in non-UTC timezones.
 */
export function parseLocalDateKey(dateKey: string): Date {
  const parts = dateKey.split('-').map(Number);
  const y = parts[0] || new Date().getFullYear();
  const m = (parts[1] || 1) - 1;
  const d = parts[2] || 1;
  return new Date(y, m, d);
}

/**
 * Backwards-compatible alias for parseLocalDateKey.
 */
export const parseDateKey = parseLocalDateKey;

/**
 * Returns today's date key in YYYY-MM-DD format.
 */
export function getTodayKey(): string {
  return formatLocalDateKey(new Date());
}

/**
 * Returns yesterday's date key in YYYY-MM-DD format.
 */
export function getYesterdayKey(): string {
  return formatLocalDateKey(addDays(new Date(), -1));
}

/**
 * Checks if the given dateKey represents today.
 */
export function isToday(dateKey: string): boolean {
  return dateKey === getTodayKey();
}

/**
 * Checks if the given dateKey represents yesterday.
 */
export function isYesterday(dateKey: string): boolean {
  return dateKey === getYesterdayKey();
}

/**
 * Adds an integer number of days to a Date.
 */
export function addDays(date: Date, days: number): Date {
  const res = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return res;
}

/**
 * Adds an integer number of weeks to a Date.
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Adds an integer number of months to a Date.
 */
export function addMonths(date: Date, months: number): Date {
  const res = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  return res;
}

/**
 * Compares two YYYY-MM-DD date keys.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export function compareLocalDates(dateKeyA: string, dateKeyB: string): number {
  return dateKeyA.localeCompare(dateKeyB);
}

/**
 * Returns the Monday of the week containing the given date.
 * (Monday = 1, Sunday = 0)
 */
export function getStartOfWeek(date: Date, weekStartsOn: number = 1): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  
  let diff = 0;
  if (weekStartsOn === 1) {
    // Monday start
    diff = day === 0 ? -6 : 1 - day;
  } else {
    // Sunday start
    diff = -day;
  }

  return addDays(d, diff);
}

/**
 * Returns the 7 days (Monday to Sunday) for the week containing refDate.
 */
export function getWeekDates(ref: Date | string = new Date()): DayInfo[] {
  const refDate = typeof ref === 'string' ? parseLocalDateKey(ref) : ref;
  const monday = getStartOfWeek(refDate, 1);
  const todayStr = getTodayKey();
  const days: DayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const cur = addDays(monday, i);
    const key = formatLocalDateKey(cur);
    days.push({
      dateKey: key,
      dayName: cur.toLocaleDateString(getLocale(), { weekday: 'short' }),
      dayNum: cur.getDate(),
      monthName: cur.toLocaleDateString(getLocale(), { month: 'short' }),
      year: cur.getFullYear(),
      isToday: key === todayStr,
      displayLabel: `${cur.toLocaleDateString(getLocale(), { weekday: 'short' })} ${cur.getDate()}`
    });
  }

  return days;
}

/**
 * Backwards-compatible alias for getWeekDates.
 */
export const getCurrentWeekDays = getWeekDates;

/**
 * Formats a date for the Diary header and overview cards.
 * Example:
 * - Today: "Today (Sunday, Sep 6)"
 * - Yesterday: "Yesterday (Saturday, Sep 5)"
 * - Other: "Sunday, September 6, 2026"
 */
export function formatDiaryDate(dateKey: string): string {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const d = parseLocalDateKey(dateKey);

  const isRecent = dateKey === today || dateKey === yesterday;
  const label = d.toLocaleDateString(getLocale(), {
    weekday: 'long', month: isRecent ? 'short' : 'long', day: 'numeric',
    ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' as const } : {})
  });
  if (dateKey === today) return tr('Today ({0})', label);
  if (dateKey === yesterday) return tr('Yesterday ({0})', label);
  return label;
}

/**
 * Backwards-compatible alias for formatFriendlyDate.
 */
export const formatFriendlyDate = formatDiaryDate;

/**
 * Generates the grid of day cells for a calendar month view.
 * @param year e.g. 2026
 * @param month 1..12 (1 = January, 12 = December)
 * @param selectedDateKey optional selected YYYY-MM-DD
 */
export function getMonthCalendarGrid(
  year: number,
  month: number,
  selectedDateKey?: string
): CalendarDayCell[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const startGrid = getStartOfWeek(firstOfMonth, 1); // Monday start

  // Find last day of month
  const lastOfMonth = new Date(year, month, 0);
  const endGrid = addDays(getStartOfWeek(lastOfMonth, 1), 6); // Sunday of last week

  const cells: CalendarDayCell[] = [];
  const todayStr = getTodayKey();

  let cur = new Date(startGrid);
  // Ensure we render at least 35 or 42 cells (standard calendar height)
  while (cur <= endGrid || cells.length < 35) {
    const key = formatLocalDateKey(cur);
    cells.push({
      dateKey: key,
      dayNum: cur.getDate(),
      month: cur.getMonth() + 1,
      year: cur.getFullYear(),
      isCurrentMonth: cur.getMonth() === month - 1,
      isToday: key === todayStr,
      isSelected: key === selectedDateKey
    });

    cur = addDays(cur, 1);

    // Break safeguard if past 42 days (6 weeks)
    if (cells.length >= 42) break;
  }

  return cells;
}
