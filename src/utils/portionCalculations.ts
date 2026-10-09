/**
 * Portion Units & Nutrition Calculations
 * 
 * Rules:
 * 1. Convert mass ↔ mass freely.
 * 2. Convert volume ↔ volume freely.
 * 3. Prohibit volume ↔ mass conversion unless densityGramsPerMl is provided.
 * 4. Units piece, slice, bowl, scoop, and serving require equivalentBaseAmount from FoodPortionOption.
 * 5. If no conversion mapping exists, return null.
 * 6. Internal precision is preserved; round only for UI display.
 * 7. Guard against NaN, Infinity, zero, and negative values.
 * 8. Null nutrition values remain null (never coerced to 0).
 */

import type { 
  FoodUnit, 
  MeasurementDimension, 
  FoodDefinition, 
  NutritionValues 
} from '../types/index.ts';
import { scaleMicronutrientProfile } from './nutrientCalculations';

// Mass conversions to grams
const MASS_TO_GRAMS: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592
};

// Volume conversions to milliliters
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 5,
  tbsp: 15,
  cup: 240
};

/**
 * Returns the physical dimension category for a given FoodUnit.
 */
export function getUnitDimension(unit: FoodUnit): MeasurementDimension {
  if (unit in MASS_TO_GRAMS) return 'mass';
  if (unit in VOLUME_TO_ML) return 'volume';
  if (unit === 'serving') return 'serving';
  return 'count'; // piece, slice, bowl, scoop
}

/**
 * Converts mass units. Returns null if invalid or incompatible.
 */
export function convertMassUnit(amount: number, fromUnit: FoodUnit, toUnit: FoodUnit): number | null {
  if (isNaN(amount) || !isFinite(amount) || amount <= 0) return null;
  const fromFactor = MASS_TO_GRAMS[fromUnit];
  const toFactor = MASS_TO_GRAMS[toUnit];
  if (!fromFactor || !toFactor) return null;

  const grams = amount * fromFactor;
  return grams / toFactor;
}

/**
 * Converts volume units. Returns null if invalid or incompatible.
 */
export function convertVolumeUnit(amount: number, fromUnit: FoodUnit, toUnit: FoodUnit): number | null {
  if (isNaN(amount) || !isFinite(amount) || amount <= 0) return null;
  const fromFactor = VOLUME_TO_ML[fromUnit];
  const toFactor = VOLUME_TO_ML[toUnit];
  if (!fromFactor || !toFactor) return null;

  const mls = amount * fromFactor;
  return mls / toFactor;
}

/**
 * Resolves a requested portion quantity and unit to the food's base nutrition unit ('g', 'ml', or 'serving').
 * Strictly prohibits volume ↔ mass conversions if densityGramsPerMl is absent.
 */
export function resolvePortionToBaseAmount(
  quantity: number, 
  unit: FoodUnit, 
  food: FoodDefinition
): { baseAmount: number; baseUnit: 'g' | 'ml' | 'serving' } | null {
  if (isNaN(quantity) || !isFinite(quantity) || quantity <= 0) return null;

  const baseUnit = food.nutritionBasis.unit;
  const unitDim = getUnitDimension(unit);

  // 1. Exact match with base unit
  if (unit === baseUnit) {
    return { baseAmount: quantity, baseUnit };
  }

  // 2. Base unit is 'g' (mass-based food)
  if (baseUnit === 'g') {
    if (unitDim === 'mass') {
      const convertedGrams = convertMassUnit(quantity, unit, 'g');
      return convertedGrams !== null ? { baseAmount: convertedGrams, baseUnit: 'g' } : null;
    }

    // Check portionOptions for direct mapping (e.g. 1 scoop = 30 g, 1 cup = 80 g, 1 slice = 28 g)
    const option = food.portionOptions.find(opt => opt.unit === unit);
    if (option && option.equivalentBaseUnit === 'g' && option.quantity > 0) {
      const ratio = quantity / option.quantity;
      return { baseAmount: option.equivalentBaseAmount * ratio, baseUnit: 'g' };
    }

    // If unit is volume and food defines density (grams per ml): mass = volume * density
    if (unitDim === 'volume' && food.densityGramsPerMl && food.densityGramsPerMl > 0) {
      const ml = convertVolumeUnit(quantity, unit, 'ml');
      if (ml !== null) {
        return { baseAmount: ml * food.densityGramsPerMl, baseUnit: 'g' };
      }
    }

    // Otherwise prohibited: no density and no portion option mapping
    return null;
  }

  // 3. Base unit is 'ml' (volume-based food)
  if (baseUnit === 'ml') {
    if (unitDim === 'volume') {
      const convertedMl = convertVolumeUnit(quantity, unit, 'ml');
      return convertedMl !== null ? { baseAmount: convertedMl, baseUnit: 'ml' } : null;
    }

    // Check portionOptions for direct mapping
    const option = food.portionOptions.find(opt => opt.unit === unit);
    if (option && option.equivalentBaseUnit === 'ml' && option.quantity > 0) {
      const ratio = quantity / option.quantity;
      return { baseAmount: option.equivalentBaseAmount * ratio, baseUnit: 'ml' };
    }

    // If unit is mass and food defines density: volume = mass / density
    if (unitDim === 'mass' && food.densityGramsPerMl && food.densityGramsPerMl > 0) {
      const grams = convertMassUnit(quantity, unit, 'g');
      if (grams !== null) {
        return { baseAmount: grams / food.densityGramsPerMl, baseUnit: 'ml' };
      }
    }

    // Otherwise prohibited
    return null;
  }

  // 4. Base unit is 'serving'
  if (baseUnit === 'serving') {
    if (unit === 'serving') {
      return { baseAmount: quantity, baseUnit: 'serving' };
    }

    // Check portionOptions for serving-based mappings
    const option = food.portionOptions.find(opt => opt.unit === unit);
    if (option && option.quantity > 0) {
      const ratio = quantity / option.quantity;
      return { baseAmount: option.equivalentBaseAmount * ratio, baseUnit: 'serving' };
    }

    return null;
  }

  return null;
}

/**
 * Calculates the multiplier relative to the food's nutrition basis amount.
 * Example: Rolled Oats 379 kcal per 100g. User selects 50g -> multiplier = 50 / 100 = 0.5.
 */
export function calculatePortionMultiplier(
  quantity: number, 
  unit: FoodUnit, 
  food: FoodDefinition
): number | null {
  if (isNaN(quantity) || !isFinite(quantity) || quantity <= 0) return null;
  const basisAmount = food.nutritionBasis.amount;
  if (!basisAmount || basisAmount <= 0) return null;

  const resolved = resolvePortionToBaseAmount(quantity, unit, food);
  if (!resolved) return null;

  const multiplier = resolved.baseAmount / basisAmount;
  if (isNaN(multiplier) || !isFinite(multiplier) || multiplier <= 0) return null;

  return multiplier;
}

/**
 * Scales all nutrition values (calories, macros, and micronutrients) by the portion multiplier.
 * Preserves null values strictly without converting to 0.
 */
export function scaleNutritionForPortion(
  nutrition: NutritionValues, 
  multiplier: number
): NutritionValues {
  if (isNaN(multiplier) || !isFinite(multiplier) || multiplier <= 0) {
    return {
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
      sugar: null,
      sodium: null,
      micronutrients: undefined
    };
  }

  return {
    calories: nutrition.calories !== null && !isNaN(nutrition.calories) 
      ? Math.round(nutrition.calories * multiplier * 100) / 100 
      : null,
    protein: nutrition.protein !== null && !isNaN(nutrition.protein) 
      ? Math.round(nutrition.protein * multiplier * 100) / 100 
      : null,
    carbs: nutrition.carbs !== null && !isNaN(nutrition.carbs) 
      ? Math.round(nutrition.carbs * multiplier * 100) / 100 
      : null,
    fat: nutrition.fat !== null && !isNaN(nutrition.fat) 
      ? Math.round(nutrition.fat * multiplier * 100) / 100 
      : null,
    fiber: nutrition.fiber !== null && nutrition.fiber !== undefined && !isNaN(nutrition.fiber) 
      ? Math.round(nutrition.fiber * multiplier * 100) / 100 
      : null,
    sugar: nutrition.sugar !== null && nutrition.sugar !== undefined && !isNaN(nutrition.sugar) 
      ? Math.round(nutrition.sugar * multiplier * 100) / 100 
      : null,
    sodium: nutrition.sodium !== null && nutrition.sodium !== undefined && !isNaN(nutrition.sodium) 
      ? Math.round(nutrition.sodium * multiplier * 100) / 100 
      : null,
    micronutrients: nutrition.micronutrients 
      ? scaleMicronutrientProfile(nutrition.micronutrients, multiplier) 
      : undefined
  };
}

/**
 * Formats a clean, user-friendly portion label.
 * E.g., "50 g", "1.5 cup", "1 scoop (30 g)", "0.5 serving"
 */
export function formatPortionLabel(
  quantity: number, 
  unit: FoodUnit, 
  servingDescription?: string
): string {
  const roundedQty = Math.round(quantity * 100) / 100;
  const descSuffix = servingDescription ? ` (${servingDescription})` : '';
  return `${roundedQty} ${unit}${descSuffix}`;
}

/**
 * Helper to determine which FoodUnits are supported/available for a given FoodDefinition.
 */
export function getAvailableUnitsForFood(food: FoodDefinition): FoodUnit[] {
  const baseUnit = food.nutritionBasis.unit;
  const available = new Set<FoodUnit>([baseUnit]);

  // Mass units available if base is 'g'
  if (baseUnit === 'g') {
    (['g', 'kg', 'mg', 'oz', 'lb'] as FoodUnit[]).forEach(u => available.add(u));
    // Volume units available if density is set
    if (food.densityGramsPerMl && food.densityGramsPerMl > 0) {
      (['ml', 'l', 'cup', 'tbsp', 'tsp'] as FoodUnit[]).forEach(u => available.add(u));
    }
  }

  // Volume units available if base is 'ml'
  if (baseUnit === 'ml') {
    (['ml', 'l', 'cup', 'tbsp', 'tsp'] as FoodUnit[]).forEach(u => available.add(u));
    // Mass units available if density is set
    if (food.densityGramsPerMl && food.densityGramsPerMl > 0) {
      (['g', 'kg', 'mg', 'oz', 'lb'] as FoodUnit[]).forEach(u => available.add(u));
    }
  }

  // Any units defined in portionOptions
  food.portionOptions.forEach(opt => available.add(opt.unit));

  return Array.from(available);
}
