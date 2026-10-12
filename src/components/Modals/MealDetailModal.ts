import { formatDisplayNumber } from '../../utils/safeNumbers.ts';
import { getMealMicronutrientsForDisplay, getMealNutrientForDisplay } from '../../utils/mealNutritionDisplay.ts';
import { mealLabel, mealDescription } from '../../i18n/foodLabels.ts';
import { tr, trHtml } from '../../i18n/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
import { htmlJsArg } from '../../utils/sanitize.ts';
/**
 * Meal Detail Modal
 * 
 * Displayed when the user taps any logged meal card in the Daily Diary.
 * Shows:
 * - Food name & category
 * - Date & Time logged
 * - Energy & macronutrient profile
 * - Ingredients list
 * - Micronutrients breakdown (Vitamins, Minerals, Other)
 * - Source attribution
 * - Delete action
 */

import { store } from '../../store/appState';
import { formatFriendlyDate } from '../../utils/dateUtils';
import { getNutrientReference } from '../../data/nutrientReferenceValues';
import type { NutrientValue } from '../../types/index.ts';



export function renderMealDetailModal(): string {
  const meal = store.getSelectedMealDetail();
  if (!meal) return '';

  const safeName = escapeHtml(mealLabel(meal, meal.name));
  const profile = getMealMicronutrientsForDisplay(meal);
  const isDemo = meal.foodSource === 'demo' || profile?.vitamins.some(v => v.source === 'demo');

  const vitamins = profile?.vitamins.filter(v => v.amount !== null) || [];
  const minerals = profile?.minerals.filter(m => m.amount !== null) || [];
  const otherNutrients = profile?.otherNutrients?.filter(o => o.amount !== null) || [];

  return `
    <div 
      id="meal-detail-modal-backdrop" data-dialog-close="window.closeMealDetail()"
      onclick="if(event.target === this) window.closeMealDetail()"
      class="ui-dialog-layer fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meal-modal-title"
    >
      <div 
        class="ui-dialog-panel w-full max-w-lg mx-auto bg-surface dark:bg-dark-surface rounded-t-3xl border-t border-outline-variant/30 shadow-2xl flex flex-col overflow-hidden"
      >
        <!-- Header -->
        <div class="ui-dialog-header px-5 pt-3 pb-3 border-b border-outline-variant/20 flex flex-col gap-2 shrink-0 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md">
          
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-2xl bg-primary/10 text-primary dark:text-primary-container flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[24px]">${escapeHtml(meal.icon || 'restaurant')}</span>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 id="meal-modal-title" class="font-heading font-bold text-base text-on-surface dark:text-white leading-tight">
                    ${safeName}
                  </h2>
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${isDemo
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                      : 'bg-primary/10 text-primary dark:text-primary-container border-primary/20'}">
                    ${isDemo ? trHtml('DEMO') : trHtml(meal.scanAnalysis?.source === 'ai_estimate' ? 'AI ESTIMATE' : meal.scanAnalysis?.source === 'manual' ? 'MANUAL' : 'LOGGED MEAL')}
                  </span>
                </div>
                <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5 capitalize">
                  ${escapeHtml(mealDescription(meal))} &bull; ${formatFriendlyDate(meal.date)} ${trHtml("at")} ${escapeHtml(meal.time)}
                </p>
              </div>
            </div>

            <button 
              type="button" 
              onclick="window.closeMealDetail()" 
              aria-label="${trHtml("Close Meal Detail")}"
              class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div class="ui-dialog-body px-5 py-4 overflow-y-auto flex flex-col gap-4">
          
          <!-- Energy & Core Macros -->
          <section class="flex flex-col gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              ${trHtml("Macronutrient Breakdown")}
            </span>
            <div class="ui-stat-grid grid grid-cols-4 gap-2">
              <div class="p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-center">
                <span class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400 block uppercase">${trHtml("Energy")}</span>
                <span class="ui-number font-heading font-extrabold text-sm text-primary dark:text-primary-container mt-0.5 block">${formatDisplayNumber(getMealNutrientForDisplay(meal, 'calories'), 0)} ${trHtml("kcal")}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-center">
                <span class="text-[10px] font-bold text-primary dark:text-primary-container block uppercase">${trHtml("Protein")}</span>
                <span class="ui-number font-heading font-extrabold text-sm text-on-surface dark:text-white mt-0.5 block">${formatDisplayNumber(getMealNutrientForDisplay(meal, 'protein'))} ${trHtml("g")}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-center">
                <span class="text-[10px] font-bold text-tertiary dark:text-tertiary-fixed block uppercase">${trHtml("Carbs")}</span>
                <span class="ui-number font-heading font-extrabold text-sm text-on-surface dark:text-white mt-0.5 block">${formatDisplayNumber(getMealNutrientForDisplay(meal, 'carbs'))} ${trHtml("g")}</span>
              </div>
              <div class="p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-center">
                <span class="text-[10px] font-bold text-amber-500 block uppercase">${trHtml("Fat")}</span>
                <span class="ui-number font-heading font-extrabold text-sm text-on-surface dark:text-white mt-0.5 block">${formatDisplayNumber(getMealNutrientForDisplay(meal, 'fat'))} ${trHtml("g")}</span>
              </div>
            </div>
          </section>

          ${meal.scanAnalysis ? `
            <section class="phasic-tool-card flex flex-col gap-3">
              <h3 class="font-heading font-bold text-base">${trHtml('Saved scan analysis')}</h3>
              <p class="phasic-tool-muted text-sm">${trHtml('Cooking fat is included in the recorded total, with no separate addition.')}</p>
              <p class="text-sm">${meal.scanAnalysis.reviewedCookingFatGrams === null ? trHtml('Cooking fat: not estimated')
                : trHtml('{0} g cooking fat included', formatDisplayNumber(meal.scanAnalysis.reviewedCookingFatGrams))}</p>
              ${meal.scanAnalysis.source === 'ai_estimate' ? `
                <p class="phasic-tool-muted text-sm">${trHtml('Original AI portion: {0}', meal.scanAnalysis.originalServingDescription)}</p>
                <div class="overflow-x-auto"><table class="w-full text-sm text-left">
                  <caption class="sr-only">${trHtml('Original estimate and saved nutrition')}</caption>
                  <thead><tr><th class="py-2 pr-2">${trHtml('Nutrient')}</th><th class="py-2 pr-2">${trHtml('Original estimate')}</th><th class="py-2">${trHtml('Saved')}</th></tr></thead>
                  <tbody>${(['calories', 'protein', 'carbs', 'fat'] as const).map(key => `<tr>
                    <th class="py-2 pr-2 font-medium">${trHtml({ calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat' }[key])}</th>
                    <td class="py-2 pr-2">${formatDisplayNumber(meal.scanAnalysis!.originalNutrition[key], key === 'calories' ? 0 : 1)}</td>
                    <td class="py-2">${formatDisplayNumber(getMealNutrientForDisplay(meal, key), key === 'calories' ? 0 : 1)} ${trHtml(key === 'calories' ? 'kcal' : 'g')}</td>
                  </tr>`).join('')}</tbody>
                </table></div>
                <p class="phasic-tool-muted text-sm">${trHtml('Original AI total fat: {0} g', formatDisplayNumber(meal.scanAnalysis.originalNutrition.fat))}</p>
                <p class="phasic-tool-muted text-sm">${trHtml('Original AI cooking fat: {0} g', formatDisplayNumber(meal.scanAnalysis.originalCookingFat?.estimatedGrams ?? null))}</p>
                ${meal.scanAnalysis.confidence !== null ? `<p class="phasic-tool-muted text-sm">${trHtml('Analysis confidence: {0}%', formatDisplayNumber(meal.scanAnalysis.confidence * 100, 0))}</p>` : ''}
              ` : ''}
              ${meal.scanAnalysis.editedFields.length ? `<p class="phasic-tool-muted text-sm">${trHtml('Edited before saving: {0}', meal.scanAnalysis.editedFields.map(field => tr({ name: 'Food name', servingDescription: 'Serving description', calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Total fat (g)', cookingFatGrams: 'Cooking fat included in total (g)' }[field])).join(' · '))}</p>` : ''}
              ${meal.scanAnalysis.source === 'ai_estimate' && meal.scanAnalysis.editedFields.includes('servingDescription') && profile ? `<p class="phasic-tool-muted text-sm">${trHtml('Micronutrients refer to the original analyzed portion and were not rescaled after editing.')}</p>` : ''}
              ${meal.scanAnalysis.originalCookingFat?.assumptions.length ? `<ul class="phasic-tool-muted text-sm list-disc pl-5">${meal.scanAnalysis.originalCookingFat.assumptions.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>` : ''}
              ${meal.scanAnalysis.warnings.length ? `<ul class="phasic-tool-muted text-sm list-disc pl-5">${meal.scanAnalysis.warnings.map(text => `<li>${escapeHtml(text)}</li>`).join('')}</ul>` : ''}
            </section>
          ` : ''}

          <!-- Ingredients -->
          ${meal.ingredients && meal.ingredients.length > 0 ? `
            <section class="flex flex-col gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                ${trHtml("Ingredients (")}${meal.ingredients.length})
              </span>
              <div class="flex flex-wrap gap-1.5">
                ${meal.ingredients.map(ing => `
                  <span class="px-2.5 py-1 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs text-on-surface dark:text-gray-200 font-medium">
                    ${escapeHtml(mealLabel(meal, ing))}
                  </span>
                `).join('')}
              </div>
            </section>
          ` : ''}

          <!-- Micronutrients Section -->
          <section class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-heading font-bold text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                  ${trHtml("Micronutrients & Minerals")}
                </h3>
                <p class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("Recorded nutritional trace profile")}</p>
              </div>
              ${profile ? `
                <button 
                  type="button"
                  onclick="window.openNutrientsFromMeal(${htmlJsArg(meal.id)})"
                  class="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5"
                >
                  <span>${trHtml("Full Table")}</span>
                  <span class="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              ` : ''}
            </div>

            ${!profile || (vitamins.length === 0 && minerals.length === 0 && otherNutrients.length === 0) ? `
              <div class="p-4 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high border border-dashed border-outline-variant/40 text-center">
                <span class="material-symbols-outlined text-[24px] text-on-surface-variant mb-1 block">info</span>
                <p class="text-xs text-on-surface dark:text-white font-semibold">${trHtml("No micronutrient profile recorded")}</p>
                <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">
                  ${trHtml('No detailed micronutrient values were provided for this meal.')}
                </p>
              </div>
            ` : `
              <!-- Quick Grid of reported micronutrients -->
              <div class="grid grid-cols-2 gap-2">
                ${[...vitamins, ...minerals, ...otherNutrients].slice(0, 8).map(n => renderMiniNutrientCard(n)).join('')}
              </div>

              ${isDemo ? `
                <p class="text-[10px] text-amber-700 dark:text-amber-400 italic">
                  ${trHtml("* Sample micronutrient profile for UI preview.")}
                </p>
              ` : ''}
            `}
          </section>

        </div>

        <!-- Footer Actions -->
        <div class="ui-dialog-footer p-4 border-t border-outline-variant/20 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md flex items-center gap-2">
          <button 
            type="button" 
            onclick="window.deleteMeal(${htmlJsArg(meal.id)}); window.closeMealDetail();"
            class="px-4 py-2.5 rounded-xl bg-error/10 text-error font-heading font-bold text-xs hover:bg-error/20 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
            <span>${trHtml("Remove Meal")}</span>
          </button>
          
          <button 
            type="button" 
            onclick="window.closeMealDetail()" 
            class="flex-1 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface dark:text-white font-heading font-bold text-xs border border-outline-variant/30 active:scale-95 transition-all"
          >
            ${trHtml("Close")}
          </button>
        </div>

      </div>
    </div>
  `;
}

function renderMiniNutrientCard(n: NutrientValue): string {
  const config = getNutrientReference(n.key);
  const safeName = trHtml(n.name);
  const amountStr = n.amount !== null ? `${formatDisplayNumber(n.amount, 4)} ${trHtml(n.unit)}` : '—';
  const hasDV = config?.hasDailyValuePercent ?? (n.dailyValuePercent !== null && n.dailyValuePercent !== undefined);

  return `
    <div class="p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 shadow-xs flex items-center justify-between">
      <div>
        <span class="text-[11px] font-bold text-on-surface dark:text-white block leading-tight">${safeName}</span>
        <span class="text-[10px] font-extrabold text-primary dark:text-primary-container mt-0.5 block">${amountStr}</span>
      </div>
      ${hasDV && n.dailyValuePercent !== null && n.dailyValuePercent !== undefined ? `
        <span class="ui-number text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary dark:text-primary-container">
          ${formatDisplayNumber(n.dailyValuePercent, 1)}${trHtml("% DV")}
        </span>
      ` : ''}
    </div>
  `;
}
