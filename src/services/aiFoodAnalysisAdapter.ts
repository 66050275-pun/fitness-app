/**
 * Future AI Food Analysis API Adapter
 * 
 * ARCHITECTURAL NOTICE:
 * Production Flow:
 * Mobile App → NutriAI Secure Backend → AI Provider / Verified Food Database
 * 
 * Strict Security Rules:
 * - NEVER call external AI providers (OpenAI, Anthropic, Gemini, etc.) directly from the mobile frontend.
 * - NEVER embed or request API keys in the client-side bundle.
 * - All food recognition, OCR, and barcode queries must be proxied and authenticated
 *   via the secure NutriAI backend service.
 */

import type { FoodAnalysisResult, ScannedFood } from '../types/index.ts';

/**
 * Pure adapter function that transforms a future backend analysis response into the internal ScannedFood model.
 * Does not execute any network requests.
 */
export function adaptFoodAnalysisResultToScannedFood(apiResult: FoodAnalysisResult): ScannedFood {
  return {
    name: apiResult.foodName || 'Unidentified Food Item',
    subtitle: apiResult.servingDescription || 'Standard Portion',
    calories: apiResult.calories !== null && apiResult.calories >= 0 ? Math.round(apiResult.calories) : 0,
    protein: apiResult.protein !== null && apiResult.protein >= 0 ? Math.round(apiResult.protein * 10) / 10 : 0,
    carbs: apiResult.carbs !== null && apiResult.carbs >= 0 ? Math.round(apiResult.carbs * 10) / 10 : 0,
    fat: apiResult.fat !== null && apiResult.fat >= 0 ? Math.round(apiResult.fat * 10) / 10 : 0,
    confidence: apiResult.overallConfidence !== null && apiResult.overallConfidence !== undefined 
      ? Math.max(0, Math.min(1, apiResult.overallConfidence)) 
      : 0.90,
    glycemicIndex: 'Low',
    ingredients: Array.isArray(apiResult.ingredients) ? apiResult.ingredients : [],
    suggestedMealType: 'lunch',
    micronutrients: apiResult.micronutrients
  };
}
