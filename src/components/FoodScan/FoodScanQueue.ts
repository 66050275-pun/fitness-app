import { trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
import { foodScanProgressLabel } from '../../utils/foodScanProgress.ts';
import { scanActivityDetail, scanActivityLabel, scanItemStatus, scanQueuePercent } from '../../utils/foodScanQueue.ts';
import type { FoodScanItem } from '../../types/index.ts';

function renderItem(item: FoodScanItem, index: number, canSelect: boolean): string {
  const id = item.id;
  const finished = item.status === 'saved' || item.status === 'skipped';
  const hintEditable = ['ready', 'error', 'needs_choice'].includes(item.status);
  const progress = item.progress;
  const statusIcon: Record<FoodScanItem['status'], string> = { ready: 'image', queued: 'schedule', analyzing: 'progress_activity',
    needs_choice: 'help', review: 'fact_check', error: 'error', saved: 'check_circle', skipped: 'skip_next' };
  return `<article class="phasic-tool-card food-scan-queue-item flex flex-col gap-3" aria-labelledby="scan-item-${id}-title">
    <div class="flex items-start gap-3">
      <div class="min-w-0 flex-1"><h3 id="scan-item-${id}-title" tabindex="-1" class="font-heading font-bold">${trHtml('Photo {0}', index + 1)}</h3>
        <p class="scan-status mt-2" data-status="${item.status}"><span class="material-symbols-outlined" aria-hidden="true">${statusIcon[item.status]}</span>${escapeHtml(scanItemStatus(item))}</p></div>
      ${!finished ? `<button type="button" id="scan-skip-${id}" class="food-scan-skip" onclick="window.scanSkipPhoto('${id}')" aria-label="${trHtml('Skip photo {0}', index + 1)}">
        <span class="material-symbols-outlined" aria-hidden="true">close</span></button>` : ''}
    </div>
    ${item.photoUrl ? `<img src="${escapeHtml(item.photoUrl)}" alt="${trHtml('Food photo {0}', index + 1)}" class="food-scan-queue-photo" />` : ''}
    ${hintEditable ? `<label for="scan-hint-${id}" class="flex flex-col gap-2 text-sm font-heading font-bold">
      ${trHtml('Dish name or clue (optional)')}
      <input id="scan-hint-${id}" type="text" class="ui-field w-full font-sans font-normal" maxlength="160" autocomplete="off"
        value="${escapeHtml(item.dishHint)}" placeholder="${trHtml('For example: papaya salad, no peanuts')}" oninput="window.scanDishHint('${id}',this.value)" />
    </label>` : ''}
    ${item.status === 'analyzing' && progress ? `<div class="food-scan-queue-progress space-y-2">
      <div class="flex gap-2 items-center"><span class="material-symbols-outlined animate-spin text-primary" aria-hidden="true">progress_activity</span>
        <p id="scan-item-${id}-stage" class="flex-1 text-sm">${escapeHtml(foodScanProgressLabel(progress))}</p>
        <span id="scan-item-${id}-percent" class="font-bold tabular-nums shrink-0" aria-hidden="true">${progress.percent}%</span></div>
      <div id="scan-item-${id}-progress" class="food-scan-progress-track" role="progressbar" aria-label="${trHtml('Food analysis progress')}"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}" aria-valuetext="${escapeHtml(`${progress.percent}% · ${foodScanProgressLabel(progress)}`)}">
        <div id="scan-item-${id}-fill" class="food-scan-progress-fill" style="width:${progress.percent}%"></div>
      </div></div>` : ''}
    ${item.status === 'needs_choice' && item.choices ? `<div class="food-scan-choices flex flex-col gap-2">
      <h4 class="font-heading font-bold">${trHtml('Which food is in this photo?')}</h4>
      ${item.choices.question ? `<p class="phasic-tool-muted text-sm">${escapeHtml(item.choices.question)}</p>` : ''}
      <p class="phasic-tool-muted text-sm">${trHtml('Choose one portion. Nutrition is calculated only for your selection.')}</p>
      ${item.choices.candidates.map(candidate => `<button type="button" id="scan-choice-${id}-${candidate.id}" class="food-scan-choice" onclick="window.scanChooseFood('${id}','${candidate.id}')" ${canSelect ? '' : 'disabled'}>
        <span class="material-symbols-outlined text-primary shrink-0" aria-hidden="true">restaurant</span>
        <span class="min-w-0 flex-1 text-left"><span class="block font-heading font-bold">${escapeHtml(candidate.name)}</span>
          <span class="block text-sm phasic-tool-muted">${escapeHtml(candidate.description)}</span>
          ${candidate.reason ? `<span class="block mt-1 text-xs phasic-tool-muted">${escapeHtml(candidate.reason)}</span>` : ''}
        </span><span class="material-symbols-outlined shrink-0" aria-hidden="true">chevron_right</span></button>`).join('')}
      <p class="phasic-tool-muted text-xs">${trHtml('None of these? Add a dish name and retry, or enter nutrition manually.')}</p>
    </div>` : ''}
    ${item.status === 'review' && item.result ? `<p class="font-heading font-bold">${escapeHtml(item.review?.name || item.result.name || '')}</p>
      <button type="button" id="scan-review-photo-${id}" class="ui-primary-button" onclick="window.scanReviewPhoto('${id}')">${trHtml('Review and log this meal')}</button>` : ''}
    ${item.error ? `<p class="phasic-tool-error text-sm" role="alert">${trHtml(item.error)}</p>` : ''}
    ${item.status === 'error' || item.status === 'needs_choice' ? `<div class="scan-primary-actions">
      <button type="button" class="phasic-tool-secondary text-sm" id="scan-retry-${id}" onclick="window.scanRetryPhoto('${id}')" ${canSelect ? '' : 'disabled'}>${trHtml('Retry this photo')}</button>
      <button type="button" class="phasic-tool-secondary text-sm" id="scan-manual-${id}" onclick="window.scanManualReview('${id}')">${trHtml('Enter manually')}</button></div>` : ''}
    ${!finished ? `<button type="button" class="scan-skip-link" onclick="window.scanSkipPhoto('${id}')">${trHtml('Skip this photo / duplicate dish')}</button>` : ''}
  </article>`;
}

export function renderFoodScanQueue(): string {
  const scan = store.getState().foodScan;
  if (!scan.items.length) return '';
  const percent = scanQueuePercent(scan);
  return `<section class="flex flex-col gap-3" aria-label="${trHtml('Food photo queue')}">
    <div class="scan-queue-summary">
      <div class="scan-section-heading"><h2 id="scan-queue-title" tabindex="-1">${trHtml('Food photo queue')}</h2><span class="nutrition-badge">${trHtml('{0} / 5 photos', scan.items.length)}</span></div>
      ${scan.started ? `<div class="scan-section-heading mt-3"><p id="scan-queue-label" class="font-bold text-sm" role="status">${escapeHtml(scanActivityLabel(scan))}</p><span id="scan-queue-percent" class="font-bold ui-number" aria-hidden="true">${percent}%</span></div>
        <div id="scan-queue-progress" class="food-scan-progress-track" role="progressbar" aria-label="${trHtml('Food analysis workflow progress')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}">
          <div id="scan-queue-fill" class="food-scan-progress-fill" style="width:${percent}%"></div></div>
        <p id="scan-queue-detail" class="scan-help">${escapeHtml(scanActivityDetail(scan))}</p>
        <p class="scan-help mt-2">${trHtml('Progress counts handled steps, including errors and skipped photos. Review each result before logging.')}</p>`
        : `<p class="scan-help mt-2">${trHtml('Add a dish clue to help AI identify an unclear photo.')}</p>`}
    </div>
    ${scan.items.map((item, index) => renderItem(item, index, scan.consent)).join('')}
  </section>`;
}
