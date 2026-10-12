import type { ActivityLevel, FitnessObjective, NutritionGoals, OnboardingDraft, WeeklyWeightRate } from '../types/index.ts';
import { tr } from '../i18n/index.ts';
import { calculateMacroTargets, estimateBasalEnergy, estimateMaintenanceCalories } from './goalCalculations.ts';
import { MINI_CUT_MAX_DURATION_WEEKS, MINI_CUT_RECOMMENDED_DURATION_WEEKS, MINI_CUT_REFEED_FREQUENCY_DAYS, NutritionPlanError, NutritionPlanService } from '../services/nutritionPlanService.ts';
import type { MacroSplit, NutritionPlanGender } from '../services/nutritionPlanService.ts';

export const ONBOARDING_OBJECTIVES: readonly {
  id: FitnessObjective; title: string; description: string; icon: string;
  calorieAdjustment: number; weightDirection: WeeklyWeightRate;
}[] = [
  { id: 'lose_weight', title: 'Lose Weight', description: 'Build sustainable habits and reduce body fat.', icon: 'directions_run', calorieAdjustment: -400, weightDirection: -0.25 },
  { id: 'build_muscle', title: 'Build Muscle', description: 'Support strength training with a moderate calorie surplus.', icon: 'fitness_center', calorieAdjustment: 250, weightDirection: 0.25 },
  { id: 'maintain_weight', title: 'Maintain Weight', description: 'Keep your weight steady with balanced nutrition.', icon: 'balance', calorieAdjustment: 0, weightDirection: 0 },
  { id: 'general_fitness', title: 'General Fitness', description: 'Improve everyday energy, movement and overall fitness.', icon: 'bolt', calorieAdjustment: 0, weightDirection: 0 },
  { id: 'mini_cut', title: 'Mini Cut', description: 'A short fat-loss phase with extra protein to support muscle retention.', icon: 'local_fire_department', calorieAdjustment: -400, weightDirection: -0.25 },
  { id: 'lean_bulk', title: 'Lean Bulk', description: 'Build muscle with a controlled calorie surplus and weight-based protein.', icon: 'trending_up', calorieAdjustment: 220, weightDirection: 0.25 },
];
export const ONBOARDING_ACTIVITIES: readonly {
  id: ActivityLevel; title: string; description: string; icon: string;
}[] = [
  { id: 'sedentary', title: 'Sedentary', description: 'Mostly seated work with little regular exercise.', icon: 'chair' },
  { id: 'light', title: 'Lightly Active', description: 'Regular walking or light exercise 1–3 days per week.', icon: 'directions_walk' },
  { id: 'moderate', title: 'Moderately Active', description: 'Training or active movement 3–5 days per week.', icon: 'exercise' },
  { id: 'very_active', title: 'Very Active', description: 'Hard training or an active routine 6–7 days per week.', icon: 'local_fire_department' },
];
export function getObjective(id: FitnessObjective | null) { return ONBOARDING_OBJECTIVES.find(objective => objective.id === id); }
export interface OnboardingValidationError { field: string; message: string; }
export interface OnboardingTargetPreview {
  goals: NutritionGoals;
  bmr: number | null;
  tdee: number | null;
  suggestedCalories: number | null;
  calorieAdjustment: number | null;
  needsReview: boolean;
  reviewReason: string | null;
  programDetails?: {
    kind: 'mini_cut' | 'lean_bulk';
    recommendedDurationWeeks?: number;
    maxDurationWeeks?: number;
    refeedFrequencyDays?: number;
    minWeeklyGainKg?: number;
    maxWeeklyGainKg?: number;
  };
}
function inRange(value: number | null, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** Canonical metric bounds are shared by the screen, controller and final store commit. */
export function validateOnboardingDraft(draft: OnboardingDraft, throughStep = 4): OnboardingValidationError[] {
  const errors: OnboardingValidationError[] = [];
  if (throughStep < 1) return errors;
  const add = (field: string, message: string) => errors.push({ field, message: tr(message) });
  if (!getObjective(draft.primaryObjective)) add('primaryObjective', 'Choose your primary fitness objective.');
  if (throughStep < 2) return errors;
  if (!['male', 'female', 'other'].includes(draft.biologicalSex ?? '')) add('biologicalSex', 'Choose Male, Female or Other.');
  if (!inRange(draft.ageYears, 15, 100) || !Number.isInteger(draft.ageYears)) add('ageYears', 'Enter a whole-number age between 15 and 100.');
  if (!inRange(draft.heightCm, 100, 250)) add('heightCm', 'Enter a height between 100 and 250 cm.');
  if (!inRange(draft.currentWeightKg, 30, 250)) add('currentWeightKg', 'Enter a current weight between 30 and 250 kg.');
  if (draft.targetWeightKg !== null) {
    if (!inRange(draft.targetWeightKg, 30, 250)) add('targetWeightKg', 'Enter a target weight between 30 and 250 kg.');
    else if (inRange(draft.currentWeightKg, 30, 250)) {
      if ((draft.primaryObjective === 'lose_weight' || draft.primaryObjective === 'mini_cut') && draft.targetWeightKg >= draft.currentWeightKg)
        add('targetWeightKg', 'For weight loss, choose a target below your current weight.');
      if ((draft.primaryObjective === 'build_muscle' || draft.primaryObjective === 'lean_bulk') && draft.targetWeightKg <= draft.currentWeightKg)
        add('targetWeightKg', 'For muscle gain, choose a target above your current weight.');
      if ((draft.primaryObjective === 'maintain_weight' || draft.primaryObjective === 'general_fitness') &&
        Math.abs(draft.targetWeightKg - draft.currentWeightKg) > 0.05)
        add('targetWeightKg', 'For maintenance or general fitness, leave the target blank or match your current weight.');
    }
  }
  if (throughStep < 3) return errors;
  if (!ONBOARDING_ACTIVITIES.some(activity => activity.id === draft.activityLevel)) add('activityLevel', 'Choose your usual daily activity level.');
  if (throughStep < 4) return errors;
  if (draft.calorieOverride !== null && (!inRange(draft.calorieOverride, 800, 10000) || !Number.isInteger(draft.calorieOverride)))
    add('calorieOverride', 'Enter a daily calorie target between 800 and 10000 kcal.');
  else if (draft.biologicalSex === 'other' && draft.calorieOverride === null)
    add('calorieOverride', 'For Other, enter a calorie target manually; Mifflin–St Jeor only defines male and female equations.');
  if (!errors.length) {
    const context = getCalculationContext(draft);
    const issue = context === null ? null : getSpecialPlanIssue(draft, context);
    if (issue !== null) errors.push({ field: 'calorieOverride', message: issue });
  }
  return errors;
}

/** Goal-specific starting hydration target, rounded to a practical 50 ml. */
export function getOnboardingWaterTarget(weightKg: number | null, objective: FitnessObjective | null = null): number | null {
  const millilitresPerKg = objective === 'mini_cut' ? 38 : objective === 'lean_bulk' ? 35 : 32.5;
  return inRange(weightKg, 30, 250) ? Math.round(weightKg * millilitresPerKg / 50) * 50 : null;
}

interface CalculationContext {
  bmr: number | null;
  tdee: number | null;
  rawSuggested: number | null;
  suggestedCalories: number | null;
  calories: number | null;
  gender: NutritionPlanGender;
}

function getCalculationContext(draft: OnboardingDraft): CalculationContext | null {
  if (validateOnboardingDraft(draft, 3).length) return null;
  const objective = getObjective(draft.primaryObjective)!;
  const sex = draft.biologicalSex === 'male' || draft.biologicalSex === 'female' ? draft.biologicalSex : null;
  // "Other" keeps its manual-energy path; the Mini Cut floor is a plan setting, not a sex assumption.
  const gender: NutritionPlanGender = sex ?? 'other';
  const bmr = estimateBasalEnergy(draft.currentWeightKg!, draft.heightCm!, draft.ageYears!, sex);
  const tdee = estimateMaintenanceCalories(bmr, draft.activityLevel!);
  let rawSuggested: number | null = null;
  if (tdee !== null) {
    rawSuggested = draft.primaryObjective === 'mini_cut'
      ? NutritionPlanService.calculateMiniCutCalories(tdee, gender)
      : draft.primaryObjective === 'lean_bulk'
        ? NutritionPlanService.calculateLeanBulkCalories(tdee, 'intermediate').calorieTarget
        : Math.round(tdee + objective.calorieAdjustment);
  }
  const suggestedCalories = rawSuggested === null ? null : Math.min(10000, Math.max(800, rawSuggested));
  const calories = draft.calorieOverride ?? suggestedCalories;
  return { bmr, tdee, rawSuggested, suggestedCalories, calories, gender };
}

/** Energy estimates stay visible even when the proposed macro budget needs adjustment. */
export function getOnboardingEnergyEstimate(draft: OnboardingDraft): {
  bmr: number | null; tdee: number | null; suggestedCalories: number | null;
} | null {
  const context = getCalculationContext(draft);
  return context === null ? null : {
    bmr: context.bmr === null ? null : Math.round(context.bmr),
    tdee: context.tdee === null ? null : Math.round(context.tdee),
    suggestedCalories: context.suggestedCalories,
  };
}

function getSpecialMacros(draft: OnboardingDraft, calories: number): MacroSplit | null {
  if (draft.primaryObjective === 'mini_cut') return NutritionPlanService.calculateMiniCutMacros(calories, draft.currentWeightKg!);
  if (draft.primaryObjective === 'lean_bulk') return NutritionPlanService.calculateLeanBulkMacros(calories, draft.currentWeightKg!);
  return null;
}

/** Blocking special-plan issues are shared by preview and final confirmation. */
function getSpecialPlanIssue(draft: OnboardingDraft, context: CalculationContext): string | null {
  const { calories, tdee, gender } = context;
  if (!inRange(calories, 800, 10000) || !Number.isInteger(calories)) return null;
  if (draft.primaryObjective === 'mini_cut') {
    const minimumCalories = gender === 'female' ? 1200 : 1500;
    if (calories < minimumCalories)
      return tr('Mini Cut requires at least {0} kcal for the selected plan setting. Increase the target or choose another goal.', minimumCalories);
    if (tdee !== null && minimumCalories >= tdee)
      return tr('Mini Cut cannot create a deficit with these inputs while respecting the {0} kcal minimum. Review your metrics or choose another goal.', minimumCalories);
    if (tdee !== null && calories >= tdee)
      return tr('Mini Cut needs a calorie target below your estimated TDEE ({0} kcal). Lower the target within the minimum or choose another goal.', Math.round(tdee));
  }
  if (draft.primaryObjective === 'lean_bulk' && tdee !== null && calories <= tdee)
    return tr('This Lean Bulk target is not above your estimated TDEE. Increase calories if you want a surplus.');
  try {
    getSpecialMacros(draft, calories);
    return null;
  } catch (error: unknown) {
    if (error instanceof NutritionPlanError) {
      if (draft.primaryObjective === 'mini_cut' && tdee !== null && error.code === 'macro_budget' &&
        error.minimumCalories !== undefined && error.minimumCalories >= tdee)
        return tr('Mini Cut cannot fit its protein and fat targets below your estimated TDEE. Review your metrics or choose another goal.');
      return error.message;
    }
    throw error;
  }
}

/** Also works when an infeasible automatic plan cannot produce a macro preview. */
export function getOnboardingReviewMessage(draft: OnboardingDraft): string | null {
  const context = getCalculationContext(draft);
  if (context === null) return null;
  const issue = getSpecialPlanIssue(draft, context);
  if (issue !== null) return issue;
  const { calories, tdee, rawSuggested, suggestedCalories, gender } = context;
  if (!inRange(calories, 800, 10000) || !Number.isInteger(calories)) return null;
  if (draft.calorieOverride === null && suggestedCalories !== rawSuggested)
    return tr('Your target has been adjusted to the usable input range. Review it before continuing.');
  if (draft.primaryObjective === 'mini_cut' && tdee !== null && draft.calorieOverride === null &&
    Math.round(tdee * 0.75) < (gender === 'female' ? 1200 : 1500))
    return tr('The Mini Cut estimate uses the {0} kcal minimum. Review the smaller deficit before continuing.', gender === 'female' ? 1200 : 1500);
  if (calories < 1200 || calories > 5000)
    return tr('This calorie estimate is outside the usual review range. Check your inputs or adjust the target.');
  return null;
}

/** Preview and committed targets use the same calculation; missing data never becomes a guessed profile. */
export function getOnboardingTargets(draft: OnboardingDraft): OnboardingTargetPreview | null {
  const context = getCalculationContext(draft);
  if (context === null) return null;
  const { bmr, tdee, suggestedCalories, calories, gender } = context;
  if (!inRange(calories, 800, 10000) || !Number.isInteger(calories)) return null;
  if (getSpecialPlanIssue(draft, context) !== null) return null;
  const specialMacros = getSpecialMacros(draft, calories);
  const macros = specialMacros === null ? calculateMacroTargets(calories)
    : { protein: specialMacros.proteinGrams, carbs: specialMacros.carbsGrams, fat: specialMacros.fatGrams };
  const reviewReason = getOnboardingReviewMessage(draft);
  let programDetails: OnboardingTargetPreview['programDetails'];
  if (draft.primaryObjective === 'mini_cut') {
    const limits = draft.calorieOverride === null && tdee !== null
      ? NutritionPlanService.getMiniCutPlanDetails(tdee, draft.currentWeightKg!, gender)
      : { recommendedDurationWeeks: MINI_CUT_RECOMMENDED_DURATION_WEEKS, maxDurationWeeks: MINI_CUT_MAX_DURATION_WEEKS, refeedFrequencyDays: MINI_CUT_REFEED_FREQUENCY_DAYS };
    programDetails = {
      kind: 'mini_cut', recommendedDurationWeeks: limits.recommendedDurationWeeks,
      maxDurationWeeks: limits.maxDurationWeeks, refeedFrequencyDays: limits.refeedFrequencyDays,
    };
  } else if (draft.primaryObjective === 'lean_bulk') {
    programDetails = { kind: 'lean_bulk', minWeeklyGainKg: draft.currentWeightKg! * 0.0025, maxWeeklyGainKg: draft.currentWeightKg! * 0.005 };
  }
  return {
    goals: { calorieTarget: calories, proteinTarget: macros.protein, carbsTarget: macros.carbs,
      fatTarget: macros.fat, waterTarget: getOnboardingWaterTarget(draft.currentWeightKg, draft.primaryObjective)! },
    bmr: bmr === null ? null : Math.round(bmr), tdee: tdee === null ? null : Math.round(tdee), suggestedCalories,
    calorieAdjustment: tdee === null ? null : calories - Math.round(tdee), needsReview: reviewReason !== null,
    reviewReason, ...(programDetails ? { programDetails } : {}),
  };
}
