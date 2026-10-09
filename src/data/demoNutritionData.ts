/**
 * Demo Micronutrient Fixtures
 * 
 * Rules:
 * 1. Used strictly for UI demonstration & prototype evaluation.
 * 2. Every demo nutrient value explicitly has source: 'demo'.
 * 3. Never randomized at runtime.
 * 4. Easily decoupled, removed, or disabled when real API / backend is connected.
 * 5. Must NOT be aggregated into user historical insights or diary tracking.
 */

import type { MicronutrientProfile } from '../types/index.ts';

export const DEMO_SALMON_BOWL_MICRONUTRIENTS: MicronutrientProfile = {
  servingBasis: {
    amount: 1,
    unit: 'bowl',
    description: '1 prepared Mediterranean Salmon Bowl (approx. 380g)'
  },
  vitamins: [
    { key: 'vitamin_d', name: 'Vitamin D', shortName: 'Vit D', amount: 16.5, unit: 'mcg', dailyValuePercent: 83, source: 'demo', confidence: 0.95 },
    { key: 'vitamin_b12', name: 'Vitamin B12', shortName: 'Vit B12', amount: 4.8, unit: 'mcg', dailyValuePercent: 200, source: 'demo', confidence: 0.98 },
    { key: 'vitamin_b6', name: 'Vitamin B6', shortName: 'Vit B6', amount: 0.9, unit: 'mg', dailyValuePercent: 53, source: 'demo', confidence: 0.92 },
    { key: 'vitamin_b3', name: 'Vitamin B3 (Niacin)', shortName: 'B3 Niacin', amount: 11.2, unit: 'mg_NE', dailyValuePercent: 70, source: 'demo', confidence: 0.94 },
    { key: 'vitamin_a', name: 'Vitamin A', shortName: 'Vit A', amount: 220, unit: 'mcg_RAE', dailyValuePercent: 24, source: 'demo', confidence: 0.88 },
    { key: 'vitamin_c', name: 'Vitamin C', shortName: 'Vit C', amount: 28, unit: 'mg', dailyValuePercent: 31, source: 'demo', confidence: 0.90 },
    { key: 'vitamin_e', name: 'Vitamin E', shortName: 'Vit E', amount: 3.5, unit: 'mg_alpha_TE', dailyValuePercent: 23, source: 'demo', confidence: 0.86 },
    { key: 'choline', name: 'Choline', shortName: 'Choline', amount: 125, unit: 'mg', dailyValuePercent: 23, source: 'demo', confidence: 0.85 }
  ],
  minerals: [
    { key: 'selenium', name: 'Selenium', shortName: 'Selenium', amount: 48, unit: 'mcg', dailyValuePercent: 87, source: 'demo', confidence: 0.96 },
    { key: 'potassium', name: 'Potassium', shortName: 'Potassium', amount: 820, unit: 'mg', dailyValuePercent: 17, source: 'demo', confidence: 0.91 },
    { key: 'magnesium', name: 'Magnesium', shortName: 'Magnesium', amount: 115, unit: 'mg', dailyValuePercent: 27, source: 'demo', confidence: 0.89 },
    { key: 'phosphorus', name: 'Phosphorus', shortName: 'Phosphorus', amount: 380, unit: 'mg', dailyValuePercent: 30, source: 'demo', confidence: 0.93 },
    { key: 'iron', name: 'Iron', shortName: 'Iron', amount: 2.8, unit: 'mg', dailyValuePercent: 16, source: 'demo', confidence: 0.87 },
    { key: 'zinc', name: 'Zinc', shortName: 'Zinc', amount: 1.8, unit: 'mg', dailyValuePercent: 16, source: 'demo', confidence: 0.88 },
    { key: 'sodium', name: 'Sodium', shortName: 'Sodium', amount: 480, unit: 'mg', dailyValuePercent: 21, source: 'demo', confidence: 0.92 }
  ],
  otherNutrients: [
    { key: 'omega_3', name: 'Omega-3 Fatty Acids', shortName: 'Omega-3', amount: 2.2, unit: 'g', dailyValuePercent: null, source: 'demo', confidence: 0.95 },
    { key: 'fiber', name: 'Dietary Fiber', shortName: 'Fiber', amount: 6.5, unit: 'g', dailyValuePercent: 23, source: 'demo', confidence: 0.90 },
    { key: 'cholesterol', name: 'Cholesterol', shortName: 'Cholesterol', amount: 75, unit: 'mg', dailyValuePercent: 25, source: 'demo', confidence: 0.94 },
    { key: 'saturated_fat', name: 'Saturated Fat', shortName: 'Sat. Fat', amount: 3.2, unit: 'g', dailyValuePercent: 16, source: 'demo', confidence: 0.91 },
    { key: 'total_sugars', name: 'Total Sugars', shortName: 'Total Sugars', amount: 3.0, unit: 'g', dailyValuePercent: null, source: 'demo', confidence: 0.88 }
  ]
};

export const DEMO_CHICKEN_BREAST_MICRONUTRIENTS: MicronutrientProfile = {
  servingBasis: {
    amount: 1,
    unit: 'breast (100g cooked)',
    description: '100g cooked lean skinless chicken breast'
  },
  vitamins: [
    { key: 'vitamin_b3', name: 'Vitamin B3 (Niacin)', shortName: 'B3 Niacin', amount: 14.8, unit: 'mg_NE', dailyValuePercent: 93, source: 'demo', confidence: 0.98 },
    { key: 'vitamin_b6', name: 'Vitamin B6', shortName: 'Vit B6', amount: 0.9, unit: 'mg', dailyValuePercent: 53, source: 'demo', confidence: 0.96 },
    { key: 'vitamin_b12', name: 'Vitamin B12', shortName: 'Vit B12', amount: 0.35, unit: 'mcg', dailyValuePercent: 15, source: 'demo', confidence: 0.92 },
    { key: 'vitamin_b5', name: 'Vitamin B5 (Pantothenic Acid)', shortName: 'B5 Pantothenic', amount: 1.1, unit: 'mg', dailyValuePercent: 22, source: 'demo', confidence: 0.90 },
    { key: 'choline', name: 'Choline', shortName: 'Choline', amount: 85, unit: 'mg', dailyValuePercent: 15, source: 'demo', confidence: 0.91 }
  ],
  minerals: [
    { key: 'selenium', name: 'Selenium', shortName: 'Selenium', amount: 28.5, unit: 'mcg', dailyValuePercent: 52, source: 'demo', confidence: 0.97 },
    { key: 'phosphorus', name: 'Phosphorus', shortName: 'Phosphorus', amount: 240, unit: 'mg', dailyValuePercent: 19, source: 'demo', confidence: 0.95 },
    { key: 'zinc', name: 'Zinc', shortName: 'Zinc', amount: 1.1, unit: 'mg', dailyValuePercent: 10, source: 'demo', confidence: 0.90 },
    { key: 'potassium', name: 'Potassium', shortName: 'Potassium', amount: 330, unit: 'mg', dailyValuePercent: 7, source: 'demo', confidence: 0.89 },
    { key: 'magnesium', name: 'Magnesium', shortName: 'Magnesium', amount: 32, unit: 'mg', dailyValuePercent: 8, source: 'demo', confidence: 0.88 },
    { key: 'iron', name: 'Iron', shortName: 'Iron', amount: 1.0, unit: 'mg', dailyValuePercent: 6, source: 'demo', confidence: 0.89 },
    { key: 'sodium', name: 'Sodium', shortName: 'Sodium', amount: 75, unit: 'mg', dailyValuePercent: 3, source: 'demo', confidence: 0.95 }
  ],
  otherNutrients: [
    { key: 'cholesterol', name: 'Cholesterol', shortName: 'Cholesterol', amount: 85, unit: 'mg', dailyValuePercent: 28, source: 'demo', confidence: 0.96 },
    { key: 'saturated_fat', name: 'Saturated Fat', shortName: 'Sat. Fat', amount: 1.0, unit: 'g', dailyValuePercent: 5, source: 'demo', confidence: 0.94 }
  ]
};

export const DEMO_GREEK_YOGURT_MICRONUTRIENTS: MicronutrientProfile = {
  servingBasis: {
    amount: 1,
    unit: 'cup (170g)',
    description: '170g non-fat plain Greek yogurt'
  },
  vitamins: [
    { key: 'vitamin_b12', name: 'Vitamin B12', shortName: 'Vit B12', amount: 1.3, unit: 'mcg', dailyValuePercent: 54, source: 'demo', confidence: 0.97 },
    { key: 'vitamin_b2', name: 'Vitamin B2 (Riboflavin)', shortName: 'B2 Riboflavin', amount: 0.45, unit: 'mg', dailyValuePercent: 35, source: 'demo', confidence: 0.95 },
    { key: 'vitamin_b5', name: 'Vitamin B5 (Pantothenic Acid)', shortName: 'B5 Pantothenic', amount: 0.7, unit: 'mg', dailyValuePercent: 14, source: 'demo', confidence: 0.90 }
  ],
  minerals: [
    { key: 'calcium', name: 'Calcium', shortName: 'Calcium', amount: 200, unit: 'mg', dailyValuePercent: 15, source: 'demo', confidence: 0.98 },
    { key: 'phosphorus', name: 'Phosphorus', shortName: 'Phosphorus', amount: 220, unit: 'mg', dailyValuePercent: 18, source: 'demo', confidence: 0.96 },
    { key: 'selenium', name: 'Selenium', shortName: 'Selenium', amount: 16.5, unit: 'mcg', dailyValuePercent: 30, source: 'demo', confidence: 0.93 },
    { key: 'potassium', name: 'Potassium', shortName: 'Potassium', amount: 240, unit: 'mg', dailyValuePercent: 5, source: 'demo', confidence: 0.91 },
    { key: 'zinc', name: 'Zinc', shortName: 'Zinc', amount: 1.0, unit: 'mg', dailyValuePercent: 9, source: 'demo', confidence: 0.90 },
    { key: 'sodium', name: 'Sodium', shortName: 'Sodium', amount: 65, unit: 'mg', dailyValuePercent: 3, source: 'demo', confidence: 0.95 }
  ],
  otherNutrients: [
    { key: 'total_sugars', name: 'Total Sugars', shortName: 'Total Sugars', amount: 6.0, unit: 'g', dailyValuePercent: null, source: 'demo', confidence: 0.92 },
    { key: 'cholesterol', name: 'Cholesterol', shortName: 'Cholesterol', amount: 10, unit: 'mg', dailyValuePercent: 3, source: 'demo', confidence: 0.95 }
  ]
};

export const DEMO_MICRONUTRIENT_PROFILES = {
  salmonBowl: DEMO_SALMON_BOWL_MICRONUTRIENTS,
  chickenBreast: DEMO_CHICKEN_BREAST_MICRONUTRIENTS,
  greekYogurt: DEMO_GREEK_YOGURT_MICRONUTRIENTS
};

