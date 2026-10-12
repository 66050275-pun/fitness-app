import type {
  DietProgram,
  HiddenFatEstimateCounts,
  MealItem,
  MealType,
  PhasicCycle,
  WeightEntry,
  WorkoutHistoryEntry,
} from '../types';
import { ProgressiveOverloadService } from './progressiveOverloadService';

/** Benchmarks for planning, rather than measurements of amino acids or body composition. */
export const PROTEIN_MEAL_BENCHMARK_GRAMS = 30;
export const FAT_GAUGE_CAUTION_RATIO = 0.8;
export const MINI_CUT_FAT_GRAMS_PER_KG = 0.6;

export const HIDDEN_FAT_PRESETS = [
  { id: 'oil', label: 'Cooking oil', fatGrams: 10 },
  { id: 'coconut', label: 'Coconut milk', fatGrams: 15 },
  { id: 'dressing', label: 'Fatty dressing', fatGrams: 8 },
] as const;

export interface HiddenFatEstimate {
  fatGrams: number;
  calories: number;
}

export interface ProteinInterval {
  id: 'breakfast' | 'lunch' | 'workout' | 'pre_workout' | 'post_workout' | 'dinner';
  label: string;
  proteinGrams: number;
  meetsMinimum: boolean;
}

export interface ProteinSplit {
  targetGrams: number;
  mealCount: 4 | 5;
  minimumPerMealGrams: number;
  isFeasible: boolean;
  /** A low target is divided faithfully instead of silently increasing the daily goal. */
  feasibilityReason: 'target_below_minimum' | null;
  intervals: ProteinInterval[];
}

export interface ProteinMealBreakdown {
  mealType: MealType;
  knownProteinGrams: number;
  entryCount: number;
  unknownEntryCount: number;
  belowBenchmark: boolean;
  benchmarkStatus: 'empty' | 'unknown' | 'below' | 'met';
  /** The share of known protein; unknown entries are never counted as zero. */
  distributionRatio: number;
  progressRatio: number;
}

export interface ProteinRadar {
  date: string;
  targetGrams: number;
  benchmarkGrams: number;
  groups: ProteinMealBreakdown[];
  knownTotalGrams: number;
  unknownEntryCount: number;
  remainingGrams: number;
  progressRatio: number;
}

export interface FatGauge {
  date: string;
  consumedKnownGrams: number;
  unknownEntryCount: number;
  savedTargetGrams: number;
  ceilingGrams: number;
  remainingGrams: number;
  overageGrams: number;
  /** May exceed one; renderers can clamp the meter without hiding an overage. */
  progressRatio: number;
  state: 'safe' | 'caution' | 'exceeded';
  usedWeightCap: boolean;
  missingWeight: boolean;
}

export interface PhaseCycleProgress {
  status: 'upcoming' | 'active' | 'completed';
  active: boolean;
  program: PhasicCycle['program'];
  startDate: string;
  endDate: string;
  totalDays: number;
  dayNumber: number;
  weekNumber: number;
  daysRemaining: number;
  daysUntilStart: number;
  progressRatio: number;
  isRefeedDay: boolean;
  refeedDates: string[];
  nextRefeedDate: string | null;
  /** These change an allowance; they do not represent food already consumed. */
  extraCalories: number;
  extraCarbsGrams: number;
  calorieTarget: number | null;
}

export interface RecompWeightPoint {
  date: string;
  weightKg: number;
}

export interface RecompStrengthComparison {
  exerciseName: string;
  previousEstimated1RMKg: number;
  currentEstimated1RMKg: number;
  changePercent: number;
}

export type RecompStatus =
  | 'insufficient_data'
  | 'optimal_recomp'
  | 'strength_declining'
  | 'building_strength'
  | 'weight_rising'
  | 'stable';

export interface RecompMatrix {
  status: RecompStatus;
  currentWindow: { startDate: string; endDate: string };
  previousWindow: { startDate: string; endDate: string };
  currentWeightAverageKg: number | null;
  previousWeightAverageKg: number | null;
  currentWeightDayCount: number;
  previousWeightDayCount: number;
  weightChangeKg: number | null;
  weightChangePercent: number | null;
  /** Median of paired exercise changes, so unrelated exercise swaps cannot inflate the result. */
  strengthChangePercent: number | null;
  strengthComparisons: RecompStrengthComparison[];
  currentVolumeKg: number;
  previousVolumeKg: number;
  volumeChangePercent: number | null;
  currentWorkoutCount: number;
  previousWorkoutCount: number;
  weightPoints: RecompWeightPoint[];
  point: { x: number; y: number } | null;
  thresholds: {
    minimumWeightDaysPerWindow: number;
    weightStablePercent: number;
    strengthMaintainedFloorPercent: number;
    strengthIncreasePercent: number;
  };
  missingWeightData: boolean;
  missingComparableStrength: boolean;
}

const DAY_MS = 86_400_000;
const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
const WEIGHT_DAYS_REQUIRED = 3;
const WEIGHT_STABLE_PERCENT = 0.1;
const STRENGTH_MAINTAINED_FLOOR_PERCENT = -2;
const STRENGTH_INCREASE_PERCENT = 2;

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function requireNonnegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid ${name}`);
}

function requirePositiveFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`Invalid ${name}`);
}

/** Rejects rollover dates such as February 31, using calendar days rather than local clock hours. */
export function isValidCalendarKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function calendarEpoch(value: string): number {
  if (!isValidCalendarKey(value)) throw new RangeError('Invalid calendar date');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getTime();
}

function calendarKey(epoch: number): string {
  const date = new Date(epoch);
  return `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function snapshotValue(meal: MealItem, key: 'protein' | 'fat'): number | null {
  const value = meal.nutritionSnapshot?.[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Presets estimate extra cooking fat only; callers decide whether to record the estimate in the diary. */
export function estimateHiddenFat(counts: HiddenFatEstimateCounts): HiddenFatEstimate {
  let fatGrams = 0;
  for (const preset of HIDDEN_FAT_PRESETS) {
    const count = counts[preset.id];
    if (!Number.isInteger(count) || count < 0 || count > 20) {
      throw new RangeError('Invalid hidden fat preset count');
    }
    fatGrams += preset.fatGrams * count;
  }
  return { fatGrams, calories: fatGrams * 9 };
}

/** A balanced allocation preserves the daily total exactly after rounding to whole grams. */
export function splitProteinTarget(target: number, mealCount: 4 | 5): ProteinSplit {
  requireNonnegativeFinite(target, 'protein target');
  if (mealCount !== 4 && mealCount !== 5) throw new RangeError('Invalid protein meal count');
  const targetGrams = Math.round(target);
  if (!Number.isSafeInteger(targetGrams)) throw new RangeError('Invalid protein target');
  const definitions: Pick<ProteinInterval, 'id' | 'label'>[] = mealCount === 4
    ? [
      { id: 'breakfast', label: 'Breakfast' },
      { id: 'lunch', label: 'Lunch' },
      { id: 'workout', label: 'Pre/post-workout' },
      { id: 'dinner', label: 'Dinner' },
    ]
    : [
      { id: 'breakfast', label: 'Breakfast' },
      { id: 'lunch', label: 'Lunch' },
      { id: 'pre_workout', label: 'Pre-workout' },
      { id: 'post_workout', label: 'Post-workout' },
      { id: 'dinner', label: 'Dinner' },
    ];
  const base = Math.floor(targetGrams / mealCount);
  const remainder = targetGrams % mealCount;
  const isFeasible = targetGrams >= mealCount * PROTEIN_MEAL_BENCHMARK_GRAMS;
  return {
    targetGrams,
    mealCount,
    minimumPerMealGrams: PROTEIN_MEAL_BENCHMARK_GRAMS,
    isFeasible,
    feasibilityReason: isFeasible ? null : 'target_below_minimum',
    intervals: definitions.map((definition, index) => {
      const proteinGrams = base + (index < remainder ? 1 : 0);
      return { ...definition, proteinGrams, meetsMinimum: proteinGrams >= PROTEIN_MEAL_BENCHMARK_GRAMS };
    }),
  };
}

export function getProteinRadar(meals: readonly MealItem[], today: string, target: number): ProteinRadar {
  calendarEpoch(today);
  requireNonnegativeFinite(target, 'protein target');
  const todayMeals = meals.filter(meal => meal.date === today);
  const groups: ProteinMealBreakdown[] = MEAL_TYPES.map(mealType => {
    const entries = todayMeals.filter(meal => meal.mealType === mealType);
    let knownProteinGrams = 0;
    let unknownEntryCount = 0;
    for (const meal of entries) {
      const amount = snapshotValue(meal, 'protein');
      if (amount === null) unknownEntryCount += 1;
      else knownProteinGrams += amount;
    }
    const belowBenchmark = entries.length > 0 && unknownEntryCount === 0 && knownProteinGrams < PROTEIN_MEAL_BENCHMARK_GRAMS;
    const benchmarkStatus: ProteinMealBreakdown['benchmarkStatus'] = entries.length === 0
      ? 'empty'
      : knownProteinGrams >= PROTEIN_MEAL_BENCHMARK_GRAMS
        ? 'met'
        : unknownEntryCount > 0 ? 'unknown' : 'below';
    return {
      mealType,
      knownProteinGrams: round(knownProteinGrams),
      entryCount: entries.length,
      unknownEntryCount,
      belowBenchmark,
      benchmarkStatus,
      distributionRatio: 0,
      progressRatio: knownProteinGrams / PROTEIN_MEAL_BENCHMARK_GRAMS,
    };
  });
  const knownTotalGrams = round(groups.reduce((sum, group) => sum + group.knownProteinGrams, 0));
  for (const group of groups) {
    group.distributionRatio = knownTotalGrams > 0 ? group.knownProteinGrams / knownTotalGrams : 0;
  }
  return {
    date: today,
    targetGrams: target,
    benchmarkGrams: PROTEIN_MEAL_BENCHMARK_GRAMS,
    groups,
    knownTotalGrams,
    unknownEntryCount: groups.reduce((sum, group) => sum + group.unknownEntryCount, 0),
    remainingGrams: round(Math.max(0, target - knownTotalGrams)),
    progressRatio: target > 0 ? knownTotalGrams / target : 0,
  };
}

export function getFatGauge(
  meals: readonly MealItem[],
  today: string,
  savedFatTarget: number,
  program: DietProgram,
  weightKg: number | null | undefined,
): FatGauge {
  calendarEpoch(today);
  requirePositiveFinite(savedFatTarget, 'fat target');
  const validWeight = typeof weightKg === 'number' && Number.isFinite(weightKg) && weightKg > 0;
  const weightCap = program === 'mini_cut' && validWeight ? weightKg * MINI_CUT_FAT_GRAMS_PER_KG : null;
  const ceilingGrams = weightCap === null ? savedFatTarget : Math.min(savedFatTarget, weightCap);
  let consumedKnownGrams = 0;
  let unknownEntryCount = 0;
  for (const meal of meals) {
    if (meal.date !== today) continue;
    const amount = snapshotValue(meal, 'fat');
    if (amount === null) unknownEntryCount += 1;
    else consumedKnownGrams += amount;
  }
  const progressRatio = consumedKnownGrams / ceilingGrams;
  return {
    date: today,
    consumedKnownGrams: round(consumedKnownGrams),
    unknownEntryCount,
    savedTargetGrams: savedFatTarget,
    ceilingGrams: round(ceilingGrams),
    remainingGrams: round(Math.max(0, ceilingGrams - consumedKnownGrams)),
    overageGrams: round(Math.max(0, consumedKnownGrams - ceilingGrams)),
    progressRatio,
    state: progressRatio > 1 ? 'exceeded' : progressRatio >= FAT_GAUGE_CAUTION_RATIO ? 'caution' : 'safe',
    usedWeightCap: weightCap !== null && weightCap <= savedFatTarget,
    missingWeight: program === 'mini_cut' && !validWeight,
  };
}

/** Refeed day allowances recur on days 7, 14, …, and stop at the saved phase boundary. */
export function getPhaseCycleProgress(cycle: PhasicCycle, today: string, baseCalories?: number): PhaseCycleProgress {
  const start = calendarEpoch(cycle.startDate);
  const current = calendarEpoch(today);
  if (cycle.program !== 'mini_cut' && cycle.program !== 'lean_bulk') throw new RangeError('Invalid phase program');
  const maxWeeks = cycle.program === 'mini_cut' ? 6 : 24;
  if (!Number.isInteger(cycle.lengthWeeks) || cycle.lengthWeeks < 3 || cycle.lengthWeeks > maxWeeks) {
    throw new RangeError('Invalid phase duration');
  }
  if (!Number.isInteger(cycle.refeedExtraCalories) || cycle.refeedExtraCalories < 300 || cycle.refeedExtraCalories > 500) {
    throw new RangeError('Invalid refeed allowance');
  }
  if (baseCalories !== undefined) requirePositiveFinite(baseCalories, 'calorie target');
  const totalDays = cycle.lengthWeeks * 7;
  const end = start + (totalDays - 1) * DAY_MS;
  if (!isValidCalendarKey(calendarKey(end))) throw new RangeError('Phase end date is outside the supported calendar');
  const elapsedDays = Math.round((current - start) / DAY_MS);
  const status: PhaseCycleProgress['status'] = current < start ? 'upcoming' : current > end ? 'completed' : 'active';
  const active = status === 'active';
  const dayNumber = status === 'upcoming' ? 0 : Math.min(totalDays, elapsedDays + 1);
  const weekNumber = dayNumber === 0 ? 0 : Math.ceil(dayNumber / 7);
  const refeedDates: string[] = [];
  if (cycle.program === 'mini_cut') {
    for (let offset = 6; offset < totalDays; offset += 7) refeedDates.push(calendarKey(start + offset * DAY_MS));
  }
  const isRefeedDay = active && refeedDates.includes(today);
  const extraCalories = isRefeedDay ? cycle.refeedExtraCalories : 0;
  return {
    status,
    active,
    program: cycle.program,
    startDate: cycle.startDate,
    endDate: calendarKey(end),
    totalDays,
    dayNumber,
    weekNumber,
    daysRemaining: status === 'completed' ? 0 : status === 'upcoming' ? totalDays : totalDays - elapsedDays,
    daysUntilStart: status === 'upcoming' ? -elapsedDays : 0,
    progressRatio: status === 'upcoming' ? 0 : status === 'completed' ? 1 : dayNumber / totalDays,
    isRefeedDay,
    refeedDates,
    nextRefeedDate: refeedDates.find(date => date >= today) ?? null,
    extraCalories,
    extraCarbsGrams: extraCalories / 4,
    calorieTarget: baseCalories === undefined ? null : Math.round(baseCalories + extraCalories),
  };
}

function average(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const center = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[center] : (sorted[center - 1] + sorted[center]) / 2;
}

interface WorkoutWindow {
  volumeKg: number;
  workoutCount: number;
  bestByExercise: Map<string, { exerciseName: string; estimated1RMKg: number }>;
}

/** An actual workout timestamp is interpreted in the user's local calendar, never its scheduled date. */
function workoutCalendarKey(workout: WorkoutHistoryEntry): string | null {
  const instant = new Date(workout.finishedAt ?? workout.startedAt);
  if (!Number.isFinite(instant.getTime())) return null;
  return `${String(instant.getFullYear()).padStart(4, '0')}-${String(instant.getMonth() + 1).padStart(2, '0')}-${String(instant.getDate()).padStart(2, '0')}`;
}

function collectWorkoutWindow(workouts: readonly WorkoutHistoryEntry[], startDate: string, endDate: string): WorkoutWindow {
  const result: WorkoutWindow = { volumeKg: 0, workoutCount: 0, bestByExercise: new Map() };
  for (const workout of workouts) {
    if (workout.status !== 'completed') continue;
    const date = workoutCalendarKey(workout);
    if (date === null || date < startDate || date > endDate) continue;
    let hasValidSet = false;
    for (const exercise of workout.exercises) {
      if (!ProgressiveOverloadService.isSupportedExercise({ name: exercise.exerciseName })) continue;
      // Session-specific exercise IDs can differ; matching names preserves comparisons across sessions.
      const identity = (exercise.exerciseName || exercise.exerciseId).normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ');
      if (!identity) continue;
      for (const set of exercise.sets) {
        if (!set.completed || !Number.isFinite(set.weightKg) || set.weightKg <= 0 || !Number.isInteger(set.reps) || set.reps < 1) continue;
        const setVolume = set.weightKg * set.reps;
        if (!Number.isFinite(setVolume)) continue;
        result.volumeKg += setVolume;
        hasValidSet = true;
        // Epley is a strength estimate; very high-rep sets are not useful 1RM evidence here.
        const estimated1RMKg = ProgressiveOverloadService.calculateEstimated1RM(set.weightKg, set.reps);
        if (estimated1RMKg <= 0) continue;
        const prior = result.bestByExercise.get(identity);
        if (!prior || estimated1RMKg > prior.estimated1RMKg) {
          result.bestByExercise.set(identity, { exerciseName: exercise.exerciseName || exercise.exerciseId, estimated1RMKg });
        }
      }
    }
    if (hasValidSet) result.workoutCount += 1;
  }
  return result;
}

/** Weight and paired strength trends describe performance; neither directly measures muscle or body fat. */
export function calculateRecompMatrix(
  weightHistory: readonly WeightEntry[],
  workouts: readonly WorkoutHistoryEntry[],
  today: string,
): RecompMatrix {
  const todayEpoch = calendarEpoch(today);
  const currentStart = calendarKey(todayEpoch - 6 * DAY_MS);
  const previousEnd = calendarKey(todayEpoch - 7 * DAY_MS);
  const previousStart = calendarKey(todayEpoch - 13 * DAY_MS);
  const weightsByDay = new Map<string, number[]>();
  for (const entry of weightHistory) {
    if (!isValidCalendarKey(entry.date) || entry.date < previousStart || entry.date > today || !Number.isFinite(entry.weightKg) || entry.weightKg <= 0) continue;
    const values = weightsByDay.get(entry.date) ?? [];
    values.push(entry.weightKg);
    weightsByDay.set(entry.date, values);
  }
  const weightPoints: RecompWeightPoint[] = [...weightsByDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, weights]) => ({ date, weightKg: average(weights)! }));
  const currentWeights = weightPoints.filter(point => point.date >= currentStart).map(point => point.weightKg);
  const previousWeights = weightPoints.filter(point => point.date <= previousEnd).map(point => point.weightKg);
  const currentAverage = average(currentWeights);
  const previousAverage = average(previousWeights);
  const missingWeightData = currentWeights.length < WEIGHT_DAYS_REQUIRED || previousWeights.length < WEIGHT_DAYS_REQUIRED;
  const weightChangeKg = currentAverage !== null && previousAverage !== null ? currentAverage - previousAverage : null;
  const weightChangePercent = weightChangeKg !== null && previousAverage !== null ? weightChangeKg / previousAverage * 100 : null;
  const currentWorkout = collectWorkoutWindow(workouts, currentStart, today);
  const previousWorkout = collectWorkoutWindow(workouts, previousStart, previousEnd);
  const strengthComparisons: RecompStrengthComparison[] = [];
  for (const [identity, current] of currentWorkout.bestByExercise) {
    const previous = previousWorkout.bestByExercise.get(identity);
    if (!previous) continue;
    strengthComparisons.push({
      exerciseName: current.exerciseName,
      previousEstimated1RMKg: round(previous.estimated1RMKg),
      currentEstimated1RMKg: round(current.estimated1RMKg),
      changePercent: (current.estimated1RMKg - previous.estimated1RMKg) / previous.estimated1RMKg * 100,
    });
  }
  const strengthChangePercent = median(strengthComparisons.map(exercise => exercise.changePercent));
  const missingComparableStrength = strengthChangePercent === null;
  let status: RecompStatus = 'insufficient_data';
  if (!missingWeightData && weightChangePercent !== null && strengthChangePercent !== null) {
    if (weightChangePercent < -WEIGHT_STABLE_PERCENT && strengthChangePercent >= STRENGTH_MAINTAINED_FLOOR_PERCENT) status = 'optimal_recomp';
    else if (strengthChangePercent < STRENGTH_MAINTAINED_FLOOR_PERCENT) status = 'strength_declining';
    else if (strengthChangePercent > STRENGTH_INCREASE_PERCENT) status = 'building_strength';
    else if (weightChangePercent > WEIGHT_STABLE_PERCENT) status = 'weight_rising';
    else status = 'stable';
  }
  return {
    status,
    currentWindow: { startDate: currentStart, endDate: today },
    previousWindow: { startDate: previousStart, endDate: previousEnd },
    currentWeightAverageKg: currentAverage === null ? null : round(currentAverage),
    previousWeightAverageKg: previousAverage === null ? null : round(previousAverage),
    currentWeightDayCount: currentWeights.length,
    previousWeightDayCount: previousWeights.length,
    weightChangeKg: weightChangeKg === null ? null : round(weightChangeKg, 3),
    weightChangePercent: weightChangePercent === null ? null : round(weightChangePercent, 3),
    strengthChangePercent: strengthChangePercent === null ? null : round(strengthChangePercent, 3),
    strengthComparisons: strengthComparisons.map(exercise => ({ ...exercise, changePercent: round(exercise.changePercent, 3) })),
    currentVolumeKg: round(currentWorkout.volumeKg),
    previousVolumeKg: round(previousWorkout.volumeKg),
    volumeChangePercent: previousWorkout.volumeKg > 0 ? round((currentWorkout.volumeKg - previousWorkout.volumeKg) / previousWorkout.volumeKg * 100, 3) : null,
    currentWorkoutCount: currentWorkout.workoutCount,
    previousWorkoutCount: previousWorkout.workoutCount,
    weightPoints: weightPoints.map(point => ({ ...point, weightKg: round(point.weightKg, 3) })),
    point: status === 'insufficient_data' || weightChangePercent === null || strengthChangePercent === null
      ? null : { x: weightChangePercent, y: strengthChangePercent },
    thresholds: {
      minimumWeightDaysPerWindow: WEIGHT_DAYS_REQUIRED,
      weightStablePercent: WEIGHT_STABLE_PERCENT,
      strengthMaintainedFloorPercent: STRENGTH_MAINTAINED_FLOOR_PERCENT,
      strengthIncreasePercent: STRENGTH_INCREASE_PERCENT,
    },
    missingWeightData,
    missingComparableStrength,
  };
}
