import type { Language } from '../i18n/index.ts';

export interface FoodAnalysisRequest {
  /** JPEG resized locally and re-encoded without the original filename/EXIF metadata. */
  photo: Blob;
  language: Language;
  signal: AbortSignal;
}

export interface FoodAnalysisBackend {
  label: string;
  /** Public-facing photo processing/retention notice. Supply both supported languages. */
  photoProcessingNotice: Record<Language, string>;
  analyze(request: FoodAnalysisRequest): Promise<unknown>;
}

let backend: FoodAnalysisBackend | null = null;

/**
 * Register only from trusted application code after backend/authentication details are agreed.
 * The implementation must call NutriAI's backend, which holds provider credentials.
 * There is deliberately no default endpoint, frontend API key or automatic upload.
 */
export function registerFoodAnalysisBackend(next: FoodAnalysisBackend | null): void {
  if (next && (!next.label.trim() || !next.photoProcessingNotice.en.trim() || !next.photoProcessingNotice.th.trim()))
    throw new Error('Food analysis needs a provider label and a localized privacy notice.');
  backend = next;
}

export function getFoodAnalysisBackend(): FoodAnalysisBackend | null { return backend; }
