import { trHtml } from '../../i18n/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
/**
 * Nutrition Goals Sub-Screen
 * 
 * Manages:
 * - Daily calorie target
 * - Protein, Carbs, Fat targets (g)
 * - Water target (ml)
 * - "Calculate Calories from Macros" (4–4–9 formula)
 * - Advanced micronutrient reference info
 * - Reset to defaults with confirmation modal
 */

import { store } from '../../store/appState';

export function renderNutritionGoalsScreen(): string {
  const state = store.getState();
  const goals = state.nutritionGoals || {
    calorieTarget: 2100,
    proteinTarget: 145,
    carbsTarget: 220,
    fatTarget: 70,
    waterTarget: 2000
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
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">${trHtml("Nutrition Goals")}</h1>
        </div>

        <button 
          type="submit" 
          form="nutrition-goals-form"
          class="text-xs font-bold text-white px-4 py-1.5 rounded-full bg-primary hover:brightness-105 active:scale-95 transition-all shadow-xs"
        >
          ${trHtml("Save")}
        </button>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Informational Banner -->
        <div class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 flex items-start gap-3 shadow-ambient">
          <span class="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">track_changes</span>
          <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
            ${trHtml("Targets entered here update your Home dashboard, Diary calorie progress rings, and Insights compliance trends immediately.")}
          </p>
        </div>

        <form id="nutrition-goals-form" onsubmit="event.preventDefault(); window.submitNutritionGoals();" class="flex flex-col gap-4">
          
          <!-- Daily Calories Card -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                ${trHtml("Daily Calorie Target")}
              </span>
              <button 
                type="button"
                onclick="window.syncCaloriesFromMacroTargets()"
                class="px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-container text-[11px] font-bold transition-all flex items-center gap-1"
                title="${trHtml("Calculate calories using 4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat")}"
              >
                <span class="material-symbols-outlined text-[14px]">calculate</span>
                <span>${trHtml("From Macros (4–4–9)")}</span>
              </button>
            </div>

            <div class="relative">
              <input 
                type="number"
                id="goal-calorie-input"
                required
                min="500"
                max="10000"
                value="${escapeHtml(goals.calorieTarget)}"
                class="w-full px-4 py-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-lg font-heading font-extrabold text-primary dark:text-primary-container focus:border-primary focus:outline-none"
              />
              <span class="absolute right-4 top-3 text-xs text-on-surface-variant dark:text-gray-400 font-bold">${trHtml("kcal / day")}</span>
            </div>
          </div>

          <!-- Macronutrient Split Card -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-4">
            <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              ${trHtml("Macronutrient Targets")}
            </span>

            <!-- Protein -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="goal-protein-input" class="text-xs font-semibold text-on-surface dark:text-gray-200 flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                  <span>${trHtml("Daily Protein")}</span>
                </label>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("4 kcal / g")}</span>
              </div>
              <div class="relative">
                <input 
                  type="number"
                  id="goal-protein-input"
                  required
                  min="0"
                  max="1000"
                  value="${escapeHtml(goals.proteinTarget)}"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:border-primary focus:outline-none"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-on-surface-variant dark:text-gray-400 font-bold">${trHtml("g")}</span>
              </div>
            </div>

            <!-- Carbohydrates -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="goal-carbs-input" class="text-xs font-semibold text-on-surface dark:text-gray-200 flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-tertiary inline-block"></span>
                  <span>${trHtml("Daily Carbohydrates")}</span>
                </label>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("4 kcal / g")}</span>
              </div>
              <div class="relative">
                <input 
                  type="number"
                  id="goal-carbs-input"
                  required
                  min="0"
                  max="1000"
                  value="${escapeHtml(goals.carbsTarget)}"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:border-primary focus:outline-none"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-on-surface-variant dark:text-gray-400 font-bold">${trHtml("g")}</span>
              </div>
            </div>

            <!-- Fat -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="goal-fat-input" class="text-xs font-semibold text-on-surface dark:text-gray-200 flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span>${trHtml("Daily Fat")}</span>
                </label>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("9 kcal / g")}</span>
              </div>
              <div class="relative">
                <input 
                  type="number"
                  id="goal-fat-input"
                  required
                  min="0"
                  max="1000"
                  value="${escapeHtml(goals.fatTarget)}"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:border-primary focus:outline-none"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-on-surface-variant dark:text-gray-400 font-bold">${trHtml("g")}</span>
              </div>
            </div>

          </div>

          <!-- Hydration Target Card -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
            <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              ${trHtml("Hydration Target")}
            </span>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="goal-water-input" class="text-xs font-semibold text-on-surface dark:text-gray-200">
                  ${trHtml("Daily Water Volume")}
                </label>
                <span class="text-[10px] text-blue-500 font-semibold" id="water-glasses-preview">
                  ~${Math.round(goals.waterTarget / 250)} ${trHtml("standard glasses")}
                </span>
              </div>
              <div class="relative">
                <input 
                  type="number"
                  id="goal-water-input"
                  required
                  min="500"
                  max="10000"
                  step="50"
                  value="${escapeHtml(goals.waterTarget)}"
                  oninput="document.getElementById('water-glasses-preview').textContent = '~' + Math.round(Number(this.value)/250) + ' standard glasses'"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:border-primary focus:outline-none"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-on-surface-variant dark:text-gray-400 font-bold">${trHtml("ml")}</span>
              </div>
            </div>
          </div>

          <!-- Advanced: Micronutrient References Guidance -->
          <details class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient group">
            <summary class="font-heading text-xs font-bold text-on-surface dark:text-white flex items-center justify-between cursor-pointer list-none">
              <span>${trHtml("Advanced: Micronutrient Reference Preferences")}</span>
              <span class="material-symbols-outlined text-[18px] text-primary transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <div class="pt-3 text-[11px] text-on-surface-variant dark:text-gray-300 leading-relaxed flex flex-col gap-2">
              <p>
                ${trHtml("NutriAI references standard daily nutritional values:")}
              </p>
              <ul class="list-disc pl-4 space-y-1">
                <li><strong>${trHtml("Minimum Targets (DV):")}</strong> ${trHtml("Vitamins A, C, D, E, K, B-complex, and essential minerals like Iron, Calcium, Potassium, Magnesium.")}</li>
                <li><strong>${trHtml("Maximum Limits (UL):")}</strong> ${trHtml("Sodium, Saturated Fat, Added Sugars, and Cholesterol.")}</li>
                <li><strong>${trHtml("Informational:")}</strong> ${trHtml("Total Sugars, Omega-3, Omega-6, and Caffeine.")}</li>
              </ul>
              <p class="text-[10px] text-on-surface-variant/80 dark:text-gray-400">
                ${trHtml("Micronutrient references adapt dynamically based on your logged meals and coverage thresholds.")}
              </p>
            </div>
          </details>

          <!-- Buttons -->
          <div class="flex flex-col gap-2 mt-1">
            <button 
              type="submit" 
              class="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all text-center"
            >
              ${trHtml("Save Nutrition Goals")}
            </button>

            <button 
              type="button"
              onclick="window.confirmResetNutritionGoals()" 
              class="w-full py-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant dark:text-gray-400 text-xs font-bold hover:bg-surface-container-low transition-colors text-center"
            >
              ${trHtml("Reset to Defaults (2,100 kcal)")}
            </button>
          </div>

        </form>

      </main>

    </div>
  `;
}
