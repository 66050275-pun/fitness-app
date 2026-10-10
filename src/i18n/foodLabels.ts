import { translatedLabel, tr } from './index.ts';
import type { FoodDefinition, MealItem, LoggedFoodPortion } from '../types/index.ts';
function appFoodText(text: string): string {
  const translated = translatedLabel(text);
  if (translated !== text) return translated;
  if (/^\d/.test(text)) return text.replace(/\(([^)]+)\)/g, (_, description: string) => `(${translatedLabel(description)})`)
    .replace(/\b(g|kg|oz|lb|ml|l|serving|slice|scoop|piece|bowl|cup|tbsp|tsp|pack|bar)\b/g, unit => tr(unit));
  return text;
}
export function mealDescription(meal: MealItem): string {
  if (!meal.category) return tr(meal.mealType);
  return meal.foodSource === 'built_in' || meal.foodSource === 'demo'
    ? meal.category.split(' • ').map(appFoodText).join(' • ') : meal.category;
}
export function foodLabel(food: Pick<FoodDefinition, 'source'>, text: string): string {
  return food.source === 'built_in' || food.source === 'demo' ? appFoodText(text) : text;
}
export function mealLabel(meal: MealItem, text: string): string {
  return meal.foodSource === 'built_in' || meal.foodSource === 'demo' ? appFoodText(text) : text;
}
/** Translate generated quantity/unit prefixes while preserving custom serving descriptions. */
export function portionLabel(portion: LoggedFoodPortion, appOwned = false): string {
  const text = portion.servingDescription;
  if (appOwned) return appFoodText(text);
  const quantity = Math.round(portion.quantity * 100) / 100;
  const prefix = `${quantity} ${portion.unit}`;
  return text.startsWith(prefix) ? `${quantity} ${tr(portion.unit)}${text.slice(prefix.length)}` : text;
}
