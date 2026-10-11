import type { ActivityLevel, FitnessObjective, NutritionGoals, OnboardingDraft, WeeklyWeightRate } from '../types/index.ts';
import { tr } from '../i18n/index.ts';
import { calculateMacroTargets, estimateBasalEnergy, estimateMaintenanceCalories } from './goalCalculations.ts';

export const ONBOARDING_OBJECTIVES: readonly {
  id: FitnessObjective; title: string; description: string; icon: string;
  calorieAdjustment: number; weightDirection: WeeklyWeightRate;
}[] = [
  { id: 'lose_weight', title: 'Lose Weight', description: 'Build sustainable habits and reduce body fat.', icon: 'directions_run', calorieAdjustment: -400, weightDirection: -0.25 },
  { id: 'build_muscle', title: 'Build Muscle', description: 'Support strength training with a moderate calorie surplus.', icon: 'fitness_center', calorieAdjustment: 250, weightDirection: 0.25 },
  { id: 'maintain_weight', title: 'Maintain Weight', description: 'Keep your weight steady with balanced nutrition.', icon: 'balance', calorieAdjustment: 0, weightDirection: 0 },
  { id: 'general_fitness', title: 'General Fitness', description: 'Improve everyday energy, movement and overall fitness.', icon: 'bolt', calorieAdjustment: 0, weightDirection: 0 },
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
}
function inRange(value: number | null, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** Canonical metric bounds are shared by the screen, controller and final store commit. */
export function validateOnboardingDraft(draft: OnboardingDraft, throughStep = 4): OnboardingValidationError[] {
  const errors: OnboardingValidationError[] = [];
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
      if (draft.primaryObjective === 'lose_weight' && draft.targetWeightKg >= draft.currentWeightKg)
        add('targetWeightKg', 'For weight loss, choose a target below your current weight.');
      if (draft.primaryObjective === 'build_muscle' && draft.targetWeightKg <= draft.currentWeightKg)
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
  return errors;
}

/** 32.5 ml/kg, rounded to 50 ml for a practical 30–35 ml/kg starting target. */
export function getOnboardingWaterTarget(weightKg: number | null): number | null {
  return inRange(weightKg, 30, 250) ? Math.round(weightKg * 32.5 / 50) * 50 : null;
}

/** Preview and committed targets use the same calculation; missing data never becomes a guessed profile. */
export function getOnboardingTargets(draft: OnboardingDraft): OnboardingTargetPreview | null {
  if (validateOnboardingDraft(draft, 3).length) return null;
  const objective = getObjective(draft.primaryObjective)!;
  const sex = draft.biologicalSex === 'male' || draft.biologicalSex === 'female' ? draft.biologicalSex : null;
  const bmr = estimateBasalEnergy(draft.currentWeightKg!, draft.heightCm!, draft.ageYears!, sex);
  const tdee = estimateMaintenanceCalories(bmr, draft.activityLevel!);
  const rawSuggested = tdee === null ? null : Math.round(tdee + objective.calorieAdjustment);
  const suggestedCalories = rawSuggested === null ? null : Math.min(10000, Math.max(800, rawSuggested));
  const calories = draft.calorieOverride ?? suggestedCalories;
  if (!inRange(calories, 800, 10000) || !Number.isInteger(calories)) return null;
  const macros = calculateMacroTargets(calories);
  const wasAdjusted = draft.calorieOverride === null && suggestedCalories !== rawSuggested;
  const needsReview = wasAdjusted || calories < 1200 || calories > 5000;
  return {
    goals: { calorieTarget: calories, proteinTarget: macros.protein, carbsTarget: macros.carbs,
      fatTarget: macros.fat, waterTarget: getOnboardingWaterTarget(draft.currentWeightKg)! },
    bmr: bmr === null ? null : Math.round(bmr), tdee: tdee === null ? null : Math.round(tdee), suggestedCalories,
    calorieAdjustment: tdee === null ? null : calories - Math.round(tdee), needsReview,
    reviewReason: wasAdjusted ? tr('Your target has been adjusted to the usable input range. Review it before continuing.')
      : needsReview ? tr('This calorie estimate is outside the usual review range. Check your inputs or adjust the target.') : null,
  };
}
