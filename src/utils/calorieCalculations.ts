/**
 * Macronutrient-to-Calories (4–4–9) Calculation and Consistency Utilities
 * 
 * Rules:
 * 1. Protein = 4 kcal/g
 * 2. Carbohydrates = 4 kcal/g
 * 3. Fat = 9 kcal/g
 * 4. Fiber, sugar alcohols, and alcohol are excluded from this formula.
 * 5. Returns null if any macro is null, negative, NaN, or infinite. Value 0 is valid.
 * 6. Internal calculations preserve precision; integer rounding applied when formatting.
 * 7. Warn when absolute difference > 20 kcal AND > 10% of calculated calories.
 */

import type { CalorieValueSource } from '../types/index.ts';

export const ENERGY_PER_GRAM = {
  protein: 4,
  carbohydrates: 4,
  fat: 9
} as const;

export interface MacroValues {
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface MacroEnergyBreakdown {
  proteinCalories: number;
  carbohydrateCalories: number;
  fatCalories: number;
  totalCalories: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
}

export interface CalorieConsistencyResult {
  enteredCalories: number;
  calculatedCalories: number;
  differenceCalories: number;
  differencePercent: number | null;
  shouldWarn: boolean;
}

/**
 * Checks if all three primary macros (protein, carbs, fat) are explicitly defined and non-negative.
 * Value 0 is considered valid. Null, undefined, negative, NaN, and Infinity are invalid.
 */
export function areMacrosCompleteAndValid(macros: MacroValues): boolean {
  if (macros.protein === null || macros.carbs === null || macros.fat === null) return false;
  if (typeof macros.protein !== 'number' || typeof macros.carbs !== 'number' || typeof macros.fat !== 'number') return false;
  if (isNaN(macros.protein) || isNaN(macros.carbs) || isNaN(macros.fat)) return false;
  if (!isFinite(macros.protein) || !isFinite(macros.carbs) || !isFinite(macros.fat)) return false;
  if (macros.protein < 0 || macros.carbs < 0 || macros.fat < 0) return false;
  return true;
}

/**
 * Calculates energy breakdown and total calories from macros using the 4-4-9 formula.
 * Returns null if any macro is missing or invalid.
 */
export function calculateCaloriesFromMacros(macros: MacroValues): MacroEnergyBreakdown | null {
  if (!areMacrosCompleteAndValid(macros)) {
    return null;
  }

  const p = macros.protein!;
  const c = macros.carbs!;
  const f = macros.fat!;

  const proteinCalories = p * ENERGY_PER_GRAM.protein;
  const carbohydrateCalories = c * ENERGY_PER_GRAM.carbohydrates;
  const fatCalories = f * ENERGY_PER_GRAM.fat;
  const totalCalories = proteinCalories + carbohydrateCalories + fatCalories;

  const proteinPercent = totalCalories > 0 ? (proteinCalories / totalCalories) * 100 : 0;
  const carbsPercent = totalCalories > 0 ? (carbohydrateCalories / totalCalories) * 100 : 0;
  const fatPercent = totalCalories > 0 ? (fatCalories / totalCalories) * 100 : 0;

  return {
    proteinCalories,
    carbohydrateCalories,
    fatCalories,
    totalCalories,
    proteinPercent,
    carbsPercent,
    fatPercent
  };
}

/**
 * Evaluates whether entered calories significantly deviate from the calculated 4-4-9 value.
 * Warning triggers when:
 * - Absolute difference > 20 kcal
 * - AND relative difference > 10%
 */
export function checkCalorieConsistency(
  enteredCalories: number | null,
  macros: MacroValues
): CalorieConsistencyResult | null {
  if (
    enteredCalories === null || 
    typeof enteredCalories !== 'number' ||
    isNaN(enteredCalories) || 
    !isFinite(enteredCalories) || 
    enteredCalories < 0
  ) {
    return null;
  }

  const breakdown = calculateCaloriesFromMacros(macros);
  if (!breakdown) {
    return null;
  }

  const calculatedCalories = breakdown.totalCalories;
  const differenceCalories = Math.abs(enteredCalories - calculatedCalories);

  let differencePercent: number | null = null;
  if (calculatedCalories > 0) {
    differencePercent = (differenceCalories / calculatedCalories) * 100;
  } else if (enteredCalories > 0) {
    differencePercent = 100;
  } else {
    differencePercent = 0;
  }

  const shouldWarn = differenceCalories > 20 && differencePercent !== null && differencePercent > 10;

  return {
    enteredCalories,
    calculatedCalories,
    differenceCalories,
    differencePercent,
    shouldWarn
  };
}

/**
 * Converts calorie source identifier to human-readable label.
 */
export function getCalorieSourceLabel(source?: CalorieValueSource): string {
  switch (source) {
    case 'calculated_from_macros':
      return 'Calculated from macros';
    case 'manual':
      return 'Entered manually';
    case 'nutrition_label':
      return 'Nutrition label';
    case 'database':
      return 'Food database';
    case 'ai_estimate':
      return 'AI estimate';
    case 'demo':
      return 'Demo data';
    default:
      return 'Entered manually';
  }
}
