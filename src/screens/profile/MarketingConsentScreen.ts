/**
 * Marketing Consent Sub-Screen
 * 
 * Manages:
 * - User promotional communication consent (default: false)
 * - Timestamp recording upon modification
 * - Explicit opt-in policy
 */

import { store } from '../../store/appState';

export function renderMarketingConsentScreen(): string {
  const state = store.getState();
  const consent = state.userPreferences?.marketingConsent || false;
  const updatedAt = state.userPreferences?.marketingConsentUpdatedAt;

  let formattedDate = 'Never updated';
  if (updatedAt) {
    try {
      formattedDate = new Date(updatedAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {}
  }

  return `
    <div class="flex flex-col min-h-screen pb-16 bg-surface dark:bg-dark-surface transition-colors animate-fade-in">
      
      <!-- App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <button 
            type="button" 
            onclick="window.goBackFromProfileSubpage()" 
            aria-label="Back to Profile"
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">Marketing Consent</h1>
        </div>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Consent Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-4">
          
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[22px]">campaign</span>
              </div>
              <div>
                <h2 class="font-heading font-bold text-sm text-on-surface dark:text-white leading-tight">
                  Promotional Communications
                </h2>
                <span class="text-[11px] text-on-surface-variant dark:text-gray-400 block mt-0.5">
                  Optional product updates and announcements
                </span>
              </div>
            </div>

            <!-- Toggle Switch -->
            <button 
              type="button"
              onclick="window.toggleMarketingConsent()"
              class="w-12 h-7 rounded-full transition-colors p-1 flex items-center ${consent ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'}"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
            </button>
          </div>

          <!-- Explanation -->
          <div class="pt-3 border-t border-outline-variant/20 text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed flex flex-col gap-2">
            <p>
              By default, NutriAI operates on strict explicit opt-in. We do not transmit marketing messages, promotional offers, or partner bulletins unless you voluntarily activate this setting.
            </p>
            <p>
              You can toggle this permission on or off at any time. Your preference timestamp is recorded locally on this device.
            </p>
          </div>

          <!-- Timestamp status -->
          <div class="p-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-between text-[11px]">
            <span class="text-on-surface-variant dark:text-gray-400">Consent Status:</span>
            <span class="font-bold ${consent ? 'text-primary' : 'text-on-surface dark:text-gray-300'}">
              ${consent ? 'Opted In' : 'Opted Out'}
            </span>
          </div>

          <div class="text-[10px] text-on-surface-variant/70 dark:text-gray-500 text-right">
            Last modified: ${formattedDate}
          </div>

        </div>

      </main>

    </div>
  `;
}
