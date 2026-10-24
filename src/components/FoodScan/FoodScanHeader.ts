import { trHtml } from '../../i18n/index.ts';

/** Description is already escaped/localized app-owned markup. */
export function renderFoodScanHeader(title: string, description: string, review = false): string {
  return `<header class="nutrition-header sticky top-0">
    <button id="scan-page-back" type="button" class="ui-icon-button" onclick="${review ? 'window.scanOpenQueue()' : "window.navigateApp('dashboard')"}" aria-label="${trHtml(review ? 'Back to photo queue' : 'Back to Dashboard')}">
      <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span></button>
    <div class="nutrition-header-title"><h1>${trHtml(title)}</h1><p>${description}</p></div>
  </header>`;
}
