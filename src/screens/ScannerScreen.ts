import { getLanguage, trHtml } from '../i18n/index.ts';
import { store } from '../store/appState.ts';
import { getFoodAnalysisBackend } from '../services/foodAnalysisBackend.ts';
import { getFoodAnalysisAccessCode, isFoodAnalysisAccessCodeRequired } from '../services/streamlitFoodAnalysis.ts';
import { escapeHtml } from '../utils/sanitize.ts';
import { renderFoodScanQueue } from '../components/FoodScan/FoodScanQueue.ts';
import { renderFoodScanHeader } from '../components/FoodScan/FoodScanHeader.ts';
import { MAX_SCAN_PHOTOS } from '../utils/foodScanQueue.ts';

export function renderScannerScreen(): string {
  const state = store.getState();
  const scan = state.foodScan;
  const barcode = state.scannerMode === 'barcode';
  const backend = getFoodAnalysisBackend();
  const busy = scan.status === 'preparing' || scan.running;
  const disabled = busy ? 'disabled' : '';
  const readyCount = scan.items.filter(item => item.status === 'ready' && item.photoUrl).length;
  const canAdd = !busy && scan.items.length < MAX_SCAN_PHOTOS;

  return `<div class="food-scan-screen food-scan-layout nutrition-screen min-h-screen flex flex-col">
    ${renderFoodScanHeader('Scan Food', trHtml('Review your meal before logging it.'))}
    <main class="nutrition-main">
    <div class="food-scan-modes flex gap-2" role="group" aria-label="${trHtml('Scanner mode')}">
      <button type="button" id="scan-mode-food" onclick="window.openScannerMode('food')" aria-pressed="${!barcode}">${trHtml('Food photo')}</button>
      <button type="button" id="scan-mode-barcode" onclick="window.openScannerMode('barcode')" aria-pressed="${barcode}">${trHtml('Barcode')}</button>
    </div>
    ${barcode ? `<section class="phasic-tool-card flex flex-col gap-4 text-center">
      <span class="material-symbols-outlined text-5xl text-primary" aria-hidden="true">barcode_scanner</span>
      <h2 class="font-heading font-bold text-lg">${trHtml('Barcode Scanning Prototype')}</h2>
      <p class="phasic-tool-muted text-sm">${trHtml('Camera barcode decoding is a prototype. Search the offline catalog or enter nutrition manually:')}</p>
      <button type="button" class="ui-primary-button" onclick="window.navigateApp('foodSearch')">${trHtml('Search Catalog')}</button>
      <button type="button" class="phasic-tool-secondary" onclick="window.navigateApp('quickLog')">${trHtml('Quick Log')}</button>
    </section>` : `
      ${!scan.items.length ? `<section class="food-scan-photo rounded-3xl overflow-hidden flex flex-col items-center justify-center gap-3 px-6 text-center">
        <span class="material-symbols-outlined text-6xl text-primary" aria-hidden="true">add_photo_alternate</span>
        <h2 class="font-heading font-bold text-lg">${trHtml('Add photos of your meal')}</h2>
        <p class="phasic-tool-muted text-sm">${trHtml('Up to 5 photos. Keep one dish and its whole portion visible in each photo.')}</p></section>` : ''}
      <input id="scan-camera-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onchange="window.scanSelectPhoto(this)" hidden />
      <input id="scan-gallery-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onchange="window.scanSelectPhoto(this)" hidden />
      <div class="scan-primary-actions">
        <button type="button" class="phasic-tool-secondary flex items-center justify-center gap-2" id="scan-take-photo" onclick="window.scanChoosePhoto(true)" ${canAdd ? '' : 'disabled'}>
          <span class="material-symbols-outlined" aria-hidden="true">photo_camera</span>${trHtml('Take photo')}</button>
        <button type="button" class="phasic-tool-secondary flex items-center justify-center gap-2" id="scan-choose-photos" onclick="window.scanChoosePhoto(false)" ${canAdd ? '' : 'disabled'}>
          <span class="material-symbols-outlined" aria-hidden="true">photo_library</span>${trHtml('Choose photos')}</button>
      </div>
      ${scan.status === 'preparing' ? `<p class="flex items-center gap-2 text-sm" role="status"><span class="material-symbols-outlined animate-spin" aria-hidden="true">progress_activity</span>${trHtml('Preparing your photos…')}</p>` : ''}
      <section class="phasic-tool-note text-sm flex flex-col gap-3" aria-labelledby="scan-analysis-title">
        <h2 id="scan-analysis-title" class="font-heading font-bold">${trHtml(backend ? 'AI food analysis' : 'AI analysis is awaiting backend setup.')}</h2>
        <p>${backend ? trHtml('Your photos will be processed by {0}.', backend.label)
          : trHtml('You can prepare a photo and enter nutrition yourself. AI results will become available when the service is connected.')}</p>
        <p>${trHtml('Analysis continues while you use this app. Keep it open and unlocked; closing or locking clears unfinished scans.')}</p>
        <details class="scan-privacy"><summary class="font-heading font-bold">${trHtml('Photo privacy')}</summary>
          <p>${trHtml('Photos and unfinished results stay in memory until you clear this queue, close or lock the app. Saved meals contain nutrition, not photos.')}</p>
          ${backend ? `<p class="mt-2">${escapeHtml(backend.photoProcessingNotice[getLanguage()])}</p>` : ''}</details>
        ${backend ? `${isFoodAnalysisAccessCodeRequired() ? `<label class="flex flex-col gap-2 font-heading font-bold" for="scan-ai-service-code">
          ${trHtml('AI access code')}<input id="scan-ai-service-code" type="password" autocomplete="off" maxlength="256" class="ui-field w-full font-sans font-normal"
            value="${escapeHtml(getFoodAnalysisAccessCode())}" oninput="window.scanAIServiceCode(this.value)" ${disabled} />
          <span class="font-sans font-normal">${trHtml('Use the service code from the app owner. Your vault PIN stays on this device.')}</span></label>` : ''}
          <label class="scan-consent flex items-start gap-3"><input id="scan-upload-consent" type="checkbox" class="h-5 w-5 mt-0.5 shrink-0" onchange="window.scanConsent(this.checked)" ${scan.consent ? 'checked' : ''} ${disabled} />
            <span>${trHtml('I agree to send these food photos for analysis.')}</span></label>` : ''}
      </section>
      <p id="scan-queue-error" class="phasic-tool-error text-sm empty:hidden" role="alert">${scan.error ? trHtml(scan.error) : ''}</p>
      ${readyCount ? `<button type="button" class="ui-primary-button flex items-center justify-center gap-2" id="scan-analyze-photos" onclick="window.scanAnalyzePhoto()" aria-describedby="scan-analysis-explanation" ${busy || !backend || !scan.consent ? 'disabled' : ''}>
        <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>${trHtml('Analyze {0} photo(s)', readyCount)}</button>` : ''}
      ${readyCount ? `<p id="scan-analysis-explanation" class="scan-help">${trHtml(!backend ? 'AI analysis is awaiting backend setup.' : !scan.consent ? 'Agree to photo analysis above to enable AI scanning.' : 'Analysis opens Home; tap the activity card to return to this queue.')}</p>` : ''}
      ${scan.started ? `<button type="button" class="phasic-tool-secondary" onclick="window.navigateApp('dashboard')">${trHtml('Continue on Home')}</button>` : ''}
      ${scan.running ? `<button id="scan-stop-analysis" type="button" class="phasic-tool-secondary" onclick="window.scanCancelAnalysis()">${trHtml('Stop food analysis')}</button>` : ''}
      ${renderFoodScanQueue()}
      <button type="button" class="phasic-tool-secondary" onclick="window.scanManualReview()" ${scan.status === 'preparing' ? 'disabled' : ''}>${trHtml('Enter nutrition manually')}</button>
      ${scan.items.length ? `<button type="button" class="phasic-tool-secondary scan-clear" id="scan-clear-queue" onclick="window.scanDiscard()">${trHtml('Clear photos and unfinished results')}</button>` : ''}
      <p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('Each confirmed photo logs one meal. Skip repeated photos of the same dish to avoid counting it twice.')}</p>
      <p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('Photo analysis estimates portions and cooking fats. Check the values before saving; hidden oil quantities may be uncertain.')}</p>
    `}
    </main>
  </div>`;
}
