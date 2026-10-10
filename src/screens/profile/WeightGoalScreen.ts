import { tr, trHtml } from '../../i18n/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
import { htmlJsArg } from '../../utils/sanitize.ts';
/**
 * Weight Goal Sub-Screen
 * 
 * Manages:
 * - Current weight preview
 * - Goal type: Lose, Maintain, Gain
 * - Target weight (with unit conversion)
 * - Target date (optional)
 * - Preferred weekly rate (optional)
 * - Safe rate warning & progress preview
 * - Non-guarantee disclaimer
 */

import { store } from '../../store/appState';
import { kgToLb, formatWeight } from '../../utils/unitConversions';
import { formatWeightChange } from '../../utils/safeNumbers';

export function renderWeightGoalScreen(): string {
  const state = store.getState();
  const profile = state.userProfile;
  const unit = state.userPreferences?.weightUnit || 'kg';

  const currentKg = profile.currentWeightKg || null;
  const goalType = profile.weightGoalType || 'maintain';
  const targetKg = profile.targetWeightKg || null;
  const targetDate = profile.targetDate || '';
  const weeklyRateKg = profile.weeklyGoalRateKg ?? 0;
  const weeklyRateMagnitude = Math.abs(weeklyRateKg);

  let targetDisplay = '';
  if (targetKg) {
    targetDisplay = unit === 'lb' ? String(kgToLb(targetKg)) : String(targetKg);
  }

  // Weight difference calculation
  let diffKg = 0;
  let hasDiff = false;
  if (currentKg && targetKg) {
    diffKg = Math.round((targetKg - currentKg) * 10) / 10;
    hasDiff = true;
  }

  const isAggressive = weeklyRateMagnitude >= 0.75;

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
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">${trHtml("Weight Goal")}</h1>
        </div>

        <button 
          type="submit" 
          form="weight-goal-form"
          class="text-xs font-bold text-white px-4 py-1.5 rounded-full bg-primary hover:brightness-105 active:scale-95 transition-all shadow-xs"
        >
          ${trHtml("Save")}
        </button>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Current Status Banner -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 block">${trHtml("Current Weight")}</span>
            <span class="font-heading font-extrabold text-xl text-on-surface dark:text-white block mt-0.5">
              ${formatWeight(currentKg, unit)}
            </span>
          </div>
          <button 
            type="button" 
            onclick="window.openWeightModal()"
            class="px-3 py-1.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs font-bold text-primary dark:text-primary-container hover:bg-surface-container transition-all"
          >
            ${trHtml("Update Weight")}
          </button>
        </div>

        <form id="weight-goal-form" onsubmit="event.preventDefault(); window.submitWeightGoal();" class="flex flex-col gap-4">
          
          <!-- Goal Type Selection -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
            <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              ${trHtml("Primary Objective")}
            </span>

            <div class="grid grid-cols-3 gap-2">
              ${[
                { type: 'lose', icon: 'trending_down', label: tr("Lose Weight") },
                { type: 'maintain', icon: 'horizontal_rule', label: tr("Maintain") },
                { type: 'gain', icon: 'trending_up', label: tr("Gain Weight") }
              ].map(opt => `
                <button
                  type="button"
                  onclick="window.selectWeightGoalType(${htmlJsArg(opt.type)})"
                  class="p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                    goalType === opt.type 
                      ? 'bg-primary/10 border-primary text-primary dark:text-primary-container shadow-xs font-bold' 
                      : 'bg-surface-container-low dark:bg-dark-surface-card-high border-outline-variant/30 text-on-surface dark:text-gray-300'
                  }"
                >
                  <span class="material-symbols-outlined text-[22px]">${opt.icon}</span>
                  <span class="text-xs">${opt.label}</span>
                </button>
              `).join('')}
            </div>
            <input type="hidden" id="weight-goal-type-input" value="${escapeHtml(goalType)}" />
          </div>

          <!-- Target Weight & Date -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
            <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              ${trHtml("Target Details")}
            </span>

            <!-- Target Weight Input -->
            <div>
              <label for="weight-target-input" class="block text-[11px] font-semibold text-on-surface-variant dark:text-gray-400 mb-1">
                ${trHtml("Target Weight (")}${trHtml(unit)})
              </label>
              <div class="relative">
                <input 
                  type="number" 
                  step="0.1"
                  min="20"
                  max="500"
                  id="weight-target-input"
                  value="${escapeHtml(targetDisplay)}"
                  placeholder="${currentKg ? (unit === 'lb' ? String(kgToLb(currentKg)) : String(currentKg)) : 'e.g. 68.0'}"
                  oninput="window.updateWeightGoalPreview()"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-sm font-heading font-extrabold text-on-surface dark:text-white focus:border-primary focus:outline-none"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-on-surface-variant dark:text-gray-400 font-bold">${trHtml(unit)}</span>
              </div>
            </div>

            <!-- Optional Target Date -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="weight-target-date-input" class="text-[11px] font-semibold text-on-surface-variant dark:text-gray-400">
                  ${trHtml("Target Date")}
                </label>
                <span class="text-[10px] text-on-surface-variant/70 dark:text-gray-500">${trHtml("Optional")}</span>
              </div>
              <input 
                type="date" 
                id="weight-target-date-input"
                value="${escapeHtml(targetDate)}"
                min="${new Date().toISOString().split('T')[0]}"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-medium text-on-surface dark:text-white focus:border-primary focus:outline-none"
              />
            </div>

            <!-- Weekly Rate (if not maintain) -->
            ${goalType !== 'maintain' ? `
              <div>
                <label class="block text-[11px] font-semibold text-on-surface-variant dark:text-gray-400 mb-1.5">
                  ${trHtml("Preferred Weekly Pace")}
                </label>
                <div class="grid grid-cols-3 gap-1.5">
                  ${[
                    { rate: 0.25, label: unit === 'lb' ? tr("0.5 lb") : tr("0.25 kg") },
                    { rate: 0.5, label: unit === 'lb' ? tr("1.1 lb") : tr("0.5 kg") },
                    { rate: 0.75, label: unit === 'lb' ? tr("1.6 lb") : tr("0.75 kg") }
                  ].map(opt => `
                    <button 
                      type="button"
                      onclick="window.selectWeeklyRate(${goalType === 'lose' ? -1 : 1} * ${opt.rate})"
                      class="py-2 px-1 rounded-xl text-xs text-center border transition-all ${weeklyRateMagnitude === opt.rate
                          ? 'bg-primary text-white border-primary font-bold shadow-xs'
                          : 'bg-surface-container-low dark:bg-dark-surface-card-high border-outline-variant/30 text-on-surface dark:text-gray-300'}"
                    >
                      ${opt.label}${trHtml("/wk")}
                    </button>
                  `).join('')}
                </div>
                <input type="hidden" id="weekly-rate-input" value="${escapeHtml(weeklyRateKg)}" />
              </div>
            ` : ''}

          </div>

          <!-- Aggressive Rate Warning Notice -->
          ${isAggressive ? `
            <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
              <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px] shrink-0 mt-0.5">warning</span>
              <p class="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                ${trHtml("Pacing greater than 1.0 kg (2.2 lb) per week is aggressive and may be difficult to sustain. We advise consulting a healthcare professional before pursuing rapid weight changes.")}
              </p>
            </div>
          ` : ''}

          <!-- Progress Preview Card -->
          ${hasDiff ? `
            <div class="p-4 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex flex-col gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                ${trHtml("Progress Preview")}
              </span>
              <div class="flex items-center justify-between text-xs">
                <span class="text-on-surface dark:text-gray-300">${trHtml("Total Change Required:")}</span>
                <span class="font-heading font-extrabold ${diffKg > 0 ? 'text-blue-500' : 'text-primary'}">${formatWeightChange(diffKg, unit)}</span>
              </div>
              ${weeklyRateMagnitude > 0 && Math.abs(diffKg) > 0 ? `
                <div class="flex items-center justify-between text-xs">
                  <span class="text-on-surface dark:text-gray-300">${trHtml("Estimated Timeline:")}</span>
                  <span class="font-bold text-on-surface dark:text-white">
                    ~${Math.ceil(Math.abs(diffKg) / weeklyRateMagnitude)} ${trHtml("weeks at this pace")}
                  </span>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Non-Guarantee Disclaimer -->
          <p class="text-[11px] text-on-surface-variant/80 dark:text-gray-400 leading-relaxed px-1">
            ${trHtml("NutriAI provides general nutritional tracking tools. Weight progression varies based on individual metabolism, body composition, and genetics. No specific outcome is guaranteed.")}
          </p>

          <!-- Save Button -->
          <button 
            type="submit" 
            class="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all text-center mt-1"
          >
            ${trHtml("Save Weight Goal")}
          </button>

        </form>

      </main>

    </div>
  `;
}
