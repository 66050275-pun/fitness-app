import { getLocale, tr } from '../i18n/index.ts';

export type NutritionPlanGender = 'male' | 'female' | 'other';
export type NutritionTrainingExperience = 'beginner' | 'intermediate' | 'advanced';

export interface MacroSplit {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface MiniCutPlan {
  calorieTarget: number;
  macros: MacroSplit;
  recommendedDurationWeeks: number;
  maxDurationWeeks: number;
  refeedFrequencyDays: number;
  warningNote: string;
}

export interface LeanBulkPlan {
  calorieTarget: number;
  macros: MacroSplit;
  targetWeeklyGainKg: number;
  surplusCalories: number;
}

export type NutritionPlanErrorCode = 'invalid_input' | 'macro_budget';

/** Lets the UI distinguish invalid inputs from a calorie budget that cannot fit the prescribed macros. */
export class NutritionPlanError extends RangeError {
  public readonly code: NutritionPlanErrorCode;
  public readonly minimumCalories?: number;

  public constructor(code: NutritionPlanErrorCode, message: string, minimumCalories?: number) {
    super(message);
    this.name = 'NutritionPlanError';
    this.code = code;
    this.minimumCalories = minimumCalories;
  }
}

const CALORIE_INPUT_FLOOR = 800;
export const MINI_CUT_RECOMMENDED_DURATION_WEEKS = 4;
export const MINI_CUT_MAX_DURATION_WEEKS = 6;
export const MINI_CUT_REFEED_FREQUENCY_DAYS = 7;
const LEAN_BULK_SURPLUS: Record<NutritionTrainingExperience, number> = {
  beginner: 300,
  intermediate: 220,
  advanced: 150
};

function requirePositiveValues(...values: number[]): void {
  if (values.some(value => !Number.isFinite(value) || value <= 0)) {
    throw new NutritionPlanError('invalid_input', tr('Enter valid positive calories and body weight to calculate this plan.'));
  }
}

function requireFiniteResult(value: number): number {
  if (!Number.isFinite(value) || value <= 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new NutritionPlanError('invalid_input', tr('This value is outside the supported calculation range.'));
  }
  return value;
}

function minimumLeanBulkBudget(proteinGrams: number, calorieTarget: number): number {
  const proteinCalories = proteinGrams * 4;
  // Rounded fat can differ from exactly 25% by 4.5 kcal. Start at the necessary
  // lower bound, then find the first feasible integer budget at or above the
  // requested target. Recomputing fat is essential when proposing more calories.
  let candidate = Math.max(Math.ceil(calorieTarget), 1, Math.ceil((proteinCalories - 4.5) / 0.75));
  for (let attempt = 0; attempt < 14; attempt += 1) {
    requireFiniteResult(candidate);
    if (proteinCalories + Math.round(candidate * 0.25 / 9) * 9 <= candidate) return candidate;
    candidate += 1;
  }
  throw new NutritionPlanError('invalid_input', tr('This value is outside the supported calculation range.'));
}

function completeMacroSplit(
  calorieTarget: number,
  proteinGrams: number,
  fatGrams: number,
  minimumFeasibleBudget?: () => number
): MacroSplit {
  const minimumCalories = proteinGrams * 4 + fatGrams * 9;
  if (!Number.isFinite(minimumCalories) || minimumCalories < 0 || minimumCalories > Number.MAX_SAFE_INTEGER) {
    throw new NutritionPlanError('invalid_input', tr('This value is outside the supported calculation range.'));
  }
  if (minimumCalories > calorieTarget) {
    const requiredCalories = minimumFeasibleBudget ? minimumFeasibleBudget() : minimumCalories;
    throw new NutritionPlanError(
      'macro_budget',
      tr('This plan needs at least {0} kcal to fit its protein and fat targets. Increase daily calories or choose another goal.', requiredCalories),
      requiredCalories
    );
  }
  // Whole-gram carbohydrate targets leave at most 3 kcal unused instead of exceeding the selected energy budget.
  const carbsGrams = Math.floor((calorieTarget - minimumCalories) / 4);
  if (!Number.isSafeInteger(carbsGrams)) {
    throw new NutritionPlanError('invalid_input', tr('This value is outside the supported calculation range.'));
  }
  return { proteinGrams, carbsGrams, fatGrams };
}

function formatWeeklyGain(value: number): string {
  return value.toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Local planning estimates. Recompute translated notes when rendered; persist numeric targets and goal IDs only. */
export class NutritionPlanService {
  /**
   * A 25% deficit with the requested configuration floors. The 1,200/1,500 kcal
   * floors are planning defaults, not a guarantee of suitability for each user.
   * The caller must supply a real TDEE; selecting "other" does not estimate one.
   */
  public static calculateMiniCutCalories(tdee: number, gender: NutritionPlanGender): number {
    requirePositiveValues(tdee);
    if (gender !== 'male' && gender !== 'female' && gender !== 'other') {
      throw new NutritionPlanError('invalid_input', tr('Choose male, female or other for this calculation.'));
    }
    const minimumCalories = gender === 'female' ? 1_200 : 1_500;
    return requireFiniteResult(Math.max(minimumCalories, Math.round(tdee * 0.75)));
  }

  /** 2.3 g/kg protein, at least 35 g fat or 0.65 g/kg, and carbohydrates from the remaining energy. */
  public static calculateMiniCutMacros(calorieTarget: number, weightKg: number): MacroSplit {
    requirePositiveValues(calorieTarget, weightKg);
    const proteinGrams = Math.round(weightKg * 2.3);
    const fatGrams = Math.max(35, Math.round(weightKg * 0.65));
    return completeMacroSplit(calorieTarget, proteinGrams, fatGrams);
  }

  /** Four-week starting plan, six-week duration bound, and an optional maintenance-day schedule. */
  public static getMiniCutPlanDetails(tdee: number, weightKg: number, gender: NutritionPlanGender): MiniCutPlan {
    const calorieTarget = this.calculateMiniCutCalories(tdee, gender);
    const macros = this.calculateMiniCutMacros(calorieTarget, weightKg);
    return {
      calorieTarget,
      macros,
      recommendedDurationWeeks: MINI_CUT_RECOMMENDED_DURATION_WEEKS,
      maxDurationWeeks: MINI_CUT_MAX_DURATION_WEEKS,
      refeedFrequencyDays: MINI_CUT_REFEED_FREQUENCY_DAYS,
      warningNote: tr('Mini Cut is a short, intensive phase. Plan for 4 weeks and do not extend beyond 6 weeks. An optional maintenance-calorie day can be scheduled every 7 days.')
    };
  }

  /** Requested experience-based surplus: beginner +300, intermediate +220, advanced +150 kcal. */
  public static calculateLeanBulkCalories(
    tdee: number,
    experienceLevel: NutritionTrainingExperience = 'intermediate'
  ): { calorieTarget: number; surplus: number } {
    requirePositiveValues(tdee);
    if (experienceLevel !== 'beginner' && experienceLevel !== 'intermediate' && experienceLevel !== 'advanced') {
      throw new NutritionPlanError('invalid_input', tr('Choose beginner, intermediate or advanced training experience.'));
    }
    const surplus = LEAN_BULK_SURPLUS[experienceLevel];
    return { calorieTarget: requireFiniteResult(Math.round(tdee + surplus)), surplus };
  }

  /** 1.9 g/kg protein, approximately 25% of calories from rounded fat grams, and the remaining energy from carbs. */
  public static calculateLeanBulkMacros(calorieTarget: number, weightKg: number): MacroSplit {
    requirePositiveValues(calorieTarget, weightKg);
    const proteinGrams = Math.round(weightKg * 1.9);
    const fatGrams = Math.round(calorieTarget * 0.25 / 9);
    return completeMacroSplit(calorieTarget, proteinGrams, fatGrams, () => minimumLeanBulkBudget(proteinGrams, calorieTarget));
  }

  /**
   * Suggest +120/-120 kcal outside the inclusive 0.25–0.5% bodyweight/week range.
   * Weekly gain may be negative. The 800 kcal bound follows the app's calorie
   * input validation and is not a nutritional safety threshold. Applying this
   * suggestion remains the caller's explicit action; this method has no writes.
   */
  public static adjustLeanBulkCalorieSurplus(
    currentCalories: number,
    weeklyGainKg: number,
    weightKg: number
  ): { recommendedCalories: number; adjustmentReason: string } {
    requirePositiveValues(currentCalories, weightKg);
    if (!Number.isFinite(weeklyGainKg)) {
      throw new NutritionPlanError('invalid_input', tr('Enter a valid weekly weight change to calculate this adjustment.'));
    }
    if (currentCalories < CALORIE_INPUT_FLOOR) {
      throw new NutritionPlanError('invalid_input', tr('Enter a calorie target of at least 800 kcal to calculate an adjustment.'));
    }
    const minimumWeeklyGain = weightKg * 0.0025;
    const maximumWeeklyGain = weightKg * 0.005;
    const tolerance = Math.max(1, Math.abs(weeklyGainKg), minimumWeeklyGain, maximumWeeklyGain) * Number.EPSILON * 8;
    const gain = formatWeeklyGain(weeklyGainKg);
    if (weeklyGainKg < minimumWeeklyGain - tolerance) {
      return {
        recommendedCalories: requireFiniteResult(currentCalories + 120),
        adjustmentReason: tr('Weekly gain is {0} kg, below the target range. Try adding 120 kcal per day and review the trend again.', gain)
      };
    }
    if (weeklyGainKg > maximumWeeklyGain + tolerance) {
      const recommendedCalories = Math.max(CALORIE_INPUT_FLOOR, currentCalories - 120);
      const reduction = currentCalories - recommendedCalories;
      return {
        recommendedCalories: requireFiniteResult(recommendedCalories),
        adjustmentReason: reduction > 0
          ? tr('Weekly gain is {0} kg, above the target range. Try reducing daily calories by {1} kcal and review the trend again.', gain, reduction)
          : tr('Weekly gain is {0} kg, above the target range. The current target is already at the app minimum; review your plan before changing calories.', gain)
      };
    }
    return {
      recommendedCalories: requireFiniteResult(currentCalories),
      adjustmentReason: tr('Weekly gain is {0} kg, within the target range. Keep your current calorie target.', gain)
    };
  }
}
