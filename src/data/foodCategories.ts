/**
 * Food Categories configuration with stable keys and display labels.
 */

export interface FoodCategoryOption {
  value: string;
  label: string;
}

export const FOOD_CATEGORIES: FoodCategoryOption[] = [
  { value: 'grains_cereals', label: 'Grains & Cereals' },
  { value: 'bread_bakery', label: 'Bread & Bakery' },
  { value: 'fruits', label: 'Fruits' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'meat', label: 'Meat' },
  { value: 'poultry', label: 'Poultry' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'legumes', label: 'Legumes' },
  { value: 'nuts_seeds', label: 'Nuts & Seeds' },
  { value: 'oils_fats', label: 'Oils & Fats' },
  { value: 'snacks', label: 'Snacks' },
  { value: 'desserts_sweets', label: 'Desserts & Sweets' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'supplements', label: 'Supplements' },
  { value: 'prepared_meals', label: 'Prepared Meals' },
  { value: 'sauces_condiments', label: 'Sauces & Condiments' },
  { value: 'other', label: 'Other' }
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
