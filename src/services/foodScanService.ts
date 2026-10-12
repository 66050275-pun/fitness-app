import type { FoodScanReview, FoodScanReviewField, NutritionValues, ScanMealAnalysis, ScannedFood } from '../types/index.ts';
import { analysisNumber, analysisTextList, normalizeCookingFat } from './aiFoodAnalysisAdapter.ts';

export const SCAN_REVIEW_FIELDS: readonly FoodScanReviewField[] = ['name', 'servingDescription', 'calories', 'protein', 'carbs', 'fat', 'cookingFatGrams'];

export function createScanReview(food: ScannedFood): FoodScanReview {
  return { name: food.name, servingDescription: food.subtitle, calories: inputNumber(food.calories),
    protein: inputNumber(food.protein), carbs: inputNumber(food.carbs), fat: inputNumber(food.fat),
    cookingFatGrams: inputNumber(food.cookingFat?.estimatedGrams ?? null), cookingFatInput: inputNumber(food.cookingFat?.estimatedGrams ?? null), mealType: food.suggestedMealType };
}

export function inputNumber(value: number | null): string {
  if (value === null) return '';
  const text = String(value);
  return text.includes('e') ? value.toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 21 }) : text;
}

export function readReviewNumber(value: string, maximum = 2000): number | null {
  if (!value.trim()) return null;
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) throw new Error('Enter valid, non-negative nutrition values.');
  return analysisNumber(Number(value), maximum);
}

export function reviewedNutrition(review: FoodScanReview): NutritionValues {
  return { calories: readReviewNumber(review.calories, 20_000), protein: readReviewNumber(review.protein),
    carbs: readReviewNumber(review.carbs), fat: readReviewNumber(review.fat) };
}

/** Updates current totals by the DIFFERENCE between cooking-fat estimates, never by adding the whole estimate again. */
export function changeCookingFat(review: FoodScanReview, value: string): Partial<FoodScanReview> {
  const previous = readReviewNumber(review.cookingFatGrams);
  const next = readReviewNumber(value);
  const totalFat = readReviewNumber(review.fat);
  const calories = readReviewNumber(review.calories, 20_000);
  if (previous === null || next === null || totalFat === null) return { cookingFatGrams: value, cookingFatInput: value };
  if (previous > totalFat) throw new Error('Cooking fat must be part of the total fat.');
  const delta = next - previous;
  const fat = Math.round((totalFat + delta) * 100) / 100;
  const energy = calories === null ? null : Math.round((calories + delta * 9) * 100) / 100;
  analysisNumber(fat); analysisNumber(energy, 20_000);
  return { cookingFatGrams: value, cookingFatInput: value, fat: inputNumber(fat), calories: inputNumber(energy) };
}

export function resolveCookingFatDraft(review: FoodScanReview): FoodScanReview {
  return review.cookingFatInput === review.cookingFatGrams ? review : { ...review, ...changeCookingFat(review, review.cookingFatInput) };
}

export function createManualScannedFood(): ScannedFood {
  return { scanId: crypto.randomUUID(), source: 'manual', analyzedAt: new Date().toISOString(), name: '', subtitle: '',
    calories: null, protein: null, carbs: null, fat: null, confidence: null, glycemicIndex: null,
    ingredients: [], suggestedMealType: 'lunch', servingWeightGrams: null, cookingFat: null, warnings: [] };
}

export function validateScanReview(review: FoodScanReview): string | null {
  if (!review.name.trim() || !review.servingDescription.trim()) return 'Add a food name and serving description.';
  try {
    review = resolveCookingFatDraft(review);
    const values = reviewedNutrition(review);
    if (values.calories === null) return 'Enter the calories before saving this meal.';
    const cooking = readReviewNumber(review.cookingFatGrams);
    if (cooking !== null && (values.fat === null || cooking > values.fat)) return 'Cooking fat must be part of the total fat.';
    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(review.mealType)) return 'Choose a meal interval.';
  } catch { return 'Enter valid, non-negative nutrition values.'; }
  return null;
}

export function buildScanMealAnalysis(food: ScannedFood, review: FoodScanReview): ScanMealAnalysis {
  const original = createScanReview(food);
  const editedFields = SCAN_REVIEW_FIELDS.filter(field => {
    if (field === 'name' || field === 'servingDescription') return review[field].trim() !== original[field].trim();
    return readReviewNumber(review[field], field === 'calories' ? 20_000 : 2000)
      !== readReviewNumber(original[field], field === 'calories' ? 20_000 : 2000);
  });
  return { version: 1, scanId: food.scanId, source: food.source, analyzedAt: food.analyzedAt,
    originalFoodName: food.name, originalServingDescription: food.subtitle, originalServingWeightGrams: food.servingWeightGrams,
    originalNutrition: { calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat },
    originalCookingFat: food.cookingFat, reviewedCookingFatGrams: readReviewNumber(review.cookingFatGrams),
    confidence: food.confidence, warnings: [...food.warnings], editedFields };
}

/** Metadata is optional for old diaries; malformed metadata does not discard the meal. */
export function sanitizeScanMealAnalysis(value: unknown, recordedFat: number | null): ScanMealAnalysis | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  try {
    if (raw.version !== 1 || typeof raw.scanId !== 'string' || !/^[\w-]{1,100}$/.test(raw.scanId)
      || !['ai_estimate', 'manual', 'demo'].includes(String(raw.source))
      || typeof raw.analyzedAt !== 'string' || !Number.isFinite(Date.parse(raw.analyzedAt))
      || typeof raw.originalFoodName !== 'string' || typeof raw.originalServingDescription !== 'string') return undefined;
    if (!raw.originalNutrition || typeof raw.originalNutrition !== 'object' || Array.isArray(raw.originalNutrition)) return undefined;
    const original = raw.originalNutrition as Record<string, unknown>;
    const originalNutrition = { calories: analysisNumber(original.calories, 20_000), protein: analysisNumber(original.protein),
      carbs: analysisNumber(original.carbs), fat: analysisNumber(original.fat) };
    const reviewedCookingFatGrams = analysisNumber(raw.reviewedCookingFatGrams);
    if (reviewedCookingFatGrams !== null && (recordedFat === null || reviewedCookingFatGrams > recordedFat)) return undefined;
    return { version: 1, scanId: raw.scanId, source: raw.source as ScannedFood['source'], analyzedAt: raw.analyzedAt,
      originalFoodName: raw.originalFoodName.slice(0, 200), originalServingDescription: raw.originalServingDescription.slice(0, 300),
      originalServingWeightGrams: analysisNumber(raw.originalServingWeightGrams, 10_000),
      originalNutrition, originalCookingFat: normalizeCookingFat(raw.originalCookingFat, originalNutrition.fat),
      reviewedCookingFatGrams, confidence: analysisNumber(raw.confidence, 1), warnings: analysisTextList(raw.warnings),
      editedFields: Array.isArray(raw.editedFields) ? SCAN_REVIEW_FIELDS.filter(field => (raw.editedFields as unknown[]).includes(field)) : [] };
  } catch { return undefined; }
}
