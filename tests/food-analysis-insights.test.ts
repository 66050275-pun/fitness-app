import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../src/data/foodAnalysisNutrients.json' with { type: 'json' };
import { getAllNutrientReferences } from '../src/data/nutrientReferenceValues.ts';
import { normalizeFoodAnalysisResult } from '../src/services/aiFoodAnalysisAdapter.ts';
import { calculateDailyNutritionTotals, calculateGoalAdherence, calculateWorkoutTotals } from '../src/utils/insightCalculations.ts';
import { aggregateDailyMicronutrients, calculateMicronutrientTrends } from '../src/utils/nutrientCalculations.ts';
import { generatePhasicInsightMessages } from '../src/utils/phasicInsightCalculations.ts';
import { createScanReview, changeCookingFat, reviewedNutrition, buildScanMealAnalysis } from '../src/services/foodScanService.ts';
import { adaptFoodAnalysisResultToScannedFood } from '../src/services/aiFoodAnalysisAdapter.ts';
import { setLanguage } from '../src/i18n/index.ts';
import type { AppState, MealItem, NutritionGoals } from '../src/types/index.ts';

const date = '2026-10-13';
const response = { foodName: 'Meal', servingDescription: 'One plate', calories: 612, protein: 30, carbs: 60, fat: 28,
  cookingFat: { estimatedGrams: 10, rangeMinGrams: 6, rangeMaxGrams: 14 },
  micronutrients: { vitamins: [{ key: 'vitaminC', name: 'Vitamin C', amount: 20, unit: 'mg', confidence: 0.5, note: 'Vegetable portion estimate' }] } };
const goals: NutritionGoals = { calorieTarget: 2200, proteinTarget: 160, carbsTarget: 280, fatTarget: 50, waterTarget: 2400 };
function meal(patch: Partial<MealItem> = {}): MealItem {
  return { id: crypto.randomUUID(), date, time: '12:00', mealType: 'lunch', foodName: 'Meal',
    portion: { foodId: 'meal', quantity: 1, unit: 'serving', baseAmount: 1, baseUnit: 'serving', servingDescription: 'One plate' },
    nutritionSnapshot: { calories: 612, protein: 30, carbs: 60, fat: 28 }, foodSource: 'ai_estimate', loggedAt: `${date}T12:00:00`,
    name: 'Meal', category: 'Lunch', calories: 612, protein: 30, carbs: 60, fat: 28, icon: 'restaurant', ...patch };
}
function state(meals: MealItem[] = [], program: 'standard' | 'mini_cut' | 'lean_bulk' = 'mini_cut') {
  return { meals, nutritionGoals: goals, phasicTools: { proteinMealCount: 4, phaseCycle: null },
    userProfile: { dietProgram: program, currentWeightKg: 70 }, weightHistory: [], workoutHistory: [] } as unknown as AppState;
}

test('AI contract covers all 40 existing app nutrients with matching category and units', () => {
  const expected = getAllNutrientReferences().map(n => [n.key, n.defaultUnit]).sort();
  assert.deepEqual(Object.values(catalog).flat().map(n => [n.key, n.unit]).sort(), expected);
  assert.deepEqual(Object.values(catalog).map(list => list.length), [14, 15, 11]);
  for (const [category, list] of Object.entries(catalog)) {
    const expectedCategory = category === 'vitamins' ? 'vitamin' : category === 'minerals' ? 'mineral' : 'other';
    for (const nutrient of list) assert.equal(getAllNutrientReferences().find(n => n.key === nutrient.key)?.category, expectedCategory);
  }
});

test('partial AI output becomes 40 rows; absent amounts remain null, notes and DV survive serialization', () => {
  const result = normalizeFoodAnalysisResult(response);
  const profile = JSON.parse(JSON.stringify(result.micronutrients));
  const rows = [...profile.vitamins, ...profile.minerals, ...profile.otherNutrients];
  assert.equal(rows.length, 40);
  assert.equal(rows.filter(n => n.amount !== null).length, 1);
  const vitamin = rows.find(n => n.key === 'vitamin_c');
  assert.equal(vitamin.amount, 20);
  assert.equal(vitamin.dailyValuePercent, 22.2);
  assert.equal(vitamin.note, 'Vegetable portion estimate');
  assert.equal(vitamin.source, 'ai_estimate');
  assert.equal(rows.find(n => n.key === 'calcium').amount, null);
  assert.equal(rows.find(n => n.key === 'calcium').confidence, null);
});

test('duplicate nutrients and chemically incompatible IU conversions are rejected', () => {
  const c = response.micronutrients.vitamins[0];
  assert.throws(() => normalizeFoodAnalysisResult({ ...response, micronutrients: { vitamins: [c, { ...c, key: 'vitamin_c' }] } }));
  assert.throws(() => normalizeFoodAnalysisResult({ ...response, micronutrients: { vitamins: [{ key: 'vitamin_a', name: 'A', amount: 10, unit: 'IU' }] } }));
});

test('all-null profiles add no micronutrient coverage; measured zero remains recorded data', () => {
  const profile = normalizeFoodAnalysisResult({ ...response, micronutrients: undefined }).micronutrients;
  const unknown = meal({ micronutrients: profile, nutritionSnapshot: { ...meal().nutritionSnapshot, micronutrients: profile } });
  assert.equal(aggregateDailyMicronutrients([unknown], { includeDemo: false }).coveragePercentage, 0);
  assert.equal(calculateMicronutrientTrends([unknown], [date]).overallCoveragePercent, 0);
  const zero = normalizeFoodAnalysisResult({ ...response, micronutrients: { vitamins: [{ ...response.micronutrients.vitamins[0], amount: 0 }] } }).micronutrients;
  assert.equal(aggregateDailyMicronutrients([meal({ micronutrients: zero })]).coveragePercentage, 100);
});

test('Insights reads portion snapshots, canonical keys and only recorded nutrient dates', () => {
  const profile = normalizeFoodAnalysisResult(response).micronutrients;
  const saved = meal({ micronutrients: undefined, nutritionSnapshot: { ...meal().nutritionSnapshot, micronutrients: profile } });
  const vitamin = calculateMicronutrientTrends([saved], ['2026-10-12', date]).nutrients.find(n => n.key === 'vitamin_c')!;
  assert.equal(vitamin.avgDailyIntake, 20);
  assert.equal(vitamin.daysEvaluated, 1);
  assert.equal(vitamin.status, 'insufficient_data');
  assert.equal(vitamin.totalMealsReporting, 1);
});

test('calorie totals use reviewed snapshots and preserve unknowns and decimal macros', () => {
  const logged = meal({ calories: 999, protein: 999, nutritionSnapshot: { calories: 639, protein: 30.15, carbs: null, fat: 31 } });
  const [total] = calculateDailyNutritionTotals([logged], [date]);
  assert.equal(total.calories, 639);
  assert.equal(total.protein, 30.15);
  assert.equal(total.carbs, 0);
  assert.equal(total.unknownCounts.carbs, 1);
});

test('adherence uses saved 160g protein, day-specific refeed calories and exact water milliliters', () => {
  const logged = meal({ nutritionSnapshot: { calories: 2600, protein: 150, carbs: 300, fat: 40 } });
  const daily = calculateDailyNutritionTotals([logged], [date], () => ({ ...goals, calorieTarget: 2600 }));
  const adherence = calculateGoalAdherence(daily, 2200, 145, { [date]: 9 }, 8, calculateWorkoutTotals([], [date]));
  assert.equal(adherence.proteinGoalMetDays, 0);
  assert.equal(adherence.calorieTargetAdherenceDays, 1);
  assert.equal(adherence.hydrationGoalMetDays, 0);
});

test('cooking-fat changes and manual extras enter Insights totals exactly once', () => {
  const food = adaptFoodAnalysisResultToScannedFood(response, 'scan-1');
  const original = createScanReview(food);
  const review = { ...original, ...changeCookingFat(original, '13') };
  const nutrition = reviewedNutrition(review);
  const scanned = meal({ nutritionSnapshot: nutrition, scanAnalysis: buildScanMealAnalysis(food, review) });
  const extra = meal({ calories: 90, fat: 10, protein: 0, carbs: 0, hiddenFatEstimate: { oil: 1, coconut: 0, dressing: 0 }, nutritionSnapshot: { calories: 90, protein: 0, carbs: 0, fat: 10 } });
  const data = state([scanned, extra]);
  const [total] = calculateDailyNutritionTotals(data.meals, [date]);
  assert.equal(total.calories, 729);
  assert.equal(total.fat, 41);
  const hidden = generatePhasicInsightMessages(data, [date], date).find(m => m.toolId === 'hidden-fat-scanner')!;
  assert.match(hidden.text, /13 g included/);
  assert.match(hidden.text, /Manual extra fat: 10 g/);
});

test('all six tools produce linked insights only for special programs, with honest no-data and refeed states', () => {
  const data = state();
  data.phasicTools.phaseCycle = { program: 'mini_cut', startDate: '2026-10-07', lengthWeeks: 4, refeedExtraCalories: 400 };
  const messages = generatePhasicInsightMessages(data, [date], date);
  assert.equal(messages.length, 6);
  assert.equal(new Set(messages.map(m => m.toolId)).size, 6);
  assert.match(messages.find(m => m.toolId === 'phase-cycle')!.text, /1 scheduled refeed/);
  assert.match(messages.find(m => m.toolId === 'fat-gauge')!.text, /42 g/);
  assert.match(messages.find(m => m.toolId === 'recomp-matrix')!.text, /Log weight/);
  assert.equal(generatePhasicInsightMessages(state([], 'lean_bulk'), [date], date).length, 6);
  assert.equal(generatePhasicInsightMessages(state([], 'standard'), [date], date).length, 0);
  setLanguage('th');
  const thai = generatePhasicInsightMessages(data, [date], date);
  assert.match(thai[0].text, /ผลสแกน/);
  setLanguage('en');
});
