import { getLanguage, tr } from '../i18n/index.ts';
import { store } from '../store/appState.ts';
import { isVaultUnlocked } from '../services/privateStorage.ts';
import { adaptFoodAnalysisResultToScannedFood } from '../services/aiFoodAnalysisAdapter.ts';
import { getFoodAnalysisBackend, type FoodAnalysisBackend } from '../services/foodAnalysisBackend.ts';
import { clearFoodAnalysisAccessCode, FoodAnalysisServiceError, setFoodAnalysisAccessCode } from '../services/streamlitFoodAnalysis.ts';
import { prepareFoodPhoto } from '../services/foodPhotoService.ts';
import { changeCookingFat, createManualScannedFood, inputNumber, readReviewNumber, resolveCookingFatDraft, reviewedNutrition, SCAN_REVIEW_FIELDS, validateScanReview } from '../services/foodScanService.ts';
import { getFatGauge } from '../services/phasicRecompService.ts';
import { getTodayKey } from '../utils/dateUtils.ts';
import { formatDisplayNumber } from '../utils/safeNumbers.ts';
import type { FoodScanReviewField, MealType } from '../types/index.ts';

declare global {
  interface Window {
    scanChoosePhoto: (camera: boolean) => void;
    scanSelectPhoto: (input: HTMLInputElement) => void;
    scanConsent: (accepted: boolean) => void;
    scanAIServiceCode: (value: string) => void;
    scanAnalyzePhoto: () => void;
    scanCancelAnalysis: () => void;
    scanDiscard: () => void;
    scanManualReview: () => void;
    scanReviewInput: (field: FoodScanReviewField, value: string) => void;
    scanCookingDraft: (value: string) => void;
    scanCookingPreset: (level: 'less' | 'regular' | 'more') => void;
    scanReviewMeal: (type: MealType) => void;
    scanSaveReviewedMeal: () => void;
    scanOpenPendingReview: () => void;
  }
}

let blocked = true;
let generation = 0;
let photo: Blob | null = null;
let photoUrl: string | null = null;
let request: AbortController | null = null;
let consentedBackend: FoodAnalysisBackend | null = null;
let saving = false;
const PHOTO_ERROR_MESSAGES = new Set([
  'Choose a JPEG, PNG or WebP photo.', 'Choose a photo smaller than 12 MB.',
  'This photo could not be opened. Try another image.', 'This photo is too large to process. Choose a smaller image.'
]);

function available(): boolean { return !blocked && isVaultUnlocked(); }
function isScanner(): boolean {
  return available() && store.getState().currentScreen === 'scanner' && store.getState().scannerMode === 'food';
}
function isReview(): boolean {
  return available() && !saving && store.getState().currentScreen === 'foodResult' && !!store.getState().foodScan.review;
}
function setText(id: string, value: string): void { const element = document.getElementById(id); if (element) element.textContent = value; }
function reviewError(message: string): void { setText('scan-review-error', message ? tr(message) : ''); }
function releasePhoto(): void {
  generation++; request?.abort(); request = null;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photo = null; photoUrl = null; consentedBackend = null;
}
function clearSession(notify = true): void {
  releasePhoto();
  if (!isVaultUnlocked()) return;
  store.setScannedFood(null, false);
  store.updateFoodScan({ photoUrl: null, status: 'idle', consent: false, error: null, review: null }, notify);
}

function captureReview(): boolean {
  if (!isReview()) return false;
  const review = store.getState().foodScan.review!;
  for (const field of SCAN_REVIEW_FIELDS) {
    if (field === 'cookingFatGrams') continue;
    const input = document.getElementById(`scan-review-${field}`);
    if (input instanceof HTMLInputElement) store.updateFoodScanReview({ [field]: input.value });
  }
  const cooking = document.getElementById('scan-review-cookingFatGrams');
  if (cooking instanceof HTMLInputElement && cooking.value !== review.cookingFatGrams) {
    try { store.updateFoodScanReview(changeCookingFat(review, cooking.value)); }
    catch { reviewError('Cooking fat must be part of the total fat.'); return false; }
  }
  return true;
}

/** Feedback-only updates keep the active input and its keyboard mounted. */
export function refreshFoodScanFeedback(): void {
  if (!isReview()) return;
  const draft = store.getState().foodScan.review!;
  try {
    const review = resolveCookingFatDraft(draft);
    const nutrition = reviewedNutrition(review);
    for (const field of ['calories', 'protein', 'carbs', 'fat'] as const)
      setText(`scan-total-${field}`, formatDisplayNumber(nutrition[field], field === 'calories' ? 0 : 1));
    const today = getTodayKey(); const state = store.getState();
    const gauge = getFatGauge(store.getMealsForDate(today), today, store.getEffectiveNutritionGoals(today).fatTarget,
      state.userProfile.dietProgram ?? 'standard', state.userProfile.currentWeightKg);
    const balance = nutrition.fat === null ? null : gauge.ceilingGrams - gauge.consumedKnownGrams - nutrition.fat;
    setText('scan-fat-balance', balance === null ? tr('Add total fat to preview today’s allowance.')
      : tr(balance < 0 ? '{0} g over the ceiling' : '{0} g remaining', formatDisplayNumber(Math.abs(balance))));
    const cooking = readReviewNumber(review.cookingFatGrams);
    setText('scan-cooking-total', cooking === null ? tr('Not estimated') : tr('{0} g included in total fat', formatDisplayNumber(cooking)));
    const macroCalories = nutrition.protein !== null && nutrition.carbs !== null && nutrition.fat !== null
      ? nutrition.protein * 4 + nutrition.carbs * 4 + nutrition.fat * 9 : null;
    const mismatch = nutrition.calories !== null && macroCalories !== null && Math.abs(nutrition.calories - macroCalories) > Math.max(50, macroCalories * 0.2);
    setText('scan-review-consistency', mismatch ? tr('Calories and macros differ considerably. Review the values before saving.') : '');
    const save = document.getElementById('scan-save-meal');
    if (save instanceof HTMLButtonElement) save.disabled = !!validateScanReview(review);
  } catch {
    for (const field of ['calories', 'protein', 'carbs', 'fat']) setText(`scan-total-${field}`, '—');
    setText('scan-fat-balance', '—');
    const save = document.getElementById('scan-save-meal'); if (save instanceof HTMLButtonElement) save.disabled = true;
  }
}

function applyCookingFat(value: string): void {
  if (!isReview() || !store.isSpecialProgramUnlocked()) return;
  try {
    const patch = changeCookingFat(store.getState().foodScan.review!, value);
    store.updateFoodScanReview(patch);
    for (const [field, text] of Object.entries(patch)) {
      if (field === 'cookingFatInput') continue;
      const input = document.getElementById(`scan-review-${field}`);
      if (input instanceof HTMLInputElement) input.value = text;
    }
    reviewError(''); refreshFoodScanFeedback();
  } catch { reviewError('Enter a cooking-fat estimate within the total fat allowance.'); }
}

async function analyzePhoto(): Promise<void> {
  if (!isScanner() || !photo || request || store.getState().foodScan.status === 'preparing') return;
  const backend = getFoodAnalysisBackend();
  if (!backend) { store.updateFoodScan({ error: 'AI analysis is awaiting backend setup.', status: 'ready' }); return; }
  if (!store.getState().foodScan.consent || consentedBackend !== backend) {
    store.updateFoodScan({ consent: false, error: 'Confirm photo processing before analysis.' }); return;
  }
  const token = ++generation; const selectedPhoto = photo; const controller = new AbortController(); request = controller;
  let timedOut = false;
  const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 75_000);
  store.updateFoodScan({ status: 'analyzing', error: null });
  try {
    const aborted = new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
    const result = await Promise.race([backend.analyze({ photo: selectedPhoto, language: getLanguage(), signal: controller.signal }), aborted]);
    if (token !== generation || !isScanner() || controller.signal.aborted) return;
    const food = adaptFoodAnalysisResultToScannedFood(result);
    request = null;
    store.updateFoodScan({ status: 'ready', error: null }, false);
    store.setScannedFood(food, false); store.setScreen('foodResult');
  } catch (error) {
    if (token !== generation || !isScanner()) return;
    const message = timedOut ? 'Analysis took too long. Retry or enter the meal manually.'
      : error instanceof FoodAnalysisServiceError ? error.message
      : error instanceof Error && error.message === 'Invalid food analysis response.' ? 'The analysis returned incomplete or invalid data. Retry or enter the meal manually.'
        : 'Food analysis failed. Retry or enter the meal manually.';
    store.updateFoodScan({ status: 'error', error: message });
  } finally {
    window.clearTimeout(timer);
    if (request === controller) request = null;
  }
}

export function bindFoodScanHandlers(): void {
  document.addEventListener('nutriai:lock-start', () => { blocked = true; clearSession(false); });
  document.addEventListener('nutriai:lock-end', () => { blocked = false; if (isVaultUnlocked()) store.updateFoodScan({}); });
  window.scanChoosePhoto = camera => {
    if (!isScanner() || request) return;
    const input = document.getElementById(camera ? 'scan-camera-input' : 'scan-gallery-input');
    if (input instanceof HTMLInputElement) input.click();
  };
  window.scanSelectPhoto = input => {
    if (!isScanner() || request) { input.value = ''; return; }
    const file = input.files?.[0]; input.value = ''; if (!file) return;
    clearSession(false); const token = generation;
    store.updateFoodScan({ status: 'preparing', error: null });
    void prepareFoodPhoto(file).then(prepared => {
      if (token !== generation || !isScanner()) return;
      photo = prepared; photoUrl = URL.createObjectURL(prepared);
      store.updateFoodScan({ photoUrl, status: 'ready', consent: false, error: null });
    }).catch(error => {
      if (token !== generation || !isScanner()) return;
      store.updateFoodScan({ status: 'error', error: error instanceof Error && PHOTO_ERROR_MESSAGES.has(error.message)
        ? error.message : 'This photo could not be opened. Try another image.' });
    });
  };
  window.scanConsent = accepted => {
    if (!isScanner() || request) return;
    consentedBackend = accepted ? getFoodAnalysisBackend() : null;
    store.updateFoodScan({ consent: accepted && !!consentedBackend, error: null });
  };
  window.scanAIServiceCode = value => {
    if (!isScanner() || request) return;
    setFoodAnalysisAccessCode(value);
  };
  window.scanAnalyzePhoto = () => { void analyzePhoto(); };
  window.scanCancelAnalysis = () => {
    if (!isScanner()) return;
    generation++; request?.abort(); request = null;
    store.updateFoodScan({ status: photo ? 'ready' : 'idle', error: null });
  };
  window.scanDiscard = () => { if (available()) clearSession(); };
  window.scanManualReview = () => {
    if (!isScanner() || request || store.getState().foodScan.status === 'preparing') return;
    store.setScannedFood(createManualScannedFood(), false); store.setScreen('foodResult');
  };
  window.scanReviewInput = (field, value) => {
    if (!isReview() || !SCAN_REVIEW_FIELDS.includes(field)) return;
    if (field === 'cookingFatGrams') { applyCookingFat(value); return; }
    store.updateFoodScanReview({ [field]: value }); reviewError(''); refreshFoodScanFeedback();
  };
  window.scanCookingDraft = value => {
    if (!isReview() || !store.isSpecialProgramUnlocked()) return;
    store.updateFoodScanReview({ cookingFatInput: value }); reviewError(''); refreshFoodScanFeedback();
  };
  window.scanCookingPreset = level => {
    if (!isReview() || !['less', 'regular', 'more'].includes(level)) return;
    const estimate = store.getState().lastScannedFood?.cookingFat;
    if (estimate?.estimatedGrams === null || !estimate) return;
    const value = level === 'less' ? estimate.rangeMinGrams ?? estimate.estimatedGrams * 0.7
      : level === 'more' ? estimate.rangeMaxGrams ?? estimate.estimatedGrams * 1.3 : estimate.estimatedGrams;
    applyCookingFat(inputNumber(value));
  };
  window.scanReviewMeal = type => {
    if (!isReview() || !['breakfast', 'lunch', 'dinner', 'snack'].includes(type)) return;
    store.updateFoodScanReview({ mealType: type });
    document.querySelectorAll<HTMLElement>('[data-scan-meal]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.scanMeal === type)));
  };
  window.scanSaveReviewedMeal = () => {
    if (!captureReview()) return;
    const error = validateScanReview(store.getState().foodScan.review!);
    if (error) { reviewError(error); document.getElementById('scan-review-error')?.focus(); return; }
    saving = true;
    let accepted = false;
    try { accepted = store.logReviewedScannedFood(); }
    finally { saving = false; }
    if (!accepted) { reviewError('The change could not be queued. Keep this tab open and retry.'); return; }
    clearSession(false); store.selectDate(getTodayKey()); store.setScreen('diary');
  };
  window.scanOpenPendingReview = () => {
    if (available() && store.getState().lastScannedFood && store.getState().foodScan.review) store.setScreen('foodResult');
  };
}

export function activateFoodScanner(): void { blocked = false; saving = false; }
export function deactivateFoodScanner(): void { blocked = true; saving = false; releasePhoto(); clearFoodAnalysisAccessCode(); }

/** Called before rendering: leaving either scan screen discards photo/unfinished analysis and aborts work. */
export function syncFoodScanLifecycle(): void {
  if (!available()) return;
  const state = store.getState();
  if ((state.currentScreen === 'scanner' && state.scannerMode === 'food') || state.currentScreen === 'foodResult') return;
  if (photo || request || state.lastScannedFood || state.foodScan.status !== 'idle') clearSession(false);
}
