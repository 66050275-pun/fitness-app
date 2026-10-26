import { getLanguage, tr } from '../i18n/index.ts';
import { store } from '../store/appState.ts';
import { isVaultUnlocked } from '../services/privateStorage.ts';
import { adaptFoodAnalysisResultToScannedFood, normalizeFoodRecognitionChoices } from '../services/aiFoodAnalysisAdapter.ts';
import { getFoodAnalysisBackend, type FoodAnalysisBackend } from '../services/foodAnalysisBackend.ts';
import { clearFoodAnalysisAccessCode, FoodAnalysisServiceError, setFoodAnalysisAccessCode } from '../services/streamlitFoodAnalysis.ts';
import { prepareFoodPhoto } from '../services/foodPhotoService.ts';
import { changeCookingFat, createManualScannedFood, createScanReview, inputNumber, readReviewNumber, resolveCookingFatDraft, reviewedNutrition, SCAN_REVIEW_FIELDS, validateScanReview } from '../services/foodScanService.ts';
import { getFatGauge } from '../services/phasicRecompService.ts';
import { getTodayKey } from '../utils/dateUtils.ts';
import { formatDisplayNumber } from '../utils/safeNumbers.ts';
import { foodScanProgressLabel, normalizeFoodScanProgress } from '../utils/foodScanProgress.ts';
import type { FoodScanItem, FoodScanReviewField, MealType } from '../types/index.ts';
import { createFoodScanItem, MAX_SCAN_PHOTOS, scanActivityDetail, scanActivityLabel, scanQueuePercent } from '../utils/foodScanQueue.ts';
import { refreshFoodScanActivity } from '../components/FoodScan/FoodScanActivity.ts';
import { foodScanActivityLayout } from '../components/FoodScan/FoodScanActivityLayout.ts';
import { showScanReviewErrors } from '../components/FoodScan/FoodScanReviewForm.ts';

declare global {
  interface Window {
    scanChoosePhoto: (camera: boolean) => void;
    scanSelectPhoto: (input: HTMLInputElement) => void;
    scanConsent: (accepted: boolean) => void;
    scanAIServiceCode: (value: string) => void;
    scanAnalyzePhoto: () => void;
    scanCancelAnalysis: () => void;
    scanDiscard: () => void;
    scanManualReview: (id?: string) => void;
    scanDishHint: (id: string, value: string) => void;
    scanChooseFood: (id: string, candidateId: string) => void;
    scanRetryPhoto: (id: string) => void;
    scanSkipPhoto: (id: string) => void;
    scanReviewPhoto: (id: string) => void;
    scanOpenQueue: () => void;
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
const photos = new Map<string, Blob>();
let sessionItems: FoodScanItem[] = [];
let request: AbortController | null = null;
let worker: Promise<void> | null = null;
let lastImageAttempt = 0;
let consentedBackend: FoodAnalysisBackend | null = null;
let saving = false;
let validatedReviewId: string | null = null;
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
function setText(id: string, value: string): void { const element = document.getElementById(id); if (element && element.textContent !== value) element.textContent = value; }
function reviewError(message: string): void { setText('scan-review-error', message ? tr(message) : ''); }
function discardChoices(item: FoodScanItem): void {
  if (item.choices) (consentedBackend ?? getFoodAnalysisBackend())?.discardSelection?.(item.choices.selectionToken);
  item.choices = null; item.selectedCandidateId = null;
}
function releaseItemPhoto(item: FoodScanItem): void {
  photos.delete(item.id);
  if (item.photoUrl) URL.revokeObjectURL(item.photoUrl);
  item.photoUrl = null;
}
function releaseSession(): void {
  validatedReviewId = null; foodScanActivityLayout.reset();
  generation++; request?.abort(); request = null;
  for (const item of sessionItems) { discardChoices(item); releaseItemPhoto(item); }
  sessionItems = []; photos.clear(); consentedBackend = null;
}
function clearSession(notify = true): void {
  releaseSession();
  if (!isVaultUnlocked()) return;
  store.setScannedFood(null, false);
  store.updateFoodScan({ photoUrl: null, status: 'idle', consent: false, error: null, review: null, progress: null,
    items: [], activeItemId: null, reviewItemId: null, started: false, running: false }, notify);
}

function captureReview(): boolean {
  if (!isReview()) return false;
  for (const field of SCAN_REVIEW_FIELDS) {
    if (field === 'cookingFatGrams') continue;
    const input = document.getElementById(`scan-review-${field}`);
    if (input instanceof HTMLInputElement) store.updateFoodScanReview({ [field]: input.value });
  }
  const cooking = document.getElementById('scan-review-cookingFatGrams');
  if (cooking instanceof HTMLInputElement) store.updateFoodScanReview({ cookingFatInput: cooking.value });
  return true;
}

/** Feedback-only updates keep the active input and its keyboard mounted. */
export function refreshFoodScanFeedback(): void {
  syncReviewControls();
  if (!isReview()) return;
  const draft = store.getState().foodScan.review!;
  if (validatedReviewId === store.getState().foodScan.reviewItemId) showScanReviewErrors(draft);
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
  } catch {
    for (const field of ['calories', 'protein', 'carbs', 'fat']) setText(`scan-total-${field}`, '—');
    setText('scan-fat-balance', '—');
    setText('scan-cooking-total', '—');
    setText('scan-review-consistency', '');
  }
}

function syncReviewControls(): void {
  const form = document.getElementById('scan-review-form');
  form?.setAttribute('aria-busy', String(saving));
  for (const control of form?.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button') ?? [])
    control.disabled = saving || blocked;
  document.getElementById('scan-save-meal')?.setAttribute('aria-busy', String(saving));
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

function itemById(id: string): FoodScanItem | undefined {
  return available() ? store.getState().foodScan.items.find(item => item.id === id) : undefined;
}

function focusQueueItem(id: string): void {
  if (isScanner()) (document.getElementById(`scan-item-${id}-title`) ?? document.getElementById('scan-choose-photos'))?.focus({ preventScroll: true });
}

function updateQueue(notify = true): void {
  if (!available()) return;
  const scan = store.getState().foodScan;
  const active = scan.items.find(item => item.id === scan.activeItemId);
  store.updateFoodScan({ items: [...scan.items], progress: active?.progress ?? null,
    status: scan.status === 'preparing' ? 'preparing' : scan.running ? 'analyzing' : scan.items.length ? 'ready' : 'idle' }, notify);
}

function refreshQueueProgress(item: FoodScanItem): void {
  if (!available()) return;
  const progress = item.progress;
  if (progress) {
    const meter = document.getElementById(`scan-item-${item.id}-progress`);
    meter?.setAttribute('aria-valuenow', String(progress.percent));
    meter?.setAttribute('aria-valuetext', `${progress.percent}% · ${foodScanProgressLabel(progress)}`);
    const fill = document.getElementById(`scan-item-${item.id}-fill`);
    if (fill) fill.style.width = `${progress.percent}%`;
    setText(`scan-item-${item.id}-percent`, `${progress.percent}%`);
    setText(`scan-item-${item.id}-stage`, foodScanProgressLabel(progress));
  }
  const scan = store.getState().foodScan;
  const percent = scanQueuePercent(scan);
  setText('scan-queue-percent', `${percent}%`);
  document.getElementById('scan-queue-progress')?.setAttribute('aria-valuenow', String(percent));
  const queueFill = document.getElementById('scan-queue-fill');
  if (queueFill) queueFill.style.width = `${percent}%`;
  setText('scan-queue-label', scanActivityLabel(scan));
  setText('scan-queue-detail', scanActivityDetail(scan));
  refreshFoodScanActivity();
}

function canUpload(): FoodAnalysisBackend | null {
  const backend = getFoodAnalysisBackend();
  if (!backend) { store.updateFoodScan({ error: 'AI analysis is awaiting backend setup.' }); return null; }
  if (!store.getState().foodScan.consent || consentedBackend !== backend) {
    store.updateFoodScan({ consent: false, error: 'Confirm photo processing before analysis.' }); return null;
  }
  return backend;
}

/** Cancellable pacing respects the backend's five-second spacing without inventing percentage progress. */
function waitForQueue(delay: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise((resolve, reject) => {
    const abort = () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = window.setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delay);
    signal.addEventListener('abort', abort, { once: true });
  });
}

async function runQueue(token: number): Promise<void> {
  while (available() && token === generation) {
    const item = store.getState().foodScan.items.find(entry => entry.status === 'queued');
    if (!item) break;
    const backend = canUpload();
    if (!backend) {
      for (const pending of store.getState().foodScan.items) if (pending.status === 'queued') {
        pending.status = pending.choices ? 'needs_choice' : 'ready'; pending.selectedCandidateId = null;
      }
      break;
    }
    const controller = new AbortController(); request = controller;
    let timedOut = false;
    let timer = 0;
    let abortListener: (() => void) | null = null;
    const confirming = !!item.choices && !!item.selectedCandidateId;
    item.status = 'analyzing'; item.error = null;
    item.progress = { percent: confirming ? 30 : 10, stage: confirming ? 'nutrients' : 'meal', completedBatches: 0, totalBatches: 6 };
    store.updateFoodScan({ activeItemId: item.id, running: true }, false); updateQueue();
    try {
      // Cancellation delivery through Streamlit also needs time to clear the previous server job.
      await waitForQueue(Math.max(750, confirming ? 0 : 5500 - (performance.now() - lastImageAttempt)), controller.signal);
      if (token !== generation || !available() || item.status !== 'analyzing') return;
      timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, 240_000);
      const onProgress = (value: unknown) => {
        const progress = normalizeFoodScanProgress(value);
        if (!progress || token !== generation || !available() || controller.signal.aborted
          || item.status !== 'analyzing' || progress.percent < (item.progress?.percent ?? 0)) return;
        item.progress = progress; updateQueue(false); refreshQueueProgress(item);
      };
      let operation: Promise<unknown>;
      if (confirming) {
        if (!backend.confirmSelection) throw new FoodAnalysisServiceError('selection_expired');
        operation = backend.confirmSelection({ selectionToken: item.choices!.selectionToken, candidateId: item.selectedCandidateId!,
          language: getLanguage(), signal: controller.signal, onProgress });
      } else {
        const photo = photos.get(item.id);
        if (!photo) throw new FoodAnalysisServiceError('photo_invalid');
        lastImageAttempt = performance.now();
        operation = backend.analyze({ photo, dishHint: item.dishHint, language: getLanguage(), signal: controller.signal, onProgress });
      }
      const aborted = new Promise<never>((_, reject) => {
        abortListener = () => reject(new DOMException('Aborted', 'AbortError'));
        controller.signal.addEventListener('abort', abortListener, { once: true });
      });
      const result = await Promise.race([operation, aborted]);
      if (token !== generation || !available() || controller.signal.aborted || item.status !== 'analyzing') continue;
      const choices = normalizeFoodRecognitionChoices(result);
      if (choices) {
        if (confirming || !backend.confirmSelection) throw new Error('Invalid food analysis response.');
        item.choices = choices; item.selectedCandidateId = null; item.status = 'needs_choice';
        item.progress = { percent: 30, stage: 'meal', completedBatches: 0, totalBatches: 6 };
      } else {
        const food = adaptFoodAnalysisResultToScannedFood(result, item.id);
        discardChoices(item); item.result = food; item.review = createScanReview(food);
        item.status = 'review'; item.progress = { percent: 100, stage: 'complete',
          completedBatches: item.progress?.completedBatches ?? 0, totalBatches: 6 };
      }
    } catch (error) {
      if (token !== generation || !available()) return;
      // Skipping one photo cancels only its job; the remaining queue continues.
      if (itemById(item.id)?.status !== 'skipped') {
        if (confirming) discardChoices(item);
        item.status = 'error'; item.progress = null;
        item.error = timedOut ? 'Analysis took too long. Retry or enter the meal manually.'
          : error instanceof FoodAnalysisServiceError ? error.message
            : error instanceof Error && error.message === 'Invalid food analysis response.'
              ? 'The analysis returned incomplete or invalid data. Retry or enter the meal manually.'
              : 'Food analysis failed. Retry or enter the meal manually.';
      }
      // An owner-key/service problem affects the whole queue. Wait for an explicit user retry.
      if (error instanceof FoodAnalysisServiceError && [
        'service_not_configured', 'configuration_invalid', 'key_invalid', 'key_rejected', 'billing_required', 'model_required',
        'access_denied', 'consent_required', 'session_rate_limit', 'daily_limit_reached', 'provider_rate_limit', 'service_busy', 'provider_unavailable'
      ].includes(error.code)) {
        for (const pending of store.getState().foodScan.items) if (pending.status === 'queued')
          pending.status = pending.selectedCandidateId ? 'needs_choice' : 'ready';
        break;
      }
    } finally {
      window.clearTimeout(timer);
      if (abortListener) controller.signal.removeEventListener('abort', abortListener);
      if (request === controller) request = null;
      if (available() && token === generation) { store.updateFoodScan({ activeItemId: null }, false); updateQueue(); }
    }
  }
}

function startQueue(): void {
  if (!available() || worker || !store.getState().foodScan.items.some(item => item.status === 'queued')) return;
  const token = generation;
  store.updateFoodScan({ running: true, started: true, error: null }, false);
  worker = runQueue(token).catch(() => {
    if (!available() || token !== generation) return;
    for (const item of store.getState().foodScan.items) if (item.status === 'queued' || item.status === 'analyzing') {
      discardChoices(item); item.status = 'error'; item.progress = null;
      item.error = 'Food analysis failed. Retry or enter the meal manually.';
    }
  }).finally(() => {
    worker = null;
    if (!available()) return;
    if (token === generation) { store.updateFoodScan({ running: false, activeItemId: null }, false); updateQueue(); }
    // A new user action may have queued work while the previous cancellation settled.
    startQueue();
  });
}

function stopQueue(notify = true): void {
  if (!available()) return;
  generation++; request?.abort(); request = null;
  const scan = store.getState().foodScan;
  for (const item of scan.items) {
    if (item.status === 'analyzing') {
      discardChoices(item); item.status = 'ready'; item.progress = null;
    } else if (item.status === 'queued') {
      item.status = item.choices ? 'needs_choice' : 'ready'; item.selectedCandidateId = null;
    }
  }
  store.updateFoodScan({ running: false, activeItemId: null, progress: null, error: null, status: scan.items.length ? 'ready' : 'idle' }, false);
  updateQueue(notify);
}

function analyzePhotos(): void {
  if (!isScanner() || store.getState().foodScan.status === 'preparing' || !canUpload()) return;
  const scan = store.getState().foodScan;
  const ready = scan.items.filter(item => item.status === 'ready' && photos.has(item.id));
  if (!ready.length) return;
  for (const item of ready) { item.status = 'queued'; item.error = null; }
  store.updateFoodScan({ started: true, error: null }, false);
  store.setScreen('dashboard'); startQueue();
}

async function selectPhotos(files: File[]): Promise<void> {
  if (!isScanner() || store.getState().foodScan.running || store.getState().foodScan.status === 'preparing') return;
  const scan = store.getState().foodScan;
  const slots = MAX_SCAN_PHOTOS - scan.items.length;
  if (files.length > slots) { store.updateFoodScan({ error: 'Choose up to 5 photos per scan. Clear this queue to start another.' }); return; }
  const token = generation;
  store.updateFoodScan({ status: 'preparing', error: null, consent: false }); consentedBackend = null;
  try {
    for (const file of files) {
      if (token !== generation || !available()) return;
      let prepared: Blob;
      try { prepared = await prepareFoodPhoto(file); }
      catch (error) {
        if (token !== generation || !available()) return;
        store.updateFoodScan({ error: error instanceof Error && PHOTO_ERROR_MESSAGES.has(error.message)
          ? error.message : 'This photo could not be opened. Try another image.' });
        continue;
      }
      if (token !== generation || !available()) return;
      const item = createFoodScanItem(URL.createObjectURL(prepared));
      photos.set(item.id, prepared); scan.items.push(item); sessionItems = scan.items;
      updateQueue();
    }
  } finally {
    if (token === generation && available()) { store.updateFoodScan({ status: scan.items.length ? 'ready' : 'idle' }, false); updateQueue(); }
  }
}

function openReview(id: string): void {
  if (!available()) return;
  if (isReview() && !captureReview()) return;
  if (store.activateScanReview(id)) store.setScreen('foodResult');
}

export function bindFoodScanHandlers(): void {
  document.addEventListener('nutriai:lock-start', () => { clearSession(false); blocked = true; syncReviewControls(); });
  document.addEventListener('nutriai:lock-end', () => { blocked = false; if (isVaultUnlocked()) store.updateFoodScan({}); });
  window.addEventListener('pagehide', () => { if (available()) clearSession(false); else releaseSession(); });
  document.addEventListener('nutriai:food-backend-change', () => {
    if (!available()) return;
    stopQueue(false);
    for (const item of store.getState().foodScan.items) {
      if (item.status === 'needs_choice') { discardChoices(item); item.status = 'ready'; item.progress = null; }
    }
    consentedBackend = null; store.updateFoodScan({ consent: false }, false); updateQueue();
  });
  window.scanChoosePhoto = camera => {
    if (!isScanner() || store.getState().foodScan.running || store.getState().foodScan.status === 'preparing') return;
    const input = document.getElementById(camera ? 'scan-camera-input' : 'scan-gallery-input');
    if (input instanceof HTMLInputElement) input.click();
  };
  window.scanSelectPhoto = input => {
    const files = Array.from(input.files ?? []); input.value = '';
    if (files.length) void selectPhotos(files);
  };
  window.scanDishHint = (id, value) => {
    if (!isScanner()) return;
    const item = itemById(id);
    if (item && ['ready', 'error', 'needs_choice'].includes(item.status)) item.dishHint = value.slice(0, 160);
  };
  window.scanConsent = accepted => {
    if (!isScanner() || store.getState().foodScan.running) return;
    consentedBackend = accepted ? getFoodAnalysisBackend() : null;
    store.updateFoodScan({ consent: accepted && !!consentedBackend, error: null });
  };
  window.scanAIServiceCode = value => { if (isScanner() && !store.getState().foodScan.running) setFoodAnalysisAccessCode(value); };
  window.scanAnalyzePhoto = analyzePhotos;
  window.scanCancelAnalysis = () => {
    const fromScannerButton = document.activeElement?.id === 'scan-stop-analysis';
    stopQueue();
    if (fromScannerButton) document.getElementById('scan-queue-title')?.focus({ preventScroll: true });
  };
  window.scanDiscard = () => {
    if (!available()) return;
    clearSession();
    if (store.getState().currentScreen === 'foodResult') store.openScannerMode('food');
    else document.getElementById('scan-choose-photos')?.focus({ preventScroll: true });
  };
  window.scanOpenQueue = () => { if (available()) store.openScannerMode('food'); };
  window.scanChooseFood = (id, candidateId) => {
    if (!isScanner()) return;
    const item = itemById(id);
    if (!item || item.status !== 'needs_choice' || !item.choices?.candidates.some(candidate => candidate.id === candidateId) || !canUpload()) return;
    if (!item.dishHint) item.dishHint = item.choices.candidates.find(candidate => candidate.id === candidateId)!.name.slice(0, 160);
    item.selectedCandidateId = candidateId; item.status = 'queued'; item.error = null;
    store.updateFoodScan({ started: true }, false); updateQueue(); startQueue(); focusQueueItem(id);
  };
  window.scanRetryPhoto = id => {
    if (!isScanner()) return;
    const item = itemById(id);
    if (!item || !['error', 'needs_choice'].includes(item.status) || !photos.has(id) || !canUpload()) return;
    discardChoices(item); item.status = 'queued'; item.error = null; item.progress = null;
    store.updateFoodScan({ started: true }, false); updateQueue(); startQueue(); focusQueueItem(id);
  };
  window.scanSkipPhoto = id => {
    if (!available()) return;
    const item = itemById(id); if (!item || item.status === 'saved' || item.status === 'skipped') return;
    if (store.getState().foodScan.activeItemId === id) request?.abort();
    discardChoices(item); releaseItemPhoto(item); item.status = 'skipped'; item.progress = null; item.result = null; item.review = null;
    if (store.getState().foodScan.reviewItemId === id) {
      store.setScannedFood(null, false); store.updateFoodScan({ photoUrl: null, reviewItemId: null }, false);
      if (store.getState().currentScreen === 'foodResult') store.openScannerMode('food');
    }
    updateQueue();
    focusQueueItem(id);
  };
  window.scanReviewPhoto = openReview;
  window.scanManualReview = id => {
    if (!isScanner() || store.getState().foodScan.status === 'preparing') return;
    const scan = store.getState().foodScan;
    let item = id ? itemById(id) : scan.items.find(entry => ['ready', 'error', 'needs_choice'].includes(entry.status));
    if (item && !['ready', 'error', 'needs_choice'].includes(item.status)) return;
    if (!item) {
      if (scan.items.length >= MAX_SCAN_PHOTOS) { store.updateFoodScan({ error: 'Choose up to 5 photos per scan. Clear this queue to start another.' }); return; }
      item = createFoodScanItem(null); scan.items.push(item); sessionItems = scan.items;
    }
    discardChoices(item); item.result = createManualScannedFood(); item.result.scanId = item.id; item.result.name = item.dishHint;
    item.review = createScanReview(item.result); item.status = 'review'; item.error = null;
    updateQueue(false); openReview(item.id);
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
    const scan = store.getState().foodScan;
    const item = scan.items.find(entry => entry.id === scan.reviewItemId && entry.status === 'review');
    if (!item) return;
    validatedReviewId = item.id;
    if (showScanReviewErrors(scan.review!, true)) return;
    const error = validateScanReview(scan.review!);
    if (error) { reviewError(error); document.getElementById('scan-review-error')?.focus(); return; }
    saving = true; syncReviewControls();
    let accepted = false;
    try { accepted = store.logReviewedScannedFood(); }
    finally { saving = false; syncReviewControls(); }
    if (!accepted) { reviewError('The change could not be queued. Keep this tab open and retry.'); return; }
    item.status = 'saved'; item.result = null; item.review = null; releaseItemPhoto(item);
    store.updateFoodScan({ photoUrl: null, reviewItemId: null }, false);
    // Consume only this draft; other photos and their results remain available in the activity widget.
    updateQueue(false); store.selectDate(getTodayKey()); store.setScreen('diary');
  };
  window.scanOpenPendingReview = () => {
    if (!available()) return;
    const scan = store.getState().foodScan;
    const item = scan.items.find(entry => entry.id === scan.reviewItemId && entry.status === 'review')
      ?? scan.items.find(entry => entry.status === 'review');
    if (item) openReview(item.id);
  };
}

export function activateFoodScanner(): void { blocked = false; saving = false; }
export function deactivateFoodScanner(): void { blocked = true; saving = false; releaseSession(); clearFoodAnalysisAccessCode(); }

/** Navigation preserves the in-memory queue. Lock/discard/pagehide is the privacy boundary. */
export function syncFoodScanLifecycle(): void {
  if (!available()) return;
  const scan = store.getState().foodScan;
  if (scan.items.length && scan.items.every(item => item.status === 'saved' || item.status === 'skipped')) clearSession(false);
}
