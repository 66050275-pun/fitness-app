import { tr } from '../i18n/index.ts';
/**
 * Food Categories configuration with stable keys and display labels.
 */

export interface FoodCategoryOption {
  value: string;
  label: string;
}

export const FOOD_CATEGORIES: FoodCategoryOption[] = [
  { value: 'grains_cereals', get label() { return tr("Grains & Cereals"); } },
  { value: 'bread_bakery', get label() { return tr("Bread & Bakery"); } },
  { value: 'fruits', get label() { return tr("Fruits"); } },
  { value: 'vegetables', get label() { return tr("Vegetables"); } },
  { value: 'meat', get label() { return tr("Meat"); } },
  { value: 'poultry', get label() { return tr("Poultry"); } },
  { value: 'seafood', get label() { return tr("Seafood"); } },
  { value: 'eggs', get label() { return tr("Eggs"); } },
  { value: 'dairy', get label() { return tr("Dairy"); } },
  { value: 'legumes', get label() { return tr("Legumes"); } },
  { value: 'nuts_seeds', get label() { return tr("Nuts & Seeds"); } },
  { value: 'oils_fats', get label() { return tr("Oils & Fats"); } },
  { value: 'snacks', get label() { return tr("Snacks"); } },
  { value: 'desserts_sweets', get label() { return tr("Desserts & Sweets"); } },
  { value: 'beverages', get label() { return tr("Beverages"); } },
  { value: 'supplements', get label() { return tr("Supplements"); } },
  { value: 'prepared_meals', get label() { return tr("Prepared Meals"); } },
  { value: 'sauces_condiments', get label() { return tr("Sauces & Condiments"); } },
  { value: 'other', get label() { return tr("Other"); } }
];

/**
 * Returns human-readable display label for a category key.
 */
export function getCategoryLabel(categoryKey?: string): string {
  if (!categoryKey) return 'Other';
  const found = FOOD_CATEGORIES.find(c => c.value === categoryKey);
  if (found) return found.label;
  return categoryKey;
}
