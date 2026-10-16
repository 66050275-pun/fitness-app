import { getLanguage } from '../i18n/index.ts';
import { registerFoodAnalysisBackend } from './foodAnalysisBackend.ts';
import type { FoodAnalysisRequest, FoodSelectionRequest } from './foodAnalysisBackend.ts';
import type { FoodAnalysisProgress } from '../types/index.ts';
import { normalizeFoodScanProgress } from '../utils/foodScanProgress.ts';

const CHANNEL = 'nutriai-food-analysis-v1';
interface PublicConfig {
  ready: boolean;
  provider: 'Maxplus';
  model: string | null;
  accessCodeRequired: boolean;
  notice: { en: string; th: string };
  version: string;
}
interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (reason: Error) => void;
  signal: AbortSignal;
  abort: () => void;
  onProgress?: (progress: FoodAnalysisProgress) => void;
  lastProgress: number;
}

const ERROR_KEYS: Readonly<Record<string, string>> = {
  service_not_configured: 'AI scanning is not available yet. You can enter nutrition manually.',
  configuration_invalid: 'The AI service needs setup. Please contact the app owner.',
  key_invalid: 'The AI service credentials need attention. Please contact the app owner.',
  key_rejected: 'Maxplus rejected the service credentials. Please contact the app owner.',
  billing_required: 'Maxplus credits or billing need attention. You can enter nutrition manually.',
  model_required: 'The app owner needs to select an image-capable Maxplus model.',
  model_or_image_rejected: 'Maxplus rejected the model or photo. An image-capable model is required.',
  provider_redirect: 'The AI service endpoint needs attention. Please contact the app owner.',
  provider_rate_limit: 'Maxplus is limiting requests. Wait before trying again.',
  provider_unavailable: 'Maxplus is unavailable. Retry later or enter nutrition manually.',
  provider_timeout: 'Maxplus took too long. Retry or enter nutrition manually.',
  response_invalid: 'The AI result could not be validated. Retry or enter nutrition manually.',
  output_incomplete: 'The AI result was incomplete. Retry or enter nutrition manually.',
  food_not_recognized: 'Food is unclear. Add a dish name and retry, or enter nutrition manually.',
  photo_invalid: 'The photo could not be processed. Choose another food photo.',
  access_denied: 'The AI access code is incorrect. Check it and try again.',
  consent_required: 'Confirm photo processing again before analysis.',
  session_rate_limit: 'Too many scan attempts. Wait before trying again.',
  daily_limit_reached: 'Today’s AI scan allowance has been reached. You can enter nutrition manually.',
  service_busy: 'The AI service is busy. Wait before trying again.',
  selection_expired: 'These food choices expired. Add a dish name and analyze the photo again.',
};

export class FoodAnalysisServiceError extends Error {
  constructor(readonly code: string) {
    super(ERROR_KEYS[code] ?? 'Food analysis failed. Retry or enter the meal manually.');
    this.name = 'FoodAnalysisServiceError';
  }
}

let config: PublicConfig | null = null;
let frame: string | null = null;
let configurationSignature = '';
let accessCode = '';
let initialized = false;
let bridgeWindow: Window | null = null;
let bridgeOrigin = '';
const pending = new Map<string, PendingRequest>();

export function isFoodAnalysisAccessCodeRequired(): boolean { return config?.ready === true && config.accessCodeRequired; }
export function setFoodAnalysisAccessCode(value: string): void { accessCode = value.slice(0, 256); }
export function getFoodAnalysisAccessCode(): string { return accessCode; }
export function clearFoodAnalysisAccessCode(): void { accessCode = ''; }

function post(message: Record<string, unknown>): void {
  bridgeWindow?.postMessage({ channel: CHANNEL, frame, ...message }, bridgeOrigin);
}

function locateBridge(): boolean {
  try {
    const element = window.parent.document.querySelector<HTMLIFrameElement>('iframe[title*="nutriai_food_bridge"]');
    if (!element?.contentWindow || !element.src) return false;
    const url = new URL(element.src, window.parent.location.href);
    if (!['https:', 'http:'].includes(url.protocol)) return false;
    bridgeWindow = element.contentWindow; bridgeOrigin = url.origin;
    return true;
  } catch { return false; }
}
function release(id: string, item: PendingRequest): void {
  pending.delete(id); item.signal.removeEventListener('abort', item.abort);
}
function normalizeConfig(value: unknown): PublicConfig | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const notice = raw.notice as Record<string, unknown> | undefined;
  if (typeof raw.ready !== 'boolean' || raw.provider !== 'Maxplus' || typeof raw.accessCodeRequired !== 'boolean'
    || typeof raw.version !== 'string' || !/^[a-f0-9]{24}$/.test(raw.version)
    || !notice || typeof notice.en !== 'string' || typeof notice.th !== 'string'
    || notice.en.length > 5000 || notice.th.length > 5000
    || (raw.ready && (typeof raw.model !== 'string' || !/^[A-Za-z0-9._:/-]{1,100}$/.test(raw.model)))) return null;
  return { ready: raw.ready, provider: 'Maxplus', model: typeof raw.model === 'string' ? raw.model : null,
    accessCodeRequired: raw.accessCodeRequired, notice: { en: notice.en, th: notice.th }, version: raw.version };
}

function requestAnalysis(action: 'analyze' | 'confirm_food', payload: Record<string, unknown>,
  { language, signal, onProgress }: Omit<FoodAnalysisRequest, 'photo'>, selectedConfig = config, selectedFrame = frame): Promise<unknown> {
  if (!selectedConfig?.ready || !selectedFrame) return Promise.reject(new FoodAnalysisServiceError('service_not_configured'));
  if (signal.aborted || frame !== selectedFrame || config?.version !== selectedConfig.version)
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const item: PendingRequest = { resolve, reject, signal, onProgress, lastProgress: 0, abort: () => {
      release(id, item); post({ type: 'cancel', id }); reject(new DOMException('Aborted', 'AbortError'));
    } };
    signal.addEventListener('abort', item.abort, { once: true }); pending.set(id, item);
    post({ type: 'request', id, action, payload: {
      ...payload, language, consent: true, configVersion: selectedConfig.version,
      accessCode: selectedConfig.accessCodeRequired ? accessCode : ''
    } });
  });
}

async function analyze({ photo, language, signal, onProgress, dishHint }: FoodAnalysisRequest): Promise<unknown> {
  const selectedConfig = config;
  const selectedFrame = frame;
  if (!selectedConfig?.ready || !selectedFrame) throw new FoodAnalysisServiceError('service_not_configured');
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  if (photo.type !== 'image/jpeg' || photo.size > 4 * 1024 * 1024) throw new FoodAnalysisServiceError('photo_invalid');
  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  const encoded = btoa(binary);
  if (signal.aborted || frame !== selectedFrame || config?.version !== selectedConfig.version)
    throw new DOMException('Aborted', 'AbortError');
  return requestAnalysis('analyze', { photo: encoded, dishHint: (dishHint ?? '').slice(0, 160) },
    { language, signal, onProgress }, selectedConfig, selectedFrame);
}

function confirmSelection(request: FoodSelectionRequest): Promise<unknown> {
  return requestAnalysis('confirm_food', { selectionToken: request.selectionToken, candidateId: request.candidateId }, request);
}

function discardSelection(selectionToken: string): void {
  if (/^[a-zA-Z0-9-]{1,80}$/.test(selectionToken)) post({ type: 'cancel', id: selectionToken });
}

/** The small Streamlit wrapper handshakes and forwards only this RPC; ordinary catalog requests remain untouched. */
export function initializeStreamlitFoodAnalysis(): void {
  if (initialized || window.parent === window) return;
  initialized = true;
  window.addEventListener('message', event => {
    if (event.source !== bridgeWindow || event.origin !== bridgeOrigin || !event.data || typeof event.data !== 'object') return;
    const message = event.data as Record<string, unknown>;
    if (message.channel !== CHANNEL || typeof message.frame !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(message.frame)) return;
    if (message.type === 'config') {
      const next = normalizeConfig(message.config);
      if (!next) return;
      const signature = `${message.frame}:${JSON.stringify(next)}`;
      if (signature === configurationSignature) return;
      for (const item of pending.values()) item.abort();
      config = next; frame = message.frame; configurationSignature = signature; accessCode = '';
      registerFoodAnalysisBackend(next.ready ? { label: next.model ? `Maxplus · ${next.model}` : 'Maxplus',
        photoProcessingNotice: next.notice, analyze, confirmSelection, discardSelection } : null);
      document.dispatchEvent(new Event('nutriai:food-backend-change'));
      return;
    }
    if (message.frame !== frame || message.type !== 'response' || typeof message.id !== 'string') return;
    const item = pending.get(message.id); if (!item) return;
    if (message.kind === 'progress') {
      const progress = normalizeFoodScanProgress(message.progress);
      if (progress && !item.signal.aborted && progress.percent >= item.lastProgress) {
        item.lastProgress = progress.percent;
        try { item.onProgress?.(progress); } catch { /* A view callback cannot fail the analysis request. */ }
      }
      return;
    }
    release(message.id, item);
    if (message.kind === 'result') item.resolve(message.result);
    else item.reject(new FoodAnalysisServiceError(typeof message.code === 'string' ? message.code : 'service_error'));
  });
  document.addEventListener('nutriai:lock-start', () => {
    accessCode = ''; for (const item of pending.values()) item.abort();
  });
  window.addEventListener('pagehide', () => {
    accessCode = ''; for (const item of pending.values()) item.abort();
  });
  // The backend sidecar is mounted alongside the original st.iframe. Only its public handshake is retried.
  // The app itself never moves to a component asset origin, so existing encrypted IndexedDB stays accessible.
  let attempts = 0;
  const hello = () => { if (locateBridge()) post({ type: 'hello', language: getLanguage() }); };
  hello();
  const handshake = window.setInterval(() => {
    if (config || ++attempts >= 120) { window.clearInterval(handshake); return; }
    hello();
  }, 500);
}
