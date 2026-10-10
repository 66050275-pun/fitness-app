import type { MealItem, MicronutrientProfile } from '../types/index.ts';

type MealNutrient = 'calories' | 'protein' | 'carbs' | 'fat';

/** An explicitly unknown snapshot nutrient must not become a legacy zero. */
export function getMealNutrientForDisplay(meal: MealItem, nutrient: MealNutrient): number | null {
  const snapshot = meal.nutritionSnapshot;
  const value = snapshot && Object.prototype.hasOwnProperty.call(snapshot, nutrient)
    ? snapshot[nutrient]
    : meal[nutrient];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

/** Use the recorded portion profile; legacy data is a fallback only if absent. */
export function getMealMicronutrientsForDisplay(meal: MealItem): MicronutrientProfile | undefined {
  const snapshot = meal.nutritionSnapshot;
  return snapshot && Object.prototype.hasOwnProperty.call(snapshot, 'micronutrients')
    ? snapshot.micronutrients
    : meal.micronutrients;
}
