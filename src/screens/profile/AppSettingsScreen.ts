import { tr, trHtml } from '../../i18n/index.ts';
import { htmlJsArg } from '../../utils/sanitize.ts';
/**
 * App Settings Sub-Screen
 * 
 * Manages:
 * - Theme selection: System, Light, Dark
 * - Preferred units: Weight (kg/lb), Mass (g/oz), Volume (ml/cup)
 * - Calendar week start: Monday / Sunday
 * - Language selector UI
 * - Accessibility toggles: Reduce Motion, Haptic Feedback
 * - Reset local preferences with modal confirmation
 */

import { store } from '../../store/appState';

export function renderAppSettingsScreen(): string {
  const state = store.getState();
  const prefs = state.userPreferences || {
    theme: 'system',
    weightUnit: 'kg',
    heightUnit: 'cm',
    preferredMassUnit: 'g',
    preferredVolumeUnit: 'ml',
    weekStart: 'monday',
    language: 'en',
    reduceMotion: false,
    hapticFeedback: true,
    marketingConsent: false
  };

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
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">${trHtml("App Settings")}</h1>
        </div>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Theme Selection Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-heading font-bold text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              ${trHtml("Appearance Theme")}
            </span>
            <span class="text-[11px] font-semibold text-primary capitalize">
              ${trHtml(prefs.theme.charAt(0).toUpperCase() + prefs.theme.slice(1))} ${trHtml("Mode")}
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2">
            ${[
              { id: 'system', label: tr("System"), icon: 'brightness_auto' },
              { id: 'light', label: tr("Light"), icon: 'light_mode' },
              { id: 'dark', label: tr("Dark"), icon: 'dark_mode' }
            ].map(t => `
              <button 
                type="button"
                onclick="window.setAppTheme(${htmlJsArg(t.id)})"
                class="p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  prefs.theme === t.id 
                    ? 'bg-primary text-white border-primary shadow-xs font-bold' 
                    : 'bg-surface-container-low dark:bg-dark-surface-card-high border-outline-variant/30 text-on-surface dark:text-gray-300 hover:border-primary'
                }"
              >
                <span class="material-symbols-outlined text-[20px]">${t.icon}</span>
                <span class="text-xs">${t.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Preferred Measurement Units Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3.5">
          <span class="font-heading font-bold text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
            ${trHtml("Preferred Units")}
          </span>

          <!-- Weight Unit -->
          <div class="flex items-center justify-between py-1">
            <div>
              <span class="text-xs font-semibold text-on-surface dark:text-gray-200 block">${trHtml("Body Weight")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Diary, history & goals")}</span>
            </div>

            <div class="flex rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 p-0.5">
              <button 
                type="button"
                onclick="window.setAppWeightUnit('kg')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${prefs.weightUnit === 'kg' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
              >
                ${trHtml("Kilograms (kg)")}
              </button>
              <button 
                type="button"
                onclick="window.setAppWeightUnit('lb')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${prefs.weightUnit === 'lb' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
              >
                ${trHtml("Pounds (lb)")}
              </button>
            </div>
          </div>

          <!-- Food Mass Unit -->
          <div class="flex items-center justify-between py-1 border-t border-outline-variant/20 pt-2.5">
            <div>
              <span class="text-xs font-semibold text-on-surface dark:text-gray-200 block">${trHtml("Food Portion Mass")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Grams vs Ounces")}</span>
            </div>

            <div class="flex rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 p-0.5">
              <button 
                type="button"
                onclick="window.setAppMassUnit('g')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${prefs.preferredMassUnit === 'g' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
              >
                ${trHtml("Grams (g)")}
              </button>
              <button 
                type="button"
                onclick="window.setAppMassUnit('oz')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${prefs.preferredMassUnit === 'oz' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
              >
                ${trHtml("Ounces (oz)")}
              </button>
            </div>
          </div>

          <!-- Food Volume Unit -->
          <div class="flex items-center justify-between py-1 border-t border-outline-variant/20 pt-2.5">
            <div>
              <span class="text-xs font-semibold text-on-surface dark:text-gray-200 block">${trHtml("Food Portion Volume")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Milliliters vs Cups")}</span>
            </div>

            <div class="flex rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 p-0.5">
              <button 
                type="button"
                onclick="window.setAppVolumeUnit('ml')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${prefs.preferredVolumeUnit === 'ml' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
              >
                ${trHtml("Milliliters (ml)")}
              </button>
              <button 
                type="button"
                onclick="window.setAppVolumeUnit('cup')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${prefs.preferredVolumeUnit === 'cup' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
              >
                ${trHtml("Cups")}
              </button>
            </div>
          </div>

        </div>

        <!-- Regional & Calendar Settings Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3.5">
          <span class="font-heading font-bold text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
            ${trHtml("Regional & Calendar")}
          </span>

          <!-- Week Starts On -->
          <div class="flex items-center justify-between py-1">
            <div>
              <span class="text-xs font-semibold text-on-surface dark:text-gray-200 block">${trHtml("Week Starts On")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Diary weekly strip anchor")}</span>
            </div>

            <div class="flex rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 p-0.5">
              <button 
                type="button"
                onclick="window.setAppWeekStart('monday')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${prefs.weekStart === 'monday' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
              >
                ${trHtml("Monday")}
              </button>
              <button 
                type="button"
                onclick="window.setAppWeekStart('sunday')"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${prefs.weekStart === 'sunday' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
              >
                ${trHtml("Sunday")}
              </button>
            </div>
          </div>

          <!-- Language Selector -->
          <div class="flex items-center justify-between py-1 border-t border-outline-variant/20 pt-2.5">
            <div>
              <span class="text-xs font-semibold text-on-surface dark:text-gray-200 block">${trHtml("Interface Language")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Current active language")}</span>
            </div>

            <select 
              id="app-language-select"
              onchange="window.setAppLanguage(this.value)"
              class="px-3 py-1.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs font-bold text-on-surface dark:text-white focus:outline-none"
            >
              <option value="en" ${prefs.language === 'en' ? 'selected' : ''}>${trHtml("English")}</option>
              <option value="th" ${prefs.language === 'th' ? 'selected' : ''}>${trHtml("Thai")}</option>
            </select>
          </div>

        </div>

        <!-- Accessibility & System Behavior Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3.5">
          <span class="font-heading font-bold text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
            ${trHtml("Accessibility & Device")}
          </span>

          <!-- Reduce Motion -->
          <div class="flex items-center justify-between py-1">
            <div>
              <span class="text-xs font-semibold text-on-surface dark:text-gray-200 block">${trHtml("Reduce Motion")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Minimize transitional animations")}</span>
            </div>

            <button 
              type="button"
              onclick="window.toggleAppReduceMotion()"
              class="w-12 h-7 rounded-full transition-colors p-1 flex items-center ${prefs.reduceMotion ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'}"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
            </button>
          </div>

          <!-- Haptic Feedback -->
          <div class="flex items-center justify-between py-1 border-t border-outline-variant/20 pt-2.5">
            <div>
              <span class="text-xs font-semibold text-on-surface dark:text-gray-200 block">${trHtml("Haptic Feedback")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Tactile response on button actions")}</span>
            </div>

            <button 
              type="button"
              onclick="window.toggleAppHapticFeedback()"
              class="w-12 h-7 rounded-full transition-colors p-1 flex items-center ${prefs.hapticFeedback ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'}"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
            </button>
          </div>

        </div>

        <!-- Reset Local Preferences -->
        <div class="pt-2">
          <button 
            type="button" 
            onclick="window.confirmResetPreferences()"
            class="w-full py-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant hover:text-error dark:text-gray-400 text-xs font-bold hover:bg-error/5 transition-colors text-center"
          >
            ${trHtml("Reset Preferences to Default")}
          </button>
        </div>

      </main>

    </div>
  `;
}
