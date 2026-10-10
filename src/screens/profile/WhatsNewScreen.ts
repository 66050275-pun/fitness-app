import { trHtml } from '../../i18n/index.ts';
/**
 * What's New Sub-Screen
 * 
 * Displays:
 * - App version & release date
 * - Accurate changelog entries matching actual implemented features
 */

import { CHANGELOG, APP_METADATA } from '../../data/appConfig';

export function renderWhatsNewScreen(): string {
  return `
    <div class="flex flex-col min-h-screen pb-16 bg-surface dark:bg-dark-surface transition-colors animate-fade-in">
      
      <!-- App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <button 
            type="button" 
            onclick="window.goBackFromProfileSubpage()" 
            aria-label="${trHtml("Back to Profile")}"
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">${trHtml("What's New")}</h1>
        </div>

        <span class="px-2.5 py-1 rounded-full bg-primary/10 text-primary dark:text-primary-container text-[11px] font-extrabold">
          v${APP_METADATA.version}
        </span>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">
        
        ${CHANGELOG.map(entry => `
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
            
            <div class="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div>
                <h2 class="font-heading font-extrabold text-base text-on-surface dark:text-white">
                  ${entry.title}
                </h2>
                <span class="text-[11px] text-on-surface-variant dark:text-gray-400 block mt-0.5">
                  ${trHtml("Released")} ${entry.releaseDate} ${trHtml("• Build")} ${APP_METADATA.build}
                </span>
              </div>
              
              <span class="px-2 py-0.5 rounded-lg bg-primary text-white text-[10px] font-bold">
                ${trHtml("Latest")}
              </span>
            </div>

            <div class="flex flex-col gap-2 pt-1">
              <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                ${trHtml("Key Highlights")}
              </span>
              <ul class="flex flex-col gap-2">
                ${entry.highlights.map(h => `
                  <li class="flex items-start gap-2.5 text-xs text-on-surface dark:text-gray-200">
                    <span class="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">check_circle</span>
                    <span class="leading-relaxed">${trHtml(h)}</span>
                  </li>
                `).join('')}
              </ul>
            </div>

          </div>
        `).join('')}

      </main>

    </div>
  `;
}
