import type { CookingFatAnalysis, FoodAnalysisResult, MicronutrientProfile, NutrientUnit, NutrientValue, ScannedFood } from '../types/index.ts';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid food analysis response.');
  return value as Record<string, unknown>;
}

function optionalProvenance(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > 100) throw new Error('Invalid food analysis response.');
  return value.trim();
}

export function analysisNumber(value: unknown, maximum = 2000): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > maximum)
    throw new Error('Invalid food analysis response.');
  return value;
}

export function analysisTextList(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error('Invalid food analysis response.');
  return value.slice(0, 30).map(item => (item as string).trim().slice(0, 400)).filter(Boolean);
}

export function normalizeCookingFat(value: unknown, totalFat: number | null): CookingFatAnalysis | null {
  if (value === undefined || value === null) return null;
  const raw = record(value);
  const estimatedGrams = analysisNumber(raw.estimatedGrams);
  const rangeMinGrams = analysisNumber(raw.rangeMinGrams);
  const rangeMaxGrams = analysisNumber(raw.rangeMaxGrams);
  if (estimatedGrams !== null && (totalFat === null || estimatedGrams > totalFat)) throw new Error('Invalid food analysis response.');
  if (rangeMinGrams !== null && rangeMaxGrams !== null && rangeMinGrams > rangeMaxGrams) throw new Error('Invalid food analysis response.');
  if (estimatedGrams !== null && ((rangeMinGrams !== null && estimatedGrams < rangeMinGrams)
    || (rangeMaxGrams !== null && estimatedGrams > rangeMaxGrams))) throw new Error('Invalid food analysis response.');
  return { estimatedGrams, rangeMinGrams, rangeMaxGrams, confidence: analysisNumber(raw.confidence, 1),
    sources: analysisTextList(raw.sources), assumptions: analysisTextList(raw.assumptions) };
}

function normalizeMicronutrients(value: unknown): MicronutrientProfile | undefined {
  if (value === null || value === undefined) return undefined;
  const raw = record(value);
  const units: readonly NutrientUnit[] = ['mg', 'mcg', 'g', 'IU', 'mg_NE', 'mcg_DFE', 'mcg_RAE', 'mg_alpha_TE'];
  const nutrients = (list: unknown): NutrientValue[] => {
    if (list === undefined) return [];
    if (!Array.isArray(list)) throw new Error('Invalid food analysis response.');
    return list.slice(0, 100).map(item => {
      const nutrient = record(item);
      if (typeof nutrient.key !== 'string' || typeof nutrient.name !== 'string' || !units.includes(nutrient.unit as NutrientUnit))
        throw new Error('Invalid food analysis response.');
      return { key: nutrient.key.slice(0, 100), name: nutrient.name.slice(0, 200), unit: nutrient.unit as NutrientUnit,
        amount: analysisNumber(nutrient.amount, 1_000_000), source: 'ai_estimate', confidence: analysisNumber(nutrient.confidence, 1) };
    });
  };
  return { vitamins: nutrients(raw.vitamins), minerals: nutrients(raw.minerals), otherNutrients: nutrients(raw.otherNutrients) };
}

/** Validates untrusted backend JSON. Missing nutrients remain unknown, including confidence. */
export function normalizeFoodAnalysisResult(value: unknown): FoodAnalysisResult {
  const raw = record(value);
  if (typeof raw.foodName !== 'string' || !raw.foodName.trim() || typeof raw.servingDescription !== 'string' || !raw.servingDescription.trim())
    throw new Error('Invalid food analysis response.');
  const fat = analysisNumber(raw.fat);
  return { foodName: raw.foodName.trim().slice(0, 200), servingDescription: raw.servingDescription.trim().slice(0, 300),
    servingWeightGrams: analysisNumber(raw.servingWeightGrams, 10_000), calories: analysisNumber(raw.calories, 20_000),
    protein: analysisNumber(raw.protein), carbs: analysisNumber(raw.carbs), fat,
    ingredients: analysisTextList(raw.ingredients), overallConfidence: analysisNumber(raw.overallConfidence, 1),
    cookingFat: normalizeCookingFat(raw.cookingFat, fat), warnings: analysisTextList(raw.warnings),
    micronutrients: normalizeMicronutrients(raw.micronutrients), analysisProvider: optionalProvenance(raw.analysisProvider),
    analysisModel: optionalProvenance(raw.analysisModel) };
}

/** Pure conversion only. The transport is supplied later by the trusted backend integration. */
export function adaptFoodAnalysisResultToScannedFood(response: unknown, scanId = crypto.randomUUID()): ScannedFood {
  const result = normalizeFoodAnalysisResult(response);
  return { scanId, source: 'ai_estimate', analyzedAt: new Date().toISOString(), name: result.foodName,
    subtitle: result.servingDescription, servingWeightGrams: result.servingWeightGrams ?? null,
    calories: result.calories, protein: result.protein, carbs: result.carbs, fat: result.fat,
    confidence: result.overallConfidence ?? null, glycemicIndex: null, ingredients: result.ingredients,
    suggestedMealType: 'lunch', cookingFat: result.cookingFat ?? null, warnings: result.warnings ?? [],
    micronutrients: result.micronutrients, analysisProvider: result.analysisProvider, analysisModel: result.analysisModel };
}
