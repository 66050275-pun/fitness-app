import { foodLabel } from '../../i18n/foodLabels.ts';
import { tr, trHtml } from '../../i18n/index.ts';
/**
 * Set Portion Bottom Sheet Modal
 * 
 * Rules:
 * 1. Opened before Add to Diary from Food Search, Recent Foods, My Foods, Barcode, Scan Result, or Add Again.
 * 2. Displays food name, brand, nutrition basis, quantity input (decimal support), unit selector.
 * 3. Quick portion chips populated from food.portionOptions.
 * 4. Meal type, date, and time selectors.
 * 5. Real-time recalculation of calories, protein, carbs, fat, and micronutrients.
 * 6. Disabled Add to Diary button if quantity <= 0 or invalid conversion.
 */

import { store } from '../../store/appState';
import { htmlJsArg, escapeHtml } from '../../utils/sanitize';
import { getAvailableUnitsForFood } from '../../utils/portionCalculations';
import type { MealType } from '../../types/index.ts';

export function renderSetPortionModal(): string {
  const state = store.getState();
  if (!state.isSetPortionOpen || !state.activePortionFood) {
    return '';
  }

  const food = state.activePortionFood;
  const qty = state.activePortionQuantity;
  const unit = state.activePortionUnit;
  const mealType = state.activePortionMealType;
  const dateVal = state.activePortionDate;
  const timeVal = state.activePortionTime;

  const availableUnits = getAvailableUnitsForFood(food);
  const calcResult = store.calculateSelectedPortionNutrition();
  const errorMsg = calcResult?.error;
  const nutrition = calcResult?.nutrition;

  const calDisplay = nutrition?.calories !== null && nutrition?.calories !== undefined ? `${nutrition.calories}` : '—';
  const proDisplay = nutrition?.protein !== null && nutrition?.protein !== undefined ? `${nutrition.protein} ${trHtml("g")}` : '—';
  const carbDisplay = nutrition?.carbs !== null && nutrition?.carbs !== undefined ? `${nutrition.carbs} ${trHtml("g")}` : '—';
  const fatDisplay = nutrition?.fat !== null && nutrition?.fat !== undefined ? `${nutrition.fat} ${trHtml("g")}` : '—';

  const basisText = food.nutritionBasis.servingDescription 
    ? food.nutritionBasis.servingDescription 
    : tr("per {0} {1}", food.nutritionBasis.amount, food.nutritionBasis.unit);

  const hasMicronutrients = food.nutrition.micronutrients && (
    food.nutrition.micronutrients.vitamins.length > 0 || 
    food.nutrition.micronutrients.minerals.length > 0
  );

  return `
    <div id="set-portion-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-fade-in">
      <div 
        class="w-full max-w-lg max-h-[92vh] flex flex-col bg-surface-container-lowest dark:bg-dark-surface-card rounded-t-[28px] border-t border-outline-variant/30 shadow-modal overflow-hidden animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="set-portion-title"
      >
        <!-- Modal Handle -->
        <div class="pt-3 pb-1 flex justify-center">
          <div class="w-10 h-1 rounded-full bg-outline-variant/40"></div>
        </div>

        <!-- Header -->
        <div class="px-5 py-3 flex items-start justify-between border-b border-outline-variant/20">
          <div class="flex-1 pr-3">
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-primary dark:text-primary-container">
                ${trHtml("Set Portion")}
              </span>
              ${food.brand ? `
                <span class="px-2 py-0.2 rounded-md bg-surface-container-low dark:bg-dark-surface-card-high text-[10px] font-semibold text-on-surface-variant dark:text-gray-300">
                  ${escapeHtml(foodLabel(food, food.brand))}
                </span>
              ` : ''}
            </div>
            <h2 id="set-portion-title" class="font-heading font-extrabold text-base text-on-surface dark:text-white mt-0.5 leading-tight">
              ${escapeHtml(foodLabel(food, food.name))}
            </h2>
            <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">
              ${trHtml("Nutrition basis:")} <span class="font-semibold text-on-surface dark:text-gray-200">${escapeHtml(foodLabel(food, basisText))}</span>
            </p>
          </div>

          <button 
            type="button" 
            onclick="window.closeSetPortionModal()" 
            aria-label="${trHtml("Close")}"
            class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="px-5 py-4 overflow-y-auto flex flex-col gap-4">

          <!-- Quantity & Unit Inputs -->
          <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <label for="set-portion-qty-input" class="text-xs font-bold text-on-surface dark:text-white">
                ${trHtml("Portion Size")}
              </label>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("Decimal supported")}</span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <!-- Quantity Input -->
              <div class="relative">
                <input 
                  type="number" 
                  step="any" 
                  inputmode="decimal" 
                  id="set-portion-qty-input"
                  value="${escapeHtml(qty)}"
                  oninput="window.setPortionQuantity(parseFloat(this.value) || 0)"
                  placeholder="${trHtml("Quantity")}"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-sm font-bold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <!-- Unit Selector Dropdown -->
              <div class="relative">
                <select 
                  id="set-portion-unit-select"
                  onchange="window.setPortionUnit(this.value)"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-sm font-bold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary capitalize appearance-none pr-8"
                >
                  ${availableUnits.map(u => `
                    <option value="${escapeHtml(u)}" ${u === unit ? 'selected' : ''}>${trHtml(u)}</option>
                  `).join('')}
                </select>
                <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            <!-- Quick Portion Option Chips -->
            ${food.portionOptions.length > 0 ? `
              <div class="flex flex-col gap-1.5 pt-1">
                <span class="text-[10px] font-semibold text-on-surface-variant dark:text-gray-400 uppercase tracking-wider">
                  ${trHtml("Quick Portions")}
                </span>
                <div class="flex flex-wrap gap-1.5">
                  ${food.portionOptions.map(opt => `
                    <button 
                      type="button" 
                      onclick="window.setPortionQuickOption(${opt.quantity}, ${htmlJsArg(opt.unit)})"
                      class="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
                        qty === opt.quantity && unit === opt.unit
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container-lowest dark:bg-dark-surface-card text-on-surface dark:text-gray-300 border-outline-variant/40 hover:border-primary/50'
                      }"
                    >
                      ${escapeHtml(foodLabel(food, opt.label))}
                    </button>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Error Banner if conversion not possible -->
            ${errorMsg ? `
              <div class="p-2.5 rounded-xl bg-error/10 border border-error/30 text-error flex items-center gap-2 text-xs">
                <span class="material-symbols-outlined text-[18px]">error</span>
                <span>${trHtml(errorMsg)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Dynamic Nutrition Calculation Card -->
          <div class="p-4 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                ${trHtml("Nutrition for this portion")}
              </span>
              ${hasMicronutrients ? `
                <button 
                  type="button" 
                  onclick="window.openNutrientsFromCatalog(${htmlJsArg(food.id)})"
                  class="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>${trHtml("All Nutrients")}</span>
                  <span class="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              ` : ''}
            </div>

            <div class="grid grid-cols-4 gap-2 text-center pt-1">
              <div class="p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30">
                <span class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400 block uppercase">${trHtml("Calories")}</span>
                <span class="font-heading font-extrabold text-base text-primary dark:text-primary-container block mt-0.5">
                  ${calDisplay}
                </span>
                <span class="text-[9px] text-on-surface-variant dark:text-gray-400">${trHtml("kcal")}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30">
                <span class="text-[10px] font-bold text-primary dark:text-primary-container block uppercase">${trHtml("Protein")}</span>
                <span class="font-heading font-extrabold text-base text-on-surface dark:text-white block mt-0.5">
                  ${proDisplay}
                </span>
              </div>
              <div class="p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30">
                <span class="text-[10px] font-bold text-tertiary dark:text-tertiary-fixed block uppercase">${trHtml("Carbs")}</span>
                <span class="font-heading font-extrabold text-base text-on-surface dark:text-white block mt-0.5">
                  ${carbDisplay}
                </span>
              </div>
              <div class="p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30">
                <span class="text-[10px] font-bold text-amber-500 block uppercase">${trHtml("Fat")}</span>
                <span class="font-heading font-extrabold text-base text-on-surface dark:text-white block mt-0.5">
                  ${fatDisplay}
                </span>
              </div>
            </div>
          </div>

          <!-- Meal Type & Date / Time Configuration -->
          <div class="p-4 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex flex-col gap-3">
            <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              ${trHtml("Log Details")}
            </span>

            <!-- Meal Type Chips -->
            <div class="grid grid-cols-4 gap-1.5">
              ${(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => `
                <button 
                  type="button" 
                  onclick="window.setPortionMealType(${htmlJsArg(type)})"
                  class="py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                    mealType === type 
                      ? 'bg-primary text-white border-primary shadow-xs' 
                      : 'bg-surface-container-lowest dark:bg-dark-surface-card text-on-surface dark:text-gray-300 border-outline-variant/40 hover:border-primary/50'
                  }"
                >
                  ${trHtml(type)}
                </button>
              `).join('')}
            </div>

            <!-- Date and Time pickers -->
            <div class="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label for="set-portion-date" class="text-[10px] font-semibold text-on-surface-variant dark:text-gray-400 block mb-1">
                  ${trHtml("Date")}
                </label>
                <input 
                  type="date" 
                  id="set-portion-date"
                  value="${escapeHtml(dateVal)}"
                  onchange="window.setPortionDate(this.value)"
                  class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label for="set-portion-time" class="text-[10px] font-semibold text-on-surface-variant dark:text-gray-400 block mb-1">
                  ${trHtml("Time")}
                </label>
                <input 
                  type="time" 
                  id="set-portion-time"
                  value="${escapeHtml(timeVal)}"
                  onchange="window.setPortionTime(this.value)"
                  class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

        </div>

        <!-- Footer Action CTA -->
        <div class="p-4 bg-surface-container-lowest dark:bg-dark-surface-card border-t border-outline-variant/20 flex gap-2.5">
          <button 
            type="button" 
            onclick="window.closeSetPortionModal()" 
            class="px-4 py-3 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface dark:text-white hover:bg-surface-container-low transition-colors"
          >
            ${trHtml("Cancel")}
          </button>
          <button 
            type="button" 
            id="set-portion-submit-btn"
            onclick="window.confirmAddPortionToDiary()" 
            ${(errorMsg || qty <= 0) ? 'disabled' : ''}
            class="flex-1 py-3 px-4 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-ambient hover:brightness-105 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <span class="material-symbols-outlined text-[18px]">add_circle</span>
            <span>${trHtml("Add to Diary")}</span>
          </button>
        </div>

      </div>
    </div>
  `;
}
