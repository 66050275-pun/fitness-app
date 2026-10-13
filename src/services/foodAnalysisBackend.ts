import type { Language } from '../i18n/index.ts';
import type { FoodAnalysisProgress } from '../types/index.ts';

export interface FoodAnalysisRequest {
  /** JPEG resized locally and re-encoded without the original filename/EXIF metadata. */
  photo: Blob;
  /** Optional user-supplied dish name; untrusted text, bounded to 160 characters. */
  dishHint?: string;
  language: Language;
  signal: AbortSignal;
  /** Completed workflow milestones from the backend, never a simulated provider percentage. */
  onProgress?: (progress: FoodAnalysisProgress) => void;
}

export interface FoodSelectionRequest extends Omit<FoodAnalysisRequest, 'photo' | 'dishHint'> {
  selectionToken: string;
  candidateId: string;
}

export interface FoodAnalysisBackend {
  label: string;
  /** Public-facing photo processing/retention notice. Supply both supported languages. */
  photoProcessingNotice: Record<Language, string>;
  analyze(request: FoodAnalysisRequest): Promise<unknown>;
  /** Resume detailed nutrition for one server-validated candidate without uploading the photo again. */
  confirmSelection?(request: FoodSelectionRequest): Promise<unknown>;
  discardSelection?(selectionToken: string): void;
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
