import { trHtml } from '../../i18n/index.ts';

/** Actions must be trusted app-owned markup, never a food name or search result. */
export function renderFoodEntryHeader(title: string, description: string, actionHtml = ''): string {
  return `<header class="nutrition-header sticky top-0">
    <button id="food-entry-back" type="button" class="ui-icon-button" onclick="window.navigateApp('dashboard')" aria-label="${trHtml('Back to Dashboard')}"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span></button>
    <div class="nutrition-header-title"><h1>${trHtml(title)}</h1><p>${trHtml(description)}</p></div>
    ${actionHtml ? `<div class="nutrition-header-actions">${actionHtml}</div>` : ''}
  </header>`;
}
