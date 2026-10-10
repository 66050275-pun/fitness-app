import { trHtml } from '../../i18n/index.ts';
/**
 * Data & Privacy Sub-Screen
 * 
 * Manages:
 * - Local storage explanation
 * - JSON Data Export
 * - Granular deletion:
 *   - Delete food history
 *   - Delete workout history
 *   - Delete weight history
 *   - Delete all local data (with typing "DELETE" requirement)
 */

import { store } from '../../store/appState';

export function renderDataPrivacyScreen(): string {
  const state = store.getState();
  const mealCount = state.meals.length;
  const workoutCount = state.workoutHistory.length;
  const weightCount = state.weightHistory.length;
  const customFoodCount = state.customFoods.length;

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
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">${trHtml("Data & Privacy")}</h1>
        </div>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div>
            <h2 class="font-heading font-bold text-sm text-on-surface dark:text-white">${trHtml("Goal Setup")}</h2>
            <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-1">${trHtml("Review your onboarding answers or run the goal setup again. Existing history is preserved until you explicitly delete it.")}</p>
          </div>
          <button type="button" onclick="window.restartGoalSetup()" class="w-full min-h-11 px-3 rounded-xl border border-primary/30 text-primary dark:text-primary-container text-xs font-bold flex items-center justify-between">
            <span>${trHtml("Review or Restart Goal Setup")}</span><span class="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>

        <!-- Local Storage Architecture Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div>
              <h2 class="font-heading font-bold text-sm text-on-surface dark:text-white">
                ${trHtml("Encrypted Browser Vault")}
              </h2>
              <span class="text-[11px] text-on-surface-variant dark:text-gray-400 block mt-0.5">
                ${trHtml("Passphrase protected • No user cloud database")}
              </span>
            </div>
          </div>

          <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed pt-1 border-t border-outline-variant/20">
            ${trHtml("Your profile, health records, feedback drafts and photo are encrypted before they are saved in this browser. The passphrase is not saved or sent to a server. While unlocked, this app and anyone using your device can access your data. Use Lock when finished. Hosting providers still receive normal page requests and network metadata.")}
          </p>

          <!-- Storage Statistics Matrix -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-between text-xs">
              <span class="text-on-surface-variant dark:text-gray-400">${trHtml("Meals Logged:")}</span>
              <span class="font-bold text-on-surface dark:text-white">${mealCount}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-between text-xs">
              <span class="text-on-surface-variant dark:text-gray-400">${trHtml("Workouts:")}</span>
              <span class="font-bold text-on-surface dark:text-white">${workoutCount}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-between text-xs">
              <span class="text-on-surface-variant dark:text-gray-400">${trHtml("Weight Entries:")}</span>
              <span class="font-bold text-on-surface dark:text-white">${weightCount}</span>
            </div>
            <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-between text-xs">
              <span class="text-on-surface-variant dark:text-gray-400">${trHtml("Custom Foods:")}</span>
              <span class="font-bold text-on-surface dark:text-white">${customFoodCount}</span>
            </div>
          </div>
        </div>

        <!-- Export Data Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="font-heading font-bold text-sm text-on-surface dark:text-white">
                ${trHtml("Export Local Backup")}
              </h2>
              <span class="text-[11px] text-on-surface-variant dark:text-gray-400 block mt-0.5">
                ${trHtml("Download a passphrase protected archive, including your photo")}
              </span>
            </div>
            <div class="w-9 h-9 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-[20px]">download</span>
            </div>
          </div>

          <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
            ${trHtml("The backup stays encrypted with your current passphrase. Keep the passphrase separately: there is no password recovery. Restore from the unlock screen on a browser without an existing vault. Clearing browser storage, private browsing or changing the app URL can make local data unavailable.")}
          </p>

          <button 
            type="button" 
            onclick="window.exportAppData()"
            class="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:brightness-105 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">file_download</span>
            <span>${trHtml("Export Encrypted Backup")}</span>
          </button>
        </div>

        <!-- Danger Zone: Granular Deletion Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-error/30 shadow-ambient flex flex-col gap-3.5">
          <div class="flex items-center gap-2 text-error">
            <span class="material-symbols-outlined text-[20px]">delete_forever</span>
            <span class="font-heading font-bold text-xs uppercase tracking-wider">
              ${trHtml("Data Management & Deletion")}
            </span>
          </div>

          <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
            ${trHtml("Selectively clear specific historical records while preserving your profile, or reset all local application data. Your vault passphrase remains in use. Deletions cannot be undone; downloaded backups are not erased.")}
          </p>

          <!-- Granular Delete Buttons -->
          <div class="flex flex-col gap-2 pt-1">
            <button 
              type="button"
              onclick="window.confirmDeleteFoodHistory()"
              class="w-full py-2.5 px-3 rounded-xl border border-outline-variant/30 hover:border-error/50 text-left flex items-center justify-between text-xs font-bold text-on-surface dark:text-gray-200 hover:bg-error/5 transition-colors"
            >
              <span>${trHtml("Delete Food & Diary History (")}${mealCount} ${trHtml("items)")}</span>
              <span class="material-symbols-outlined text-[18px] text-error">delete</span>
            </button>

            <button 
              type="button"
              onclick="window.confirmDeleteWorkoutHistory()"
              class="w-full py-2.5 px-3 rounded-xl border border-outline-variant/30 hover:border-error/50 text-left flex items-center justify-between text-xs font-bold text-on-surface dark:text-gray-200 hover:bg-error/5 transition-colors"
            >
              <span>${trHtml("Delete Workout History (")}${workoutCount} ${trHtml("workouts)")}</span>
              <span class="material-symbols-outlined text-[18px] text-error">delete</span>
            </button>

            <button 
              type="button"
              onclick="window.confirmDeleteWeightHistory()"
              class="w-full py-2.5 px-3 rounded-xl border border-outline-variant/30 hover:border-error/50 text-left flex items-center justify-between text-xs font-bold text-on-surface dark:text-gray-200 hover:bg-error/5 transition-colors"
            >
              <span>${trHtml("Delete Weight History (")}${weightCount} ${trHtml("records)")}</span>
              <span class="material-symbols-outlined text-[18px] text-error">delete</span>
            </button>

            <button 
              type="button"
              onclick="window.confirmDeleteAllLocalData()"
              class="w-full py-2.5 px-3 rounded-xl bg-error/10 border border-error/30 text-left flex items-center justify-between text-xs font-bold text-error hover:bg-error/20 transition-colors mt-1"
            >
              <span>${trHtml("Delete All Local Data (Complete Reset)")}</span>
              <span class="material-symbols-outlined text-[18px] text-error">warning</span>
            </button>
          </div>
        </div>

      </main>

    </div>
  `;
}
