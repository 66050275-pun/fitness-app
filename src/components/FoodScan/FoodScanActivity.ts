import { trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
import { scanActivityDetail, scanActivityLabel, scanQueuePercent } from '../../utils/foodScanQueue.ts';

/** App-local background activity. Mounted outside transformed screen and below modal/vault layers. */
export function renderFoodScanActivity(): string {
  const { foodScan: scan, currentScreen } = store.getState();
  if (!scan.started || !scan.items.some(item => item.status !== 'saved' && item.status !== 'skipped')
    || ['scanner', 'foodResult', 'onboarding'].includes(currentScreen)) return '';
  const percent = scanQueuePercent(scan);
  const entering = !document.getElementById('food-scan-activity');
  return `<aside id="food-scan-activity" class="food-scan-activity ${entering ? 'food-scan-activity-enter' : ''}" aria-label="${trHtml('Food analysis activity')}">
    <button type="button" class="food-scan-activity-open" onclick="window.scanOpenQueue()" aria-label="${trHtml('Open food analysis queue')}" aria-describedby="scan-activity-label scan-activity-detail scan-activity-progress">
      <span class="food-scan-activity-ring" style="--scan-progress:${percent}%" aria-hidden="true">
        <span id="scan-activity-percent" class="tabular-nums">${percent}%</span>
      </span>
      <span class="min-w-0 flex-1 text-left">
        <span class="block font-heading font-bold text-sm leading-snug" id="scan-activity-label" role="status">${escapeHtml(scanActivityLabel(scan))}</span>
        <span class="block text-xs opacity-80" id="scan-activity-detail">${escapeHtml(scanActivityDetail(scan))}</span>
        <span class="sr-only" id="scan-activity-progress">${percent}%</span>
      </span>
      <span class="material-symbols-outlined shrink-0" aria-hidden="true">chevron_right</span>
    </button>
    ${scan.running ? `<button type="button" onclick="window.scanCancelAnalysis()" class="food-scan-activity-cancel" aria-label="${trHtml('Stop food analysis')}">
      <span class="material-symbols-outlined" aria-hidden="true">close</span></button>` : ''}
  </aside>`;
}

/** Progress does not rerender the user's current screen or any open form. */
export function refreshFoodScanActivity(): void {
  const scan = store.getState().foodScan;
  const percent = scanQueuePercent(scan);
  const activity = document.getElementById('food-scan-activity');
  if (activity) activity.inert = document.documentElement.classList.contains('ui-dialog-open');
  const ring = document.querySelector<HTMLElement>('.food-scan-activity-ring');
  ring?.style.setProperty('--scan-progress', `${percent}%`);
  const label = document.getElementById('scan-activity-label');
  if (label) label.textContent = scanActivityLabel(scan);
  const number = document.getElementById('scan-activity-percent');
  if (number) number.textContent = `${percent}%`;
  const accessibleProgress = document.getElementById('scan-activity-progress');
  if (accessibleProgress) accessibleProgress.textContent = `${percent}%`;
  const detail = document.getElementById('scan-activity-detail');
  if (detail) detail.textContent = scanActivityDetail(scan);
}
