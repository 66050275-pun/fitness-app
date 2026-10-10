import { tr } from '../i18n/index.ts';
/**
 * Goal Calculations — BMR, TDEE, and Macro Targets
 *
 * Uses the Mifflin–St Jeor equation for Basal Metabolic Rate (BMR):
 *   Male:   BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
 *   Female: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
 *
 * Reference: Mifflin MD, St Jeor ST, et al. "A new predictive equation for
 * resting energy expenditure in healthy individuals." Am J Clin Nutr. 1990;51(2):241-247.
 *
 * Units:
 * - All internal calculations use base units: kg, cm, years
 * - Unit conversion occurs only at input/display boundaries
 * - Raw calculations retain full precision
 * - Goals are rounded only for confirmed UI targets
 *
 * Rules:
 * - Returns null when required inputs are missing (never assumes/invents values)
 * - "Prefer not to say" biological sex → null BMR, manual target required
 * - Date of birth/age is required for Mifflin–St Jeor; omit → null result
 * - Review thresholds are configurable, not hard medical limits
 * - rawEstimatedCalories and reviewedSuggestedCalories are kept separately
 * - Zero or negative calorie goals are never generated
 */

import type { ActivityLevel } from '../types/index.ts';
import { safeFiniteNumber } from './safeNumbers.ts';

// ─── Configurable Review Thresholds ───────────────────────────────────────────
// These are NOT medical limits. They exist for typo detection and flagging
// extreme results that warrant manual review.
export const CALORIE_REVIEW_THRESHOLDS = {
  /** Results below this trigger a review warning */
  lowWarning: 1200,
  /** Results above this trigger a review warning */
  highWarning: 5000,
  /** Absolute floor — never generate below this */
  absoluteMinimum: 800,
  /** Reasonable input bounds for typo detection */
  heightCm: { min: 50, max: 300 },
  weightKg: { min: 15, max: 500 },
  ageYears: { min: 13, max: 120 }
} as const;

// ─── Activity Multipliers ─────────────────────────────────────────────────────
// Central configuration — imported by onboarding and profile screens.
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { factor: number; label: string; description: string }> = {
  sedentary:    { factor: 1.2,   get label() { return tr("Sedentary"); },        get description() { return tr("Little or no regular exercise"); } },
  light:        { factor: 1.375, get label() { return tr("Lightly Active"); },   get description() { return tr("Light exercise 1\u20133 days per week"); } },
  moderate:     { factor: 1.55,  get label() { return tr("Moderately Active"); }, get description() { return tr("Moderate exercise 3\u20135 days per week"); } },
  very_active:  { factor: 1.725, get label() { return tr("Very Active"); },      get description() { return tr("Hard exercise 6\u20137 days per week"); } },
  athlete:      { factor: 1.9,   get label() { return tr("Highly Active"); },    get description() { return tr("Very hard exercise or physical job"); } }
} as const;

// ─── Weight Rate Constants ────────────────────────────────────────────────────
/**
 * Approximate energy equivalence for weight change estimation.
 * ~7,700 kcal per kg of body weight change is a commonly used approximation.
 * Note: Actual energy balance varies by individual. This is an estimate only.
 */
const KCAL_PER_KG_BODY_WEIGHT = 7700;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CalculationSex = 'male' | 'female';

export interface GoalCalculationInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  calculationSex: CalculationSex | null; // null when "prefer not to say"
  activityLevel: ActivityLevel;
  weeklyRateKg: number; // signed: negative = lose, positive = gain
}

export interface GoalCalculationResult {
  bmr: number;
  tdee: number;
  rawEstimatedCalories: number;
  reviewedSuggestedCalories: number;
  needsReview: boolean;
  reviewReason: string | null;
  protein: number;
  carbs: number;
  fat: number;
  wasAdjusted: boolean; // true if reviewed !== raw
}

export interface ValidationError {
  field: string;
  message: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates all inputs needed for goal calculation.
 * Returns an array of validation errors (empty = valid).
 */
export function validateGoalCalculationInput(input: Partial<GoalCalculationInput>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (input.weightKg === undefined || input.weightKg === null) {
    errors.push({ field: 'weightKg', message: tr("Current weight is required") });
  } else if (input.weightKg < CALORIE_REVIEW_THRESHOLDS.weightKg.min || input.weightKg > CALORIE_REVIEW_THRESHOLDS.weightKg.max) {
    errors.push({ field: 'weightKg', message: tr("Weight should be between {0} and {1} kg", CALORIE_REVIEW_THRESHOLDS.weightKg.min, CALORIE_REVIEW_THRESHOLDS.weightKg.max) });
  }

  if (input.heightCm === undefined || input.heightCm === null) {
    errors.push({ field: 'heightCm', message: tr("Height is required") });
  } else if (input.heightCm < CALORIE_REVIEW_THRESHOLDS.heightCm.min || input.heightCm > CALORIE_REVIEW_THRESHOLDS.heightCm.max) {
    errors.push({ field: 'heightCm', message: tr("Height should be between {0} and {1} cm", CALORIE_REVIEW_THRESHOLDS.heightCm.min, CALORIE_REVIEW_THRESHOLDS.heightCm.max) });
  }

  if (input.ageYears === undefined || input.ageYears === null) {
    errors.push({ field: 'ageYears', message: tr("Age is required for automatic calorie estimation") });
  } else if (input.ageYears < CALORIE_REVIEW_THRESHOLDS.ageYears.min || input.ageYears > CALORIE_REVIEW_THRESHOLDS.ageYears.max) {
    errors.push({ field: 'ageYears', message: tr("Age should be between {0} and {1} years", CALORIE_REVIEW_THRESHOLDS.ageYears.min, CALORIE_REVIEW_THRESHOLDS.ageYears.max) });
  }

  if (input.calculationSex === null || input.calculationSex === undefined) {
    errors.push({ field: 'calculationSex', message: tr("Biological sex is required for Mifflin–St Jeor estimation. You can set a manual calorie target instead.") });
  }

  if (!input.activityLevel) {
    errors.push({ field: 'activityLevel', message: tr("Activity level is required") });
  }

  return errors;
}

// ─── Core Calculations ────────────────────────────────────────────────────────

/**
 * Estimates Basal Metabolic Rate using Mifflin–St Jeor.
 * Returns null if any required input is missing or invalid.
 *
 * Mifflin–St Jeor:
 *   Male:   BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) + 5
 *   Female: BMR = 10 × weight(kg) + 6.25 × height(cm) - 5 × age(years) - 161
 */
export function estimateBasalEnergy(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: CalculationSex | null
): number | null {
  if (sex === null) return null; // Cannot estimate without sex-specific constant
  if (!isFinite(weightKg) || !isFinite(heightCm) || !isFinite(ageYears)) return null;
  if (weightKg <= 0 || heightCm <= 0 || ageYears <= 0) return null;

  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const sexOffset = sex === 'male' ? 5 : -161;

  const bmr = base + sexOffset;
  return bmr > 0 ? bmr : null;
}

/**
 * Estimates Total Daily Energy Expenditure (TDEE) = BMR × Activity Multiplier.
 * Returns null if BMR is null.
 */
export function estimateMaintenanceCalories(
  bmr: number | null,
  activityLevel: ActivityLevel
): number | null {
  if (bmr === null || !isFinite(bmr) || bmr <= 0) return null;

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel]?.factor ?? 1.55;
  const tdee = bmr * multiplier;
  return isFinite(tdee) && tdee > 0 ? tdee : null;
}

/**
 * Estimates goal calories by adjusting TDEE with weekly rate.
 * weeklyRateKg is signed: negative = calorie deficit (lose), positive = surplus (gain).
 *
 * Formula: goalCalories = TDEE + (weeklyRateKg × KCAL_PER_KG / 7)
 *
 * Returns the raw estimate and a reviewed suggestion with warnings.
 */
export function estimateGoalCalories(
  tdee: number,
  weeklyRateKg: number
): { raw: number; reviewed: number; needsReview: boolean; reviewReason: string | null; wasAdjusted: boolean } {
  const dailyAdjustment = safeFiniteNumber(weeklyRateKg, 0) * KCAL_PER_KG_BODY_WEIGHT / 7;
  const raw = tdee + dailyAdjustment;

  // Never generate zero or negative goals
  if (raw <= 0 || !isFinite(raw)) {
    return {
      raw: Number.isFinite(raw) ? Math.round(raw) : 0,
      reviewed: CALORIE_REVIEW_THRESHOLDS.absoluteMinimum,
      needsReview: true,
      reviewReason: `The calculated target (${Number.isFinite(raw) ? Math.round(raw) : 0} kcal) is outside the usable range. A review value of ${CALORIE_REVIEW_THRESHOLDS.absoluteMinimum} kcal is shown only to prevent an invalid goal; please adjust the inputs or set the target manually.`,
      wasAdjusted: true
    };
  }

  let reviewed = raw;
  let needsReview = false;
  let reviewReason: string | null = null;
  let wasAdjusted = false;

  if (raw < CALORIE_REVIEW_THRESHOLDS.lowWarning) {
    needsReview = true;
    reviewReason = `The estimated target (${Math.round(raw)} kcal) is below the typical review threshold of ${CALORIE_REVIEW_THRESHOLDS.lowWarning} kcal. Consider reviewing your weekly rate or consulting a professional.`;
    // Do NOT silently clamp — show the raw value and let user decide
  } else if (raw > CALORIE_REVIEW_THRESHOLDS.highWarning) {
    needsReview = true;
    reviewReason = `The estimated target (${Math.round(raw)} kcal) is above the typical review threshold of ${CALORIE_REVIEW_THRESHOLDS.highWarning} kcal. Please verify your inputs or set a manual target.`;
  }

  return { raw, reviewed, needsReview, reviewReason, wasAdjusted };
}

/**
 * Calculates macro targets from a calorie target.
 * Default split: ~30% protein, ~40% carbs, ~30% fat
 * Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g
 *
 * Returns rounded values for confirmed targets.
 */
export function calculateMacroTargets(goalCalories: number): { protein: number; carbs: number; fat: number } {
  const safe = safeFiniteNumber(goalCalories, 2100);
  const cal = Math.max(CALORIE_REVIEW_THRESHOLDS.absoluteMinimum, safe);

  const proteinCalories = cal * 0.30;
  const carbsCalories = cal * 0.40;
  const fatCalories = cal * 0.30;

  return {
    protein: Math.round(proteinCalories / 4),
    carbs: Math.round(carbsCalories / 4),
    fat: Math.round(fatCalories / 9)
  };
}

/**
 * Full goal calculation pipeline.
 * Returns null if required inputs are missing (never invents values).
 */
export function calculateFullGoals(input: GoalCalculationInput): GoalCalculationResult | null {
  const errors = validateGoalCalculationInput(input);
  if (errors.length > 0) return null;

  const bmr = estimateBasalEnergy(input.weightKg, input.heightCm, input.ageYears, input.calculationSex);
  if (bmr === null) return null;

  const tdee = estimateMaintenanceCalories(bmr, input.activityLevel);
  if (tdee === null) return null;

  const { raw, reviewed, needsReview, reviewReason, wasAdjusted } = estimateGoalCalories(tdee, input.weeklyRateKg);
  const macros = calculateMacroTargets(reviewed);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    rawEstimatedCalories: Math.round(raw),
    reviewedSuggestedCalories: Math.round(reviewed),
    needsReview,
    reviewReason,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    wasAdjusted
  };
}

/**
 * Calculates age in years from a date of birth string (YYYY-MM-DD).
 * Returns null if the date is invalid or in the future.
 */
export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth || typeof dateOfBirth !== 'string') return null;

  const parts = dateOfBirth.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const birth = new Date(year, month, day);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  if (birth > today) return null;

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Resolves biologicalSex to a CalculationSex suitable for Mifflin–St Jeor.
 * 'prefer_not_to_say' and 'other' return null — manual target required.
 */
export function resolveCalculationSex(
  biologicalSex: 'female' | 'male' | 'other' | 'prefer_not_to_say' | null | undefined
): CalculationSex | null {
  if (biologicalSex === 'male') return 'male';
  if (biologicalSex === 'female') return 'female';
  return null;
}

/**
 * Checks if a calorie target from macros is consistent with the goal target.
 * Returns true if within 5% tolerance.
 */
export function isMacroCalorieConsistent(
  macroCalories: number,
  goalCalories: number,
  tolerancePercent: number = 5
): boolean {
  if (goalCalories <= 0) return false;
  const diff = Math.abs(macroCalories - goalCalories);
  const toleranceAbs = goalCalories * (tolerancePercent / 100);
  return diff <= toleranceAbs;
}
