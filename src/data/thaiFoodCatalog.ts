/**
 * Offline Thai dishes using the figures supplied for this feature.
 * These are recipe estimates, not verified Thai FCD or Open Food Facts records.
 * See docs/THAI_FOOD_SOURCES.md for provenance and reuse information.
 */
import type { FoodDefinition, NutritionValues } from '../types/index.ts';

const CATALOG_DATE = '2026-10-10T00:00:00.000Z';

interface ThaiDishInput {
  id: string;
  name: string;
  searchAliases: string[];
  category: string;
  nutrition: NutritionValues;
  portions: { id: string; label: string; grams: number }[];
  icon: string;
}

function createDish(input: ThaiDishInput): FoodDefinition {
  return {
    id: input.id,
    name: input.name,
    searchAliases: input.searchAliases,
    category: input.category,
    source: 'built_in',
    calorieSource: 'manual',
    dataProvenance: { provider: 'user_estimate' },
    nutritionBasis: {
      amount: 100,
      unit: 'g',
      servingDescription: 'per 100 g prepared dish'
    },
    nutrition: { ...input.nutrition, calorieSource: 'manual' },
    // The first option is the app's default. Use grams for every size so the
    // portion resolver never confuses two differently sized "1 serving" options.
    portionOptions: [
      ...input.portions.map(portion => ({
        id: portion.id,
        label: portion.label,
        unit: 'g' as const,
        dimension: 'mass' as const,
        quantity: portion.grams,
        equivalentBaseAmount: portion.grams,
        equivalentBaseUnit: 'g' as const
      })),
      {
        id: '100g', label: '100 g', unit: 'g', dimension: 'mass',
        quantity: 100, equivalentBaseAmount: 100, equivalentBaseUnit: 'g'
      }
    ],
    icon: input.icon,
    createdAt: CATALOG_DATE,
    updatedAt: CATALOG_DATE
  };
}

export const THAI_SINGLE_DISH_CATALOG: FoodDefinition[] = [
  createDish({
    id: 'thai_dish_pad_krapow_pork_egg',
    name: 'Pad Krapow Minced Pork with Fried Egg',
    searchAliases: ['ข้าวกะเพราหมูสับไข่ดาว', 'ข้าวผัดกะเพราหมูสับไข่ดาว', 'กะเพรา', 'กระเพรา', 'pad kra pao', 'pad kaprao', 'krapow'],
    category: 'Rice Dishes',
    nutrition: { calories: 185, protein: 6.8, carbs: 21.4, fat: 8.1, fiber: 1.2, sodium: 380 },
    portions: [
      { id: 'regular', label: '1 standard plate (~350 g)', grams: 350 },
      { id: 'large', label: '1 large plate (~450 g)', grams: 450 }
    ],
    icon: 'rice_bowl'
  }),
  createDish({
    id: 'thai_dish_khao_man_gai',
    name: 'Hainanese Chicken Rice',
    searchAliases: ['ข้าวมันไก่ต้ม', 'ข้าวมันไก่', 'khao man gai'],
    category: 'Rice Dishes',
    nutrition: { calories: 168, protein: 6.9, carbs: 23.2, fat: 5.4, fiber: 0.8, sodium: 310 },
    portions: [
      { id: 'regular', label: '1 standard plate (~350 g)', grams: 350 },
      { id: 'large', label: '1 large plate (~450 g)', grams: 450 }
    ],
    icon: 'rice_bowl'
  }),
  createDish({
    id: 'thai_dish_pad_thai_shrimp',
    name: 'Pad Thai with Fresh Shrimp',
    searchAliases: ['ผัดไทยกุ้งสด', 'ผัดไทย', 'padthai'],
    category: 'Noodle Dishes',
    nutrition: { calories: 172, protein: 5.6, carbs: 24.1, fat: 5.9, fiber: 1.8, sodium: 395 },
    portions: [
      { id: 'regular', label: '1 standard plate (~320 g)', grams: 320 },
      { id: 'large', label: '1 large plate (~420 g)', grams: 420 }
    ],
    icon: 'ramen_dining'
  }),
  createDish({
    id: 'thai_dish_khao_kha_mu',
    name: 'Braised Pork Leg on Rice',
    searchAliases: ['ข้าวขาหมู', 'khao kha mu', 'khao kha moo'],
    category: 'Rice Dishes',
    nutrition: { calories: 182, protein: 6.2, carbs: 20.8, fat: 8.2, fiber: 0.9, sodium: 340 },
    portions: [
      { id: 'regular', label: '1 standard plate (~380 g)', grams: 380 }
    ],
    icon: 'rice_bowl'
  }),
  createDish({
    id: 'thai_dish_boat_noodles_beef',
    name: 'Thai Boat Noodles with Beef',
    searchAliases: ['ก๋วยเตี๋ยวเรือเนื้อน้ำตก', 'ก๋วยเตี๋ยวเรือ', 'boat noodles', 'kuay tiew reua'],
    category: 'Noodle Dishes',
    nutrition: { calories: 82, protein: 4.1, carbs: 9.8, fat: 2.9, fiber: 0.7, sodium: 420 },
    portions: [
      { id: 'regular', label: '1 standard bowl (~280 g)', grams: 280 },
      { id: 'small', label: '1 small bowl (~120 g)', grams: 120 }
    ],
    icon: 'ramen_dining'
  }),
  createDish({
    id: 'thai_dish_som_tum_thai',
    name: 'Som Tum Thai',
    searchAliases: ['ส้มตำไทย', 'ส้มตำ', 'som tam', 'som tum', 'papaya salad'],
    category: 'Salads & Sides',
    nutrition: { calories: 68, protein: 2.2, carbs: 11.5, fat: 1.4, fiber: 2.1, sodium: 480 },
    portions: [
      { id: 'regular', label: '1 standard plate (~200 g)', grams: 200 }
    ],
    icon: 'nutrition'
  })
];
