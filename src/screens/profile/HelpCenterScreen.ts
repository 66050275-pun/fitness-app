import { trHtml } from '../../i18n/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
/**
 * Help Center Sub-Screen
 * 
 * Manages:
 * - In-app FAQ Accordion covering 6 fundamental topics
 * - Real-time FAQ search filter
 * - Accessible details/summary disclosure controls
 */

import { HELP_CENTER_FAQS } from '../../data/appConfig';

export function renderHelpCenterScreen(): string {
  return `
    <div class="profile-help flex flex-col min-h-screen pb-16 bg-surface dark:bg-dark-surface transition-colors animate-fade-in">
      
      <!-- App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <button 
            type="button" 
            onclick="window.goBackFromProfileSubpage()" 
            aria-label="${trHtml("Back to Profile")}"
            id="help-back" class="ui-icon-button shrink-0"
          >
            <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">${trHtml("Help Center")}</h1>
        </div>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Search Bar -->
        <label for="faq-search-input" class="font-bold text-sm">${trHtml('Search help topics')}</label>
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" aria-hidden="true">search</span>
          <input 
            type="text" 
            id="faq-search-input"
            oninput="window.filterFaqList(this.value)"
            placeholder="${trHtml("Search help topics...")}"
            class="ui-field w-full pl-10 pr-4 py-3"
          />
        </div>

        <!-- FAQ Accordion List -->
        <div id="faq-list-container" class="flex flex-col gap-2.5">
          ${HELP_CENTER_FAQS.map((faq, idx) => `
            <details 
              id="faq-item-${faq.id}"
              class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl border border-outline-variant/30 shadow-ambient overflow-hidden group transition-colors"
              ${idx === 0 ? 'open' : ''}
            >
              <summary class="px-4 py-3.5 flex items-center justify-between cursor-pointer list-none select-none hover:bg-surface-container-low/50 dark:hover:bg-dark-surface-card-high/50 transition-colors">
                <div class="flex items-center gap-2.5 flex-1 pr-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                  <span class="font-heading font-bold text-xs text-on-surface dark:text-white leading-snug">
                    ${escapeHtml(faq.question)}
                  </span>
                </div>
                <span class="material-symbols-outlined text-[20px] text-on-surface-variant group-open:rotate-180 transition-transform shrink-0">
                  expand_more
                </span>
              </summary>

              <div class="px-4 pb-4 pt-1 text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed border-t border-outline-variant/10">
                ${escapeHtml(faq.answer)}
              </div>
            </details>
          `).join('')}
        </div>

      </main>

    </div>
  `;
}
