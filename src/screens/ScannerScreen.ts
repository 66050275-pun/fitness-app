import { getLanguage, trHtml } from '../i18n/index.ts';
import { store } from '../store/appState.ts';
import { getFoodAnalysisBackend } from '../services/foodAnalysisBackend.ts';
import { getFoodAnalysisAccessCode, isFoodAnalysisAccessCodeRequired } from '../services/streamlitFoodAnalysis.ts';
import { escapeHtml } from '../utils/sanitize.ts';
import { foodScanProgressLabel } from '../utils/foodScanProgress.ts';

export function renderScannerScreen(): string {
  const state = store.getState();
  const scan = state.foodScan;
  const barcode = state.scannerMode === 'barcode';
  const backend = getFoodAnalysisBackend();
  const busy = scan.status === 'preparing' || scan.status === 'analyzing';
  const disabled = busy ? 'disabled' : '';
  const progress = scan.progress ?? { percent: 0, stage: 'preparing' as const, completedBatches: 0, totalBatches: 6 };

  return `
    <div class="food-scan-screen min-h-screen flex flex-col gap-5 px-screen-gutter pt-5 pb-8">
      <header class="flex items-center gap-3">
        <button type="button" onclick="window.navigateApp('dashboard')" class="phasic-tool-secondary rounded-full h-12 w-12 flex items-center justify-center shrink-0" aria-label="${trHtml('Back')}">
          <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
        </button>
        <div class="min-w-0 flex-1"><h1 class="font-heading font-extrabold text-xl">${trHtml('Scan Food')}</h1>
          <p class="phasic-tool-muted text-sm">${trHtml('Review your meal before logging it.')}</p></div>
      </header>
      <div class="food-scan-modes flex gap-2" role="group" aria-label="${trHtml('Scanner mode')}">
        <button type="button" onclick="window.openScannerMode('food')" aria-pressed="${!barcode}" ${disabled}>${trHtml('Food photo')}</button>
        <button type="button" onclick="window.openScannerMode('barcode')" aria-pressed="${barcode}" ${disabled}>${trHtml('Barcode')}</button>
      </div>
      ${barcode ? `
        <section class="phasic-tool-card flex flex-col gap-4 text-center">
          <span class="material-symbols-outlined text-5xl text-primary" aria-hidden="true">barcode_scanner</span>
          <h2 class="font-heading font-bold text-lg">${trHtml('Barcode Scanning Prototype')}</h2>
          <p class="phasic-tool-muted text-sm">${trHtml('Hardware camera barcode decoding is currently in prototype integration. Search our verified offline catalog or use manual quick log:')}</p>
          <button type="button" class="ui-primary-button" onclick="window.navigateApp('foodSearch')">${trHtml('Search Catalog')}</button>
          <button type="button" class="phasic-tool-secondary" onclick="window.navigateApp('quickLog')">${trHtml('Quick Log')}</button>
        </section>
      ` : `
        <section class="food-scan-photo ${busy ? 'food-scan-photo-busy' : ''} relative rounded-3xl overflow-hidden" aria-label="${trHtml('Food photo preview')}">
          ${scan.photoUrl ? `<img src="${escapeHtml(scan.photoUrl)}" alt="${trHtml('Selected food photo')}" class="w-full h-full object-contain" />`
            : `<div class="flex flex-col items-center justify-center gap-3 h-full px-6 text-center">
              <span class="material-symbols-outlined text-6xl text-primary" aria-hidden="true">add_a_photo</span>
              <h2 class="font-heading font-bold text-lg">${trHtml('Start with a food photo')}</h2>
              <p class="phasic-tool-muted text-sm">${trHtml('Keep the whole portion visible and use good lighting.')}</p>
            </div>`}
          ${busy ? `<div class="absolute inset-0 bg-black/60 text-white flex flex-col gap-3 items-center justify-center p-5" role="status">
            <span class="material-symbols-outlined animate-spin text-3xl" aria-hidden="true">progress_activity</span>
            <p id="scan-analysis-stage" class="font-heading font-bold text-center">${escapeHtml(foodScanProgressLabel(progress))}</p>
            <div class="w-full max-w-[240px] space-y-2">
              <p id="scan-analysis-percent" class="text-center font-heading font-extrabold text-2xl tabular-nums" aria-hidden="true">${progress.percent}%</p>
              <div id="scan-analysis-progress" class="food-scan-progress-track" role="progressbar" aria-label="${trHtml('Food analysis progress')}"
                aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}" aria-valuetext="${escapeHtml(`${progress.percent}% · ${foodScanProgressLabel(progress)}`)}">
                <div id="scan-analysis-progress-fill" class="food-scan-progress-fill" style="width:${progress.percent}%"></div>
              </div>
              <p class="text-xs text-center text-white/90">${trHtml('Progress updates when each step finishes.')}</p>
            </div>
            ${scan.status === 'analyzing' ? `<button type="button" class="rounded-xl border border-white/40 py-3 px-5" onclick="window.scanCancelAnalysis()">${trHtml('Cancel')}</button>` : ''}
          </div>` : ''}
        </section>
        <input id="scan-camera-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onchange="window.scanSelectPhoto(this)" hidden />
        <input id="scan-gallery-input" type="file" accept="image/jpeg,image/png,image/webp" onchange="window.scanSelectPhoto(this)" hidden />
        <div class="grid grid-cols-2 gap-3">
          <button type="button" class="phasic-tool-secondary flex items-center justify-center gap-2" onclick="window.scanChoosePhoto(true)" ${disabled}>
            <span class="material-symbols-outlined" aria-hidden="true">photo_camera</span>${trHtml('Take photo')}
          </button>
          <button type="button" class="phasic-tool-secondary flex items-center justify-center gap-2" onclick="window.scanChoosePhoto(false)" ${disabled}>
            <span class="material-symbols-outlined" aria-hidden="true">photo_library</span>${trHtml('Choose photo')}
          </button>
        </div>
        <section class="phasic-tool-note text-sm flex flex-col gap-2">
          <p class="font-heading font-bold">${trHtml(backend ? 'AI food analysis' : 'AI analysis is awaiting backend setup.')}</p>
          <p>${backend ? trHtml('Your photo will be processed by {0}.', backend.label)
            : trHtml('You can prepare a photo and enter nutrition yourself. AI results will become available when the service is connected.')}</p>
          <p>${trHtml('Photos stay in memory for this scan and are discarded when you leave or lock the app. Saved meals contain nutrition results, not photos.')}</p>
          ${backend ? `<p>${escapeHtml(backend.photoProcessingNotice[getLanguage()])}</p>
            ${isFoodAnalysisAccessCodeRequired() ? `<label class="flex flex-col gap-2 font-heading font-bold" for="scan-ai-service-code">
              ${trHtml('AI access code')}<input id="scan-ai-service-code" type="password" autocomplete="off" maxlength="256" class="phasic-tool-input w-full font-sans font-normal"
                value="${escapeHtml(getFoodAnalysisAccessCode())}" oninput="window.scanAIServiceCode(this.value)" ${disabled} />
              <span class="font-sans font-normal">${trHtml('Use the service code from the app owner. Your vault PIN stays on this device.')}</span>
            </label>` : ''}
            <label class="flex items-start gap-3 mt-2"><input id="scan-upload-consent" type="checkbox" class="h-5 w-5 mt-0.5 shrink-0" onchange="window.scanConsent(this.checked)" ${scan.consent ? 'checked' : ''} ${disabled} />
              <span>${trHtml('I agree to send this food photo for analysis.')}</span></label>` : ''}
        </section>
        <p class="phasic-tool-error text-sm empty:hidden" role="alert">${scan.error ? trHtml(scan.error) : ''}</p>
        <button type="button" class="ui-primary-button flex items-center justify-center gap-2" onclick="window.scanAnalyzePhoto()" ${busy || !backend || !scan.photoUrl || !scan.consent ? 'disabled' : ''}>
          <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>${trHtml('Analyze this photo')}
        </button>
        ${state.lastScannedFood && scan.review ? `<button type="button" class="phasic-tool-secondary" onclick="window.scanOpenPendingReview()" ${disabled}>${trHtml('Review current result')}</button>` : ''}
        <button type="button" class="phasic-tool-secondary" onclick="window.scanManualReview()" ${disabled}>${trHtml('Enter nutrition manually')}</button>
        ${scan.photoUrl ? `<button type="button" class="phasic-tool-error text-sm underline min-h-12" onclick="window.scanDiscard()" ${disabled}>${trHtml('Discard photo and result')}</button>` : ''}
        <p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('Photo analysis estimates portions and cooking fats. Check the values before saving; hidden oil quantities may be uncertain.')}</p>
      `}
    </div>`;
}
