import type { ExerciseSet, WorkoutExercise } from '../types/index.ts';
import { getLocale, tr } from '../i18n/index.ts';

export interface OverloadRecommendation {
  suggestedWeightKg: number;
  suggestedTargetReps: number;
  reason: string;
  adjustmentType: 'INCREASE_WEIGHT' | 'MAINTAIN' | 'DECREASE_WEIGHT' | 'DELOAD';
  estimatedOneRepMaxKg: number;
}

type ExerciseIdentity = Pick<WorkoutExercise, 'name'> & Partial<Pick<WorkoutExercise, 'muscleGroup'>>;

const MAX_WEIGHT_KG = 1_000;
const MAX_REPS = 100;
const roundWeight = (value: number): number => Math.round(value * 100) / 100;
const validWeight = (value: number): boolean => Number.isFinite(value) && value >= 0.01 && value <= MAX_WEIGHT_KG;
const validReps = (value: number, minimum = 0): boolean => Number.isInteger(value) && value >= minimum && value <= MAX_REPS;
const formatWeight = (value: number): string => value.toLocaleString(getLocale(), { maximumFractionDigits: 2 });
const normalizeName = (name: string): string => name.normalize('NFKC').toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

/** Local, deterministic suggestions; performance alone does not measure effort or diagnose fatigue. */
export class ProgressiveOverloadService {
  /**
   * This schema has no rep/seconds or assisted-load metadata. Exclude movements
   * where a larger entered number does not reliably mean greater resistance.
   * Bodyweight movements also lack the body-mass contribution needed for 1RM.
   */
  public static isSupportedExercise(exercise: ExerciseIdentity): boolean {
    if (!exercise || typeof exercise.name !== 'string' || !exercise.name.trim()) return false;
    const name = normalizeName(exercise.name);
    return !/\b(?:plank|hold|isometric|timed|seconds?|minutes?|assisted|bodyweight|body weight|push ups?|pushups?|pull ups?|pullups?|chin ups?|chinups?|dips?|burpees?|crunch(?:es)?|sit ups?|situps?|hanging leg raise|wall sit|l sit|front lever|back lever|carry|running|jogging|walking|cycling|treadmill)\b|แพลงก์|วิดพื้น|ดันพื้น|โหนบาร์|จับเวลา|ค้างท่า|วินาที|นาที/.test(name);
  }

  /** Use exercise identity, not broad muscle labels, to choose the load increment. */
  public static getWeightStepKg(exercise: ExerciseIdentity): number {
    const name = normalizeName(typeof exercise?.name === 'string' ? exercise.name : '');
    return /\b(?:squat|dead ?lift|leg ?press)\b|สควอต|เดดลิฟต์|เลกเพรส/.test(name) ? 2.5 : 1.25;
  }

  /** Epley estimate for loaded sets of 1–12 repetitions; 0 means not estimated. */
  public static calculateEstimated1RM(weightKg: number, reps: number): number {
    if (!validWeight(weightKg) || !validReps(reps, 1) || reps > 12) return 0;
    if (reps === 1) return roundWeight(weightKg);
    return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
  }

  /** Suggest the next set only after a valid, loaded repetition set is completed. */
  public static getNextSetRecommendation(
    exercise: WorkoutExercise,
    completedSetIndex: number
  ): OverloadRecommendation | null {
    if (!this.isSupportedExercise(exercise) || !Array.isArray(exercise.sets)
      || !Number.isInteger(completedSetIndex) || completedSetIndex < 0) return null;
    const current = exercise.sets[completedSetIndex];
    if (!current || current.completed !== true || !validWeight(current.weightKg)
      || !validReps(current.targetReps, 1) || !validReps(current.actualReps)) return null;

    const weight = roundWeight(current.weightKg);
    const target = current.targetReps;
    const actual = current.actualReps;
    const difference = actual - target;
    const step = this.getWeightStepKg(exercise);
    const estimate = this.calculateEstimated1RM(weight, actual);
    const recommendation = (suggestedWeightKg: number, adjustmentType: OverloadRecommendation['adjustmentType'], reason: string): OverloadRecommendation => ({
      suggestedWeightKg,
      suggestedTargetReps: target,
      reason,
      adjustmentType,
      estimatedOneRepMaxKg: estimate
    });

    if (difference >= 2 && weight + step <= MAX_WEIGHT_KG) {
      const increased = roundWeight(weight + step);
      return recommendation(increased, 'INCREASE_WEIGHT', tr(
        'Completed {0}/{1} reps. Try {2} kg for {1} reps in the next set (+{3} kg).',
        actual, target, formatWeight(increased), formatWeight(step)
      ));
    }
    if (difference >= 0) {
      return recommendation(weight, 'MAINTAIN', tr(
        'Completed {0}/{1} reps. Keep {2} kg and aim for {1} reps in the next set.',
        actual, target, formatWeight(weight)
      ));
    }
    if (difference >= -2) {
      // Preserve the prescribed goal; actual reps are observations, not a new target.
      return recommendation(weight, 'MAINTAIN', tr(
        'Completed {0}/{1} reps. Keep {2} kg; the next-set goal stays at {1} reps.',
        actual, target, formatWeight(weight)
      ));
    }

    // Floor to an available step so rounding never keeps or raises the load.
    // For very small loads, zero means no added load. State the actual proposed
    // load rather than claiming a precise 10% decrease after equipment rounding.
    const reduced = roundWeight(Math.max(0, Math.floor((weight * 0.9) / step) * step));
    return recommendation(reduced, 'DECREASE_WEIGHT', tr(
      'Completed {0}/{1} reps. Try {2} kg for {1} reps in the next set (down from {3} kg).',
      actual, target, formatWeight(reduced), formatWeight(weight)
    ));
  }

  /**
   * Double progression across the caller's prescribed rep bracket. The app can
   * use [target, target + 2]. Increase only when every prescribed set is complete,
   * at the same positive load, and reaches the upper bound; then reset to the
   * lower bound. Mixed/ramp-up or incomplete sets never trigger an increase.
   */
  public static getNextSessionStartingLoad(
    prevSets: ExerciseSet[],
    minRepTarget: number,
    maxRepTarget: number,
    weightStepKg = 2.5
  ): { nextWeightKg: number; targetReps: number; progressionTriggered: boolean } {
    const minimum = validReps(minRepTarget, 1) ? minRepTarget : 1;
    const bracketValid = validReps(minRepTarget, 1) && validReps(maxRepTarget, 1) && maxRepTarget >= minRepTarget;
    const maximum = bracketValid ? maxRepTarget : minimum;
    const fallback = { nextWeightKg: 0, targetReps: minimum, progressionTriggered: false };
    if (!Array.isArray(prevSets) || prevSets.length === 0 || prevSets.length > 100) return fallback;

    const completed = prevSets.filter(set => set && set.completed === true
      && validWeight(set.weightKg) && validReps(set.actualReps));
    if (completed.length === 0) return fallback;

    // No warm-up metadata exists: the lowest completed load is the conservative
    // baseline when saved sets contain different loads or incomplete records.
    const baseline = Math.min(...completed.map(set => set.weightKg));
    const sameLoad = completed.length === prevSets.length
      && completed.every(set => Math.abs(set.weightKg - baseline) < 0.000001);
    const validStep = Number.isFinite(weightStepKg) && weightStepKg >= 0.01 && weightStepKg <= 25;
    const allReachedUpperBound = bracketValid && sameLoad && completed.every(set => set.actualReps >= maximum);

    if (allReachedUpperBound && validStep && baseline + weightStepKg <= MAX_WEIGHT_KG) {
      return { nextWeightKg: roundWeight(baseline + weightStepKg), targetReps: minimum, progressionTriggered: true };
    }
    return {
      nextWeightKg: roundWeight(baseline),
      targetReps: sameLoad ? maximum : minimum,
      progressionTriggered: false
    };
  }
}
