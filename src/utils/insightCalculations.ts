import { tr, getLocale } from '../i18n/index.ts';
/**
 * Pure Calculation Functions for Insights & Analytics
 * 
 * Rules:
 * - Robust against division by zero, null, NaN, and missing dates
 * - Consistent device local calendar grouping
 * - Completed sets ONLY for training volume (no incomplete sets)
 * - Honest delta comparisons without fake numbers
 */

import type { MealItem, WorkoutHistoryEntry } from '../types/index.ts';
import { formatDateKey, parseDateKey } from './dateUtils';
import { clampNonNegative, safeFiniteNumber, safeRatio } from './safeNumbers';

export interface DailyNutritionSummary {
  dateKey: string;
  dayLabel: string; // "Mon", "Tue"
  fullDateLabel: string; // "Sep 6"
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
}

export interface NutritionAverages {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  totalCalories: number;
  daysWithLogs: number;
  totalDays: number;
}

export interface WorkoutPeriodSummary {
  workoutCount: number;
  completedWorkoutCount: number;
  totalDurationMinutes: number;
  totalVolumeKg: number;
  totalCompletedSets: number;
  workouts: WorkoutHistoryEntry[];
}

export interface MetricDelta {
  percent: number;
  deltaAbsolute: number;
  direction: 'up' | 'down' | 'flat';
  hasEnoughData: boolean;
}

export interface GoalAdherenceStats {
  proteinGoalMetDays: number;
  hydrationGoalMetDays: number;
  calorieTargetAdherenceDays: number;
  totalDaysEvaluated: number;
  workoutCompletionRate: number; // 0..100
}

export interface InsightMessage {
  id: string;
  category: 'nutrition' | 'fitness' | 'hydration' | 'consistency';
  title: string;
  text: string;
  icon: string;
  status: 'positive' | 'neutral' | 'attention';
}

/**
 * Generate a contiguous list of YYYY-MM-DD date keys for the given range, ending at today (or offset periods).
 */
export function getDateRangeKeys(rangeDays: number, periodOffset: number = 0): string[] {
  const keys: string[] = [];
  const today = new Date();
  
  // Starting day backwards
  const endOffset = periodOffset * rangeDays;
  const startOffset = endOffset + rangeDays - 1;

  for (let i = startOffset; i >= endOffset; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(formatDateKey(d));
  }

  return keys;
}

/**
 * Aggregate meals by calendar date for the specified date range.
 */
export function calculateDailyNutritionTotals(meals: MealItem[], dateKeys: string[]): DailyNutritionSummary[] {
  const mealMap = new Map<string, MealItem[]>();
  
  meals.forEach(m => {
    const list = mealMap.get(m.date) || [];
    list.push(m);
    mealMap.set(m.date, list);
  });

  return dateKeys.map(key => {
    const dayMeals = mealMap.get(key) || [];
    let cal = 0;
    let pro = 0;
    let carb = 0;
    let fat = 0;

    dayMeals.forEach(m => {
      cal += clampNonNegative(safeFiniteNumber(m.calories));
      pro += clampNonNegative(safeFiniteNumber(m.protein));
      carb += clampNonNegative(safeFiniteNumber(m.carbs));
      fat += clampNonNegative(safeFiniteNumber(m.fat));
    });

    const dateObj = parseDateKey(key);
    const dayLabel = dateObj.toLocaleDateString(getLocale(), { weekday: 'short' });
    const fullDateLabel = dateObj.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });

    return {
      dateKey: key,
      dayLabel,
      fullDateLabel,
      calories: Math.round(cal),
      protein: Math.round(pro),
      carbs: Math.round(carb),
      fat: Math.round(fat),
      mealCount: dayMeals.length
    };
  });
}

/**
 * Calculate nutrition averages across the period.
 */
export function calculateNutritionAverages(dailyTotals: DailyNutritionSummary[]): NutritionAverages {
  const totalDays = dailyTotals.length;
  if (totalDays === 0) {
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFat: 0,
      totalCalories: 0,
      daysWithLogs: 0,
      totalDays: 0
    };
  }

  let sumCal = 0;
  let sumPro = 0;
  let sumCarb = 0;
  let sumFat = 0;
  let daysWithLogs = 0;

  dailyTotals.forEach(d => {
    sumCal += d.calories;
    sumPro += d.protein;
    sumCarb += d.carbs;
    sumFat += d.fat;
    if (d.mealCount > 0) {
      daysWithLogs += 1;
    }
  });

  // Calculate daily average across the total window to reflect actual intake over time
  return {
    avgCalories: Math.round(sumCal / totalDays),
    avgProtein: Math.round(sumPro / totalDays),
    avgCarbs: Math.round(sumCarb / totalDays),
    avgFat: Math.round(sumFat / totalDays),
    totalCalories: Math.round(sumCal),
    daysWithLogs,
    totalDays
  };
}

/**
 * Filter and summarize workouts within a set of calendar date keys.
 */
export function calculateWorkoutTotals(workouts: WorkoutHistoryEntry[], dateKeys: string[]): WorkoutPeriodSummary {
  const keySet = new Set(dateKeys);

  const matchedWorkouts = workouts.filter(w => {
    const started = new Date(w.startedAt);
    const wKey = formatDateKey(started);
    return keySet.has(wKey);
  });

  let totalDurationSec = 0;
  let totalVolume = 0;
  let totalSets = 0;
  let completedWorkouts = 0;

  matchedWorkouts.forEach(w => {
    totalDurationSec += Math.max(0, w.durationSeconds || 0);

    // Only count completed sets for volume and set counts
    let workoutVol = 0;
    let workoutCompletedSets = 0;

    w.exercises.forEach(ex => {
      ex.sets.forEach(s => {
        if (s.completed && s.weightKg > 0 && s.reps > 0) {
          workoutVol += (s.weightKg * s.reps);
        }
        if (s.completed) {
          workoutCompletedSets += 1;
        }
      });
    });

    totalVolume += workoutVol;
    totalSets += workoutCompletedSets;

    if (w.status === 'completed' || workoutCompletedSets > 0) {
      completedWorkouts += 1;
    }
  });

  return {
    workoutCount: matchedWorkouts.length,
    completedWorkoutCount: completedWorkouts,
    totalDurationMinutes: Math.round(totalDurationSec / 60),
    totalVolumeKg: Math.round(totalVolume),
    totalCompletedSets: totalSets,
    workouts: matchedWorkouts
  };
}

/**
 * Calculate percentage and absolute change between current period and previous period.
 * Returns null if previous period has 0 or insufficient data.
 */
export function calculatePercentageChange(current: number, previous: number): MetricDelta | null {
  if (previous <= 0 || isNaN(previous) || isNaN(current)) {
    return null; // Not enough previous data to calculate meaningful percentage
  }

  const delta = current - previous;
  const rawPct = safeRatio(delta, previous) * 100;
  const percent = Math.round(Math.abs(rawPct) * 10) / 10;

  return {
    percent,
    deltaAbsolute: Math.round(delta * 10) / 10,
    direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
    hasEnoughData: true
  };
}

/**
 * Calculate nutrition logging streak (consecutive calendar days with logged meals up to today or yesterday).
 */
export function calculateLoggingStreak(meals: MealItem[]): number {
  if (meals.length === 0) return 0;

  const datesWithMeals = new Set(meals.map(m => m.date));
  const today = new Date();
  const todayKey = formatDateKey(today);
  const yesterdayKey = formatDateKey(new Date(today.getTime() - 86400000));

  // Determine starting point: today if logged, otherwise yesterday
  let checkDate = new Date(today);
  if (!datesWithMeals.has(todayKey)) {
    if (!datesWithMeals.has(yesterdayKey)) {
      return 0; // Streak broken if neither today nor yesterday has a meal
    }
    checkDate.setDate(today.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = formatDateKey(checkDate);
    if (datesWithMeals.has(key)) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate workout streak (count of consecutive days ending recently with training).
 */
export function calculateWorkoutStreak(workouts: WorkoutHistoryEntry[]): number {
  if (workouts.length === 0) return 0;

  const workoutDates = new Set<string>();
  workouts.forEach(w => {
    if (w.status === 'completed' || w.completedSetCount > 0) {
      workoutDates.add(formatDateKey(new Date(w.startedAt)));
    }
  });

  const today = new Date();
  const todayKey = formatDateKey(today);
  const yesterdayKey = formatDateKey(new Date(today.getTime() - 86400000));

  let checkDate = new Date(today);
  if (!workoutDates.has(todayKey)) {
    if (!workoutDates.has(yesterdayKey)) {
      return 0;
    }
    checkDate.setDate(today.getDate() - 1);
  }

  let streak = 0;
  while (true) {
    const key = formatDateKey(checkDate);
    if (workoutDates.has(key)) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate goal adherence counts for protein, calories, water, and workouts.
 */
export function calculateGoalAdherence(
  dailyTotals: DailyNutritionSummary[],
  calorieTarget: number,
  proteinTarget: number,
  waterByDate: Record<string, number>,
  waterTarget: number,
  workoutSummary: WorkoutPeriodSummary
): GoalAdherenceStats {
  let proteinMet = 0;
  let waterMet = 0;
  let calorieMet = 0;

  dailyTotals.forEach(d => {
    if (d.protein >= proteinTarget && d.protein > 0) {
      proteinMet += 1;
    }
    // Calorie adherence defined as within 15% range of target
    if (d.calories > 0 && Math.abs(d.calories - calorieTarget) <= calorieTarget * 0.15) {
      calorieMet += 1;
    }
    const water = waterByDate[d.dateKey] || 0;
    if (water >= waterTarget && waterTarget > 0) {
      waterMet += 1;
    }
  });

  const workoutRate = workoutSummary.workoutCount > 0
    ? Math.round((workoutSummary.completedWorkoutCount / workoutSummary.workoutCount) * 100)
    : 0;

  return {
    proteinGoalMetDays: proteinMet,
    hydrationGoalMetDays: waterMet,
    calorieTargetAdherenceDays: calorieMet,
    totalDaysEvaluated: dailyTotals.length,
    workoutCompletionRate: workoutRate
  };
}

/**
 * Generate rule-based, honest summary messages from computed real metrics.
 * Note: Clearly rule-based and non-medical.
 */
export function generateInsightMessages(
  rangeDays: number,
  nutritionAvg: NutritionAverages,
  workoutSummary: WorkoutPeriodSummary,
  adherence: GoalAdherenceStats,
  deltaCal: MetricDelta | null,
  deltaVol: MetricDelta | null
): InsightMessage[] {
  const messages: InsightMessage[] = [];

  if (nutritionAvg.daysWithLogs === 0 && workoutSummary.completedWorkoutCount === 0) {
    return [
      {
        id: 'msg-start-logging',
        category: 'consistency',
        title: tr("Begin Logging to Unlock Insights"),
        text: tr("Record meals and complete workouts to view automated trend analysis and personalized adherence tracking."),
        icon: 'analytics',
        status: 'neutral'
      }
    ];
  }

  // 1. Protein Target Rule
  if (adherence.proteinGoalMetDays > 0) {
    const isHigh = adherence.proteinGoalMetDays >= Math.ceil(rangeDays * 0.6);
    messages.push({
      id: 'msg-protein-target',
      category: 'nutrition',
      title: isHigh ? 'Consistent Protein Adherence' : 'Protein Goal Progress',
      text: tr("You met your protein target on {0} of the last {1} days ({2}% adherence).", adherence.proteinGoalMetDays, rangeDays, Math.round((adherence.proteinGoalMetDays / rangeDays) * 100)),
      icon: 'egg_alt',
      status: isHigh ? 'positive' : 'neutral'
    });
  } else if (nutritionAvg.daysWithLogs > 0) {
    messages.push({
      id: 'msg-protein-gap',
      category: 'nutrition',
      title: tr("Protein Intake Below Target"),
      text: tr("Daily protein averaged {0}g this period. Consider adding high-protein sources like Greek yogurt, eggs, or chicken to reach your goal.", nutritionAvg.avgProtein),
      icon: 'info',
      status: 'attention'
    });
  }

  // 2. Training Volume Trend Rule
  if (workoutSummary.completedWorkoutCount > 0) {
    if (deltaVol && deltaVol.direction === 'up' && deltaVol.percent > 0) {
      messages.push({
        id: 'msg-training-volume-up',
        category: 'fitness',
        title: tr("Progressive Overload Tracking"),
        text: tr("Your training volume increased by {0}% compared to the previous period ({1} kg total volume).", deltaVol.percent, workoutSummary.totalVolumeKg.toLocaleString(getLocale())),
        icon: 'trending_up',
        status: 'positive'
      });
    } else {
      messages.push({
        id: 'msg-training-summary',
        category: 'fitness',
        title: tr("Training Activity Logged"),
        text: tr("Completed {0} workout sessions with {1} verified sets over {2} total minutes.", workoutSummary.completedWorkoutCount, workoutSummary.totalCompletedSets, workoutSummary.totalDurationMinutes),
        icon: 'fitness_center',
        status: 'positive'
      });
    }
  }

  // 3. Hydration Rule
  if (adherence.hydrationGoalMetDays >= Math.ceil(rangeDays * 0.7)) {
    messages.push({
      id: 'msg-hydration-optimal',
      category: 'hydration',
      title: tr("Hydration Target Met Consistently"),
      text: tr("You maintained your daily water goal on {0} of {1} days, supporting cellular recovery and metabolic balance.", adherence.hydrationGoalMetDays, rangeDays),
      icon: 'water_drop',
      status: 'positive'
    });
  } else if (adherence.hydrationGoalMetDays < Math.ceil(rangeDays * 0.3) && rangeDays === 7) {
    messages.push({
      id: 'msg-hydration-low',
      category: 'hydration',
      title: tr("Hydration Tracking Inconsistent"),
      text: tr("Daily water target was met on {0} days this week. Regular hydration assists physical recovery and digestion.", adherence.hydrationGoalMetDays),
      icon: 'water_bottle',
      status: 'attention'
    });
  }

  // 4. Calorie intake trend
  if (deltaCal && deltaCal.hasEnoughData) {
    const text = deltaCal.direction === 'up'
      ? `Daily caloric intake increased by ${deltaCal.percent}% (+${deltaCal.deltaAbsolute} kcal) compared to the preceding ${rangeDays}-day window.`
      : deltaCal.direction === 'down'
        ? `Daily caloric intake decreased by ${deltaCal.percent}% (-${deltaCal.deltaAbsolute} kcal) compared to the preceding ${rangeDays}-day window.`
        : `Daily caloric intake remained virtually unchanged from the previous period.`;
    
    messages.push({
      id: 'msg-calorie-delta',
      category: 'nutrition',
      title: tr("Energy Balance Trend"),
      text,
      icon: 'balance',
      status: 'neutral'
    });
  }

  return messages;
}
