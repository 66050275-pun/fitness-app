import { tr } from '../i18n/index.ts';
import type { 
  WeeklyProgramTemplate, 
  ScheduledWorkout, 
  ScheduledWorkoutStatus, 
  WeekdayNumber,
  WorkoutHistoryEntry
} from '../types/index.ts';
import { 
  formatLocalDateKey, 
  parseLocalDateKey, 
  getStartOfWeek, 
  addDays 
} from './dateUtils.ts';

export const WEEKDAY_LABELS: Record<WeekdayNumber, { short: string; full: string }> = {
  1: { short: 'Mon', full: 'Monday' },
  2: { short: 'Tue', full: 'Tuesday' },
  3: { short: 'Wed', full: 'Wednesday' },
  4: { short: 'Thu', full: 'Thursday' },
  5: { short: 'Fri', full: 'Friday' },
  6: { short: 'Sat', full: 'Saturday' },
  7: { short: 'Sun', full: 'Sunday' }
};

/**
 * Returns ISO weekday number: 1 = Monday ... 7 = Sunday from a YYYY-MM-DD date key.
 */
export function getWeekdayFromDateKey(dateKey: string): WeekdayNumber {
  const d = parseLocalDateKey(dateKey);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  return (day === 0 ? 7 : day) as WeekdayNumber;
}

/**
 * Returns the exact number of days in the specified month (handles leap years 28/29/30/31).
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Expands a 7-day Monday-Sunday weekly template across an entire Gregorian month.
 * Preserves existing date-specific manual overrides if present.
 */
export function expandWeeklyTemplateToMonth(
  template: WeeklyProgramTemplate,
  year: number,
  month: number,
  existingOverrides: Record<string, ScheduledWorkout> = {}
): Record<string, ScheduledWorkout> {
  const totalDays = getDaysInMonth(year, month);
  const result: Record<string, ScheduledWorkout> = {};

  for (let day = 1; day <= totalDays; day++) {
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${year}-${monthStr}-${dayStr}`;

    // If there is an existing manual override for this date, preserve it
    const existing = existingOverrides[dateKey];
    if (existing && existing.source === 'manual_override') {
      result[dateKey] = existing;
      continue;
    }

    // Lookup template setting for this weekday
    const weekday = getWeekdayFromDateKey(dateKey);
    const planned = template.days[weekday];
    if (planned) {
      result[dateKey] = {
        dateKey,
        workout: planned,
        source: 'weekly_repeat',
        templateId: template.id
      };
    }
  }

  return result;
}

/**
 * Applies a 7-day template to the current week (Monday to Sunday) containing refDate.
 */
export function expandWeeklyTemplateToWeek(
  template: WeeklyProgramTemplate,
  refDate: Date | string = new Date(),
  existingOverrides: Record<string, ScheduledWorkout> = {}
): Record<string, ScheduledWorkout> {
  const dateObj = typeof refDate === 'string' ? parseLocalDateKey(refDate) : refDate;
  const monday = getStartOfWeek(dateObj, 1);
  const result: Record<string, ScheduledWorkout> = {};

  for (let i = 0; i < 7; i++) {
    const curDate = addDays(monday, i);
    const dateKey = formatLocalDateKey(curDate);

    const existing = existingOverrides[dateKey];
    if (existing && existing.source === 'manual_override') {
      result[dateKey] = existing;
      continue;
    }

    const weekday = (i + 1) as WeekdayNumber;
    const planned = template.days[weekday];
    if (planned) {
      result[dateKey] = {
        dateKey,
        workout: planned,
        source: 'manual_override', // Single week application counts as specific schedule
        templateId: template.id
      };
    }
  }

  return result;
}

/**
 * Evaluates the status of a specific day by checking scheduled plans and workout history.
 */
export function resolveDayStatus(
  dateKey: string,
  scheduled: ScheduledWorkout | undefined,
  workoutHistory: WorkoutHistoryEntry[],
  todayKey: string
): ScheduledWorkoutStatus {
  // 1. Check if a workout was completed on this date
  const completedWorkout = workoutHistory.find(w => {
    if (w.status !== 'completed' && w.completedSetCount <= 0) return false;
    if (w.scheduledDate && w.scheduledDate === dateKey) return true;
    const workoutDateKey = formatLocalDateKey(new Date(w.startedAt));
    return workoutDateKey === dateKey;
  });

  if (completedWorkout) {
    return 'completed';
  }

  // 2. Check scheduled plan
  if (scheduled) {
    if (scheduled.workout.type === 'rest') {
      return 'rest';
    }

    // It's a scheduled preset
    if (dateKey < todayKey) {
      return 'missed';
    }
    return 'planned';
  }

  // 3. Neither completed nor scheduled
  return 'unplanned';
}

/**
 * Finds completed workout details for a specific date if one exists.
 */
export function getCompletedWorkoutForDate(
  dateKey: string,
  workoutHistory: WorkoutHistoryEntry[]
): WorkoutHistoryEntry | undefined {
  return workoutHistory.find(w => {
    if (w.status !== 'completed' && w.completedSetCount <= 0) return false;
    if (w.scheduledDate && w.scheduledDate === dateKey) return true;
    const workoutDateKey = formatLocalDateKey(new Date(w.startedAt));
    return workoutDateKey === dateKey;
  });
}

/**
 * Calculates a summary of monthly training statistics.
 */
export function calculateMonthlyProgramSummary(
  year: number,
  month: number,
  scheduledMap: Record<string, ScheduledWorkout>,
  workoutHistory: WorkoutHistoryEntry[],
  todayKey: string
) {
  const totalDays = getDaysInMonth(year, month);
  let plannedCount = 0;
  let completedCount = 0;
  let missedCount = 0;
  let restCount = 0;

  for (let day = 1; day <= totalDays; day++) {
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${year}-${monthStr}-${dayStr}`;

    const scheduled = scheduledMap[dateKey];
    const status = resolveDayStatus(dateKey, scheduled, workoutHistory, todayKey);

    switch (status) {
      case 'completed':
        completedCount++;
        break;
      case 'planned':
        plannedCount++;
        break;
      case 'missed':
        missedCount++;
        break;
      case 'rest':
        restCount++;
        break;
    }
  }

  return {
    totalDays,
    plannedCount,
    completedCount,
    missedCount,
    restCount
  };
}

/**
 * Returns a human-readable summary string for a weekly template.
 * E.g. "4 workout days · 2 rest days"
 */
export function calculateWeeklyTemplateSummary(template: WeeklyProgramTemplate | null): string {
  if (!template || !template.days) {
    return tr('No weekly routine configured');
  }

  let workoutDays = 0;
  let restDays = 0;

  for (let i = 1; i <= 7; i++) {
    const dayPlan = template.days[i as WeekdayNumber];
    if (dayPlan) {
      if (dayPlan.type === 'preset') workoutDays++;
      else if (dayPlan.type === 'rest') restDays++;
    }
  }

  const parts: string[] = [];
  if (workoutDays > 0) parts.push(tr(workoutDays === 1 ? '{0} workout day' : '{0} workout days', workoutDays));
  if (restDays > 0) parts.push(tr(restDays === 1 ? '{0} rest day' : '{0} rest days', restDays));

  return parts.length > 0 ? parts.join(' · ') : tr('No days configured yet');
}

export interface FitnessPlannerResetTarget {
  weeklyFitnessTemplate: WeeklyProgramTemplate | null;
  scheduledWorkouts: Record<string, ScheduledWorkout>;
  selectedPlannerDate?: string | null;
  plannerDetailModalOpen?: boolean;
  plannerWeeklyEditorOpen?: boolean;
  plannerConfirmOverwriteMonth?: { year: number; month: number } | null;
}

/**
 * Resets fitness program templates and calendar schedules to initial empty state.
 * Preserves workout history, personal records, and user preferences.
 */
export function resetFitnessPlannerState<T extends FitnessPlannerResetTarget>(state: T): T {
  state.weeklyFitnessTemplate = null;
  state.scheduledWorkouts = {};
  if ('selectedPlannerDate' in state) state.selectedPlannerDate = null;
  if ('plannerDetailModalOpen' in state) state.plannerDetailModalOpen = false;
  if ('plannerWeeklyEditorOpen' in state) state.plannerWeeklyEditorOpen = false;
  if ('plannerConfirmOverwriteMonth' in state) state.plannerConfirmOverwriteMonth = null;
  return state;
}

