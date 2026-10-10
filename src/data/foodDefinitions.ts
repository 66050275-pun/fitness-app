/**
 * Built-in Food Definitions Catalog
 * 
 * Each FoodDefinition provides:
 * - Clear nutritionBasis (per 100g, per 100ml, or per serving)
 * - Complete portionOptions with dimensions and base mappings
 * - Compatible with the unified FoodDefinition model
 */

import type { FoodDefinition } from '../types/index.ts';
import { THAI_SINGLE_DISH_CATALOG } from './thaiFoodCatalog.ts';
import { 
  DEMO_CHICKEN_BREAST_MICRONUTRIENTS, 
  DEMO_SALMON_BOWL_MICRONUTRIENTS, 
  DEMO_GREEK_YOGURT_MICRONUTRIENTS 
} from './demoNutritionData';

export const BUILT_IN_FOOD_DEFINITIONS: FoodDefinition[] = [
  ...THAI_SINGLE_DISH_CATALOG,
  // ==========================================
  // GRAINS & CARBOHYDRATES
  // ==========================================
  {
    id: 'food-rolled-oats',
    name: 'Rolled Oats',
    brand: 'NutriAI Whole Grains',
    category: 'Grains & Complex Carbs',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g dry rolled oats'
    },
    nutrition: {
      calories: 379,
      protein: 13.2,
      carbs: 67.7,
      fat: 6.5,
      fiber: 10.1,
      sugar: 1.0,
      sodium: 6
    },
    portionOptions: [
      { id: 'oats-50g', label: '50 g (1/2 cup dry)', unit: 'g', dimension: 'mass', quantity: 50, equivalentBaseAmount: 50, equivalentBaseUnit: 'g' },
      { id: 'oats-100g', label: '100 g (full serving)', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'oats-cup', label: '1 cup dry (80g)', unit: 'cup', dimension: 'volume', quantity: 1, equivalentBaseAmount: 80, equivalentBaseUnit: 'g' },
      { id: 'oats-serving', label: '1 standard serving (40g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 40, equivalentBaseUnit: 'g' },
      { id: 'oats-scoop', label: '1 scoop (30g)', unit: 'scoop', dimension: 'count', quantity: 1, equivalentBaseAmount: 30, equivalentBaseUnit: 'g' },
      { id: 'oats-bowl', label: '1 cooked bowl (150g)', unit: 'bowl', dimension: 'count', quantity: 1, equivalentBaseAmount: 50, equivalentBaseUnit: 'g' }
    ],
    densityGramsPerMl: null, // No volume ↔ mass conversion without mapping
    icon: 'grain',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-brown-rice',
    name: 'Steamed Brown Jasmine Rice',
    brand: 'Whole Grains',
    category: 'Grains & Complex Carbs',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g cooked'
    },
    nutrition: {
      calories: 111,
      protein: 2.6,
      carbs: 23,
      fat: 0.9,
      fiber: 1.8,
      sugar: 0.4,
      sodium: 5
    },
    portionOptions: [
      { id: 'rice-100g', label: '100 g', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'rice-150g', label: '150 g', unit: 'g', dimension: 'mass', quantity: 150, equivalentBaseAmount: 150, equivalentBaseUnit: 'g' },
      { id: 'rice-cup', label: '1 cup cooked (195g)', unit: 'cup', dimension: 'volume', quantity: 1, equivalentBaseAmount: 195, equivalentBaseUnit: 'g' },
      { id: 'rice-bowl', label: '1 bowl (200g)', unit: 'bowl', dimension: 'count', quantity: 1, equivalentBaseAmount: 200, equivalentBaseUnit: 'g' },
      { id: 'rice-serving', label: '1 serving (150g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 150, equivalentBaseUnit: 'g' }
    ],
    icon: 'rice_bowl',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-sweet-potato',
    name: 'Roasted Sweet Potato',
    category: 'Grains & Complex Carbs',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g roasted'
    },
    nutrition: {
      calories: 90,
      protein: 2.0,
      carbs: 20.7,
      fat: 0.1,
      fiber: 3.3,
      sugar: 6.5,
      sodium: 36
    },
    portionOptions: [
      { id: 'sp-100g', label: '100 g', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'sp-piece', label: '1 medium potato (150g)', unit: 'piece', dimension: 'count', quantity: 1, equivalentBaseAmount: 150, equivalentBaseUnit: 'g' },
      { id: 'sp-serving', label: '1 serving (130g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 130, equivalentBaseUnit: 'g' }
    ],
    icon: 'nutrition',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ==========================================
  // PROTEINS & MEATS
  // ==========================================
  {
    id: 'food-chicken-breast',
    name: 'Grilled Chicken Breast',
    category: 'Poultry & Meat',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g cooked'
    },
    nutrition: {
      calories: 165,
      protein: 31.0,
      carbs: 0,
      fat: 3.6,
      sodium: 74,
      micronutrients: DEMO_CHICKEN_BREAST_MICRONUTRIENTS
    },
    portionOptions: [
      { id: 'chk-100g', label: '100 g', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'chk-150g', label: '150 g (medium breast)', unit: 'g', dimension: 'mass', quantity: 150, equivalentBaseAmount: 150, equivalentBaseUnit: 'g' },
      { id: 'chk-200g', label: '200 g (large breast)', unit: 'g', dimension: 'mass', quantity: 200, equivalentBaseAmount: 200, equivalentBaseUnit: 'g' },
      { id: 'chk-piece', label: '1 breast piece (140g)', unit: 'piece', dimension: 'count', quantity: 1, equivalentBaseAmount: 140, equivalentBaseUnit: 'g' },
      { id: 'chk-serving', label: '1 serving (100g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' }
    ],
    icon: 'set_meal',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-salmon-atlantic',
    name: 'Atlantic Salmon Fillet',
    category: 'Fish & Seafood',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g pan-seared'
    },
    nutrition: {
      calories: 206,
      protein: 22.0,
      carbs: 0,
      fat: 13.0,
      sodium: 60,
      micronutrients: DEMO_SALMON_BOWL_MICRONUTRIENTS
    },
    portionOptions: [
      { id: 'sal-100g', label: '100 g', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'sal-150g', label: '150 g fillet', unit: 'g', dimension: 'mass', quantity: 150, equivalentBaseAmount: 150, equivalentBaseUnit: 'g' },
      { id: 'sal-piece', label: '1 whole fillet (170g)', unit: 'piece', dimension: 'count', quantity: 1, equivalentBaseAmount: 170, equivalentBaseUnit: 'g' },
      { id: 'sal-serving', label: '1 serving (100g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' }
    ],
    icon: 'set_meal',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-eggs-large',
    name: 'Cage-Free Whole Egg',
    category: 'Dairy & Eggs',
    source: 'built_in',
    nutritionBasis: {
      amount: 1,
      unit: 'serving',
      servingDescription: '1 large egg (approx. 50g)'
    },
    nutrition: {
      calories: 72,
      protein: 6.3,
      carbs: 0.4,
      fat: 4.9,
      sodium: 71
    },
    portionOptions: [
      { id: 'egg-1pc', label: '1 egg (approx 50g)', unit: 'piece', dimension: 'count', quantity: 1, equivalentBaseAmount: 50, equivalentBaseUnit: 'g' },
      { id: 'egg-2pc', label: '2 eggs (approx 100g)', unit: 'piece', dimension: 'count', quantity: 2, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'egg-3pc', label: '3 eggs (approx 150g)', unit: 'piece', dimension: 'count', quantity: 3, equivalentBaseAmount: 150, equivalentBaseUnit: 'g' },
      { id: 'egg-serving', label: '1 serving (50g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 50, equivalentBaseUnit: 'g' }
    ],
    icon: 'egg_alt',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-tofu-firm',
    name: 'Organic Firm Tofu',
    category: 'Plant-based Protein',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g pressed tofu'
    },
    nutrition: {
      calories: 144,
      protein: 15.5,
      carbs: 2.8,
      fat: 8.5,
      fiber: 2.3,
      sodium: 14
    },
    portionOptions: [
      { id: 'tofu-100g', label: '100 g', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'tofu-piece', label: '1 block slice (85g)', unit: 'slice', dimension: 'count', quantity: 1, equivalentBaseAmount: 85, equivalentBaseUnit: 'g' },
      { id: 'tofu-serving', label: '1 serving (100g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' }
    ],
    icon: 'restaurant',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-lean-beef',
    name: 'Lean Ground Beef 93/7',
    category: 'Poultry & Meat',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g cooked'
    },
    nutrition: {
      calories: 172,
      protein: 26.0,
      carbs: 0,
      fat: 7.6,
      sodium: 66
    },
    portionOptions: [
      { id: 'beef-100g', label: '100 g', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'beef-150g', label: '150 g patty', unit: 'g', dimension: 'mass', quantity: 150, equivalentBaseAmount: 150, equivalentBaseUnit: 'g' },
      { id: 'beef-serving', label: '1 serving (112g / 4 oz)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 112, equivalentBaseUnit: 'g' }
    ],
    icon: 'kebab_dining',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-canned-tuna',
    name: 'Chunk Light Tuna in Water',
    category: 'Fish & Seafood',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g drained'
    },
    nutrition: {
      calories: 108,
      protein: 25.0,
      carbs: 0,
      fat: 1.0,
      sodium: 300
    },
    portionOptions: [
      { id: 'tuna-100g', label: '100 g', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'tuna-can', label: '1 drained can (120g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 120, equivalentBaseUnit: 'g' }
    ],
    icon: 'set_meal',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ==========================================
  // DAIRY & LIQUIDS
  // ==========================================
  {
    id: 'food-greek-yogurt',
    name: 'Plain Non-Fat Greek Yogurt',
    category: 'Dairy & Eggs',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g plain non-fat'
    },
    nutrition: {
      calories: 59,
      protein: 10.0,
      carbs: 3.6,
      fat: 0.4,
      sugar: 3.2,
      sodium: 36,
      micronutrients: DEMO_GREEK_YOGURT_MICRONUTRIENTS
    },
    portionOptions: [
      { id: 'yog-100g', label: '100 g', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'yog-cup', label: '1 cup / tub (170g)', unit: 'cup', dimension: 'volume', quantity: 1, equivalentBaseAmount: 170, equivalentBaseUnit: 'g' },
      { id: 'yog-bowl', label: '1 bowl (200g)', unit: 'bowl', dimension: 'count', quantity: 1, equivalentBaseAmount: 200, equivalentBaseUnit: 'g' },
      { id: 'yog-serving', label: '1 serving (170g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 170, equivalentBaseUnit: 'g' }
    ],
    icon: 'icecream',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-whole-milk',
    name: 'Fresh Whole Milk',
    brand: 'NutriAI Dairy',
    category: 'Dairy & Eggs',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'ml',
      servingDescription: 'per 100 ml fresh whole milk'
    },
    nutrition: {
      calories: 62,
      protein: 3.2,
      carbs: 4.8,
      fat: 3.3,
      sugar: 4.8,
      sodium: 44
    },
    portionOptions: [
      { id: 'milk-100ml', label: '100 ml', unit: 'ml', dimension: 'volume', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'ml' },
      { id: 'milk-250ml', label: '250 ml (1 glass)', unit: 'ml', dimension: 'volume', quantity: 250, equivalentBaseAmount: 250, equivalentBaseUnit: 'ml' },
      { id: 'milk-cup', label: '1 cup (240ml)', unit: 'cup', dimension: 'volume', quantity: 1, equivalentBaseAmount: 240, equivalentBaseUnit: 'ml' },
      { id: 'milk-serving', label: '1 serving (250ml)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 250, equivalentBaseUnit: 'ml' }
    ],
    densityGramsPerMl: 1.03, // 1 ml milk = 1.03 g
    icon: 'water_bottle',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-whey-protein',
    name: '100% Whey Isolate Protein Powder',
    brand: 'Optimum Nutrition',
    category: 'Supplements',
    source: 'built_in',
    nutritionBasis: {
      amount: 30,
      unit: 'g',
      servingDescription: '1 standard scoop (30g)'
    },
    nutrition: {
      calories: 120,
      protein: 25.0,
      carbs: 2.0,
      fat: 1.0,
      sodium: 50
    },
    portionOptions: [
      { id: 'whey-1scoop', label: '1 scoop (30g)', unit: 'scoop', dimension: 'count', quantity: 1, equivalentBaseAmount: 30, equivalentBaseUnit: 'g' },
      { id: 'whey-2scoop', label: '2 scoops (60g)', unit: 'scoop', dimension: 'count', quantity: 2, equivalentBaseAmount: 60, equivalentBaseUnit: 'g' },
      { id: 'whey-30g', label: '30 g', unit: 'g', dimension: 'mass', quantity: 30, equivalentBaseAmount: 30, equivalentBaseUnit: 'g' },
      { id: 'whey-serving', label: '1 serving (30g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 30, equivalentBaseUnit: 'g' }
    ],
    icon: 'fitness_center',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },

  // ==========================================
  // HEALTHY FATS, FRUITS & VEGGIES
  // ==========================================
  {
    id: 'food-avocado',
    name: 'Fresh Haas Avocado',
    category: 'Healthy Fats & Nuts',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g edible portion'
    },
    nutrition: {
      calories: 160,
      protein: 2.0,
      carbs: 8.5,
      fat: 14.7,
      fiber: 6.7,
      sodium: 7
    },
    portionOptions: [
      { id: 'avo-50g', label: '50 g (1/4 avocado)', unit: 'g', dimension: 'mass', quantity: 50, equivalentBaseAmount: 50, equivalentBaseUnit: 'g' },
      { id: 'avo-100g', label: '100 g (1/2 avocado)', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'avo-piece', label: '1 whole avocado (200g)', unit: 'piece', dimension: 'count', quantity: 1, equivalentBaseAmount: 200, equivalentBaseUnit: 'g' },
      { id: 'avo-slice', label: '1 slice (25g)', unit: 'slice', dimension: 'count', quantity: 1, equivalentBaseAmount: 25, equivalentBaseUnit: 'g' },
      { id: 'avo-serving', label: '1 serving (50g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 50, equivalentBaseUnit: 'g' }
    ],
    icon: 'emoji_nature',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-extra-virgin-olive-oil',
    name: 'Extra Virgin Olive Oil',
    brand: 'Mediterranean Gold',
    category: 'Healthy Fats & Nuts',
    source: 'built_in',
    nutritionBasis: {
      amount: 15,
      unit: 'ml',
      servingDescription: '1 tablespoon (15 ml)'
    },
    nutrition: {
      calories: 120,
      protein: 0,
      carbs: 0,
      fat: 14.0,
      sodium: 0
    },
    portionOptions: [
      { id: 'oil-tbsp', label: '1 tablespoon (15ml)', unit: 'tbsp', dimension: 'volume', quantity: 1, equivalentBaseAmount: 15, equivalentBaseUnit: 'ml' },
      { id: 'oil-tsp', label: '1 teaspoon (5ml)', unit: 'tsp', dimension: 'volume', quantity: 1, equivalentBaseAmount: 5, equivalentBaseUnit: 'ml' },
      { id: 'oil-15ml', label: '15 ml', unit: 'ml', dimension: 'volume', quantity: 15, equivalentBaseAmount: 15, equivalentBaseUnit: 'ml' },
      { id: 'oil-serving', label: '1 serving (1 tbsp)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 15, equivalentBaseUnit: 'ml' }
    ],
    densityGramsPerMl: 0.92,
    icon: 'water_drop',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-banana-cavendish',
    name: 'Fresh Cavendish Banana',
    category: 'Fruits & Berries',
    source: 'built_in',
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g edible peeled fruit'
    },
    nutrition: {
      calories: 89,
      protein: 1.1,
      carbs: 22.8,
      fat: 0.3,
      fiber: 2.6,
      sugar: 12.2,
      sodium: 1
    },
    portionOptions: [
      { id: 'ban-100g', label: '100 g', unit: 'g', dimension: 'mass', quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g' },
      { id: 'ban-piece', label: '1 medium banana (118g)', unit: 'piece', dimension: 'count', quantity: 1, equivalentBaseAmount: 118, equivalentBaseUnit: 'g' },
      { id: 'ban-slice', label: '1 thick slice (15g)', unit: 'slice', dimension: 'count', quantity: 1, equivalentBaseAmount: 15, equivalentBaseUnit: 'g' },
      { id: 'ban-serving', label: '1 serving (118g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 118, equivalentBaseUnit: 'g' }
    ],
    icon: 'nutrition',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'food-almonds-raw',
    name: 'Raw California Almonds',
    category: 'Healthy Fats & Nuts',
    source: 'built_in',
    nutritionBasis: {
      amount: 28,
      unit: 'g',
      servingDescription: '1 handful (approx. 23 kernels / 28g)'
    },
    nutrition: {
      calories: 164,
      protein: 6.0,
      carbs: 6.1,
      fat: 14.2,
      fiber: 3.5,
      sugar: 1.2,
      sodium: 1
    },
    portionOptions: [
      { id: 'alm-28g', label: '28 g (1 oz / handful)', unit: 'g', dimension: 'mass', quantity: 28, equivalentBaseAmount: 28, equivalentBaseUnit: 'g' },
      { id: 'alm-50g', label: '50 g', unit: 'g', dimension: 'mass', quantity: 50, equivalentBaseAmount: 50, equivalentBaseUnit: 'g' },
      { id: 'alm-serving', label: '1 serving (28g)', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 28, equivalentBaseUnit: 'g' }
    ],
    icon: 'cookie',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
];

/**
 * Helper to find a built-in food definition by ID or Barcode.
 */
export function findBuiltInFood(idOrBarcode: string): FoodDefinition | undefined {
  const query = idOrBarcode.trim().toLowerCase();
  return BUILT_IN_FOOD_DEFINITIONS.find(f => 
    f.id.toLowerCase() === query || 
    (f.barcode && f.barcode.toLowerCase() === query)
  );
}
