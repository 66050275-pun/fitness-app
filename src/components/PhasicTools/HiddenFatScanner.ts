import { tr, trHtml } from '../../i18n/index.ts';
import { getFatGauge, HIDDEN_FAT_PRESETS } from '../../services/phasicRecompService.ts';
import { store } from '../../store/appState.ts';
import { getTodayKey } from '../../utils/dateUtils.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';
import { escapeHtml, htmlJsArg } from '../../utils/sanitize.ts';
import type { HiddenFatEstimateCounts, MealType } from '../../types/index.ts';
import { getFoodAnalysisBackend } from '../../services/foodAnalysisBackend.ts';

const PRESET_ICONS = { oil: 'water_drop', coconut: 'local_drink', dressing: 'restaurant' } as const;

const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function renderSavedEstimate(id: string, time: string, mealType: MealType, counts: HiddenFatEstimateCounts, fatGrams: number): string {
  const description = HIDDEN_FAT_PRESETS.filter(preset => counts[preset.id] > 0)
    .map(preset => trHtml('{0} × {1}', tr(preset.label), formatDisplayNumber(counts[preset.id], 0)))
    .join(' · ');

  return `
    <li class="phasic-tool-card flex items-start gap-3">
      <div class="flex-1 min-w-0">
        <p class="font-heading font-bold text-sm">${trHtml('Cooking-fat estimate')}</p>
        <p class="phasic-tool-muted text-sm mt-1">${trHtml(mealType)} · ${escapeHtml(time)}</p>
        <p class="phasic-tool-muted text-sm mt-1 break-words">${description}</p>
        <p class="font-heading font-bold mt-2">${trHtml('{0} g fat · {1} kcal', formatDisplayNumber(fatGrams), formatDisplayNumber(fatGrams * 9, 0))}</p>
      </div>
      <button type="button" class="phasic-tool-secondary h-12 w-12 shrink-0 rounded-full flex items-center justify-center" onclick="window.phasicRemoveHiddenFat(${htmlJsArg(id)})" aria-label="${trHtml('Remove cooking-fat estimate')}">
        <span class="material-symbols-outlined" aria-hidden="true">delete_outline</span>
      </button>
    </li>
  `;
}

/** Content only: the shared tool modal owns focus, backdrop and scrolling. */
export function renderHiddenFatScanner(): string {
  const today = getTodayKey();
  const state = store.getState();
  const meals = store.getMealsForDate(today);
  const goals = store.getEffectiveNutritionGoals(today);
  const savedEstimates = meals.filter(meal => meal.hiddenFatEstimate);
  const scannedMeals = meals.filter(meal => meal.scanAnalysis);
  const gauge = getFatGauge(meals, today, goals.fatTarget, state.userProfile.dietProgram ?? 'standard', state.userProfile.currentWeightKg ?? null);
  const remaining = gauge.remainingGrams;

  return `
    <div class="flex flex-col gap-4">
      <p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('Scan a meal, review likely cooking fats, and confirm the full nutrition before logging it.')}</p>
      <button type="button" class="ui-primary-button" onclick="window.phasicStartFoodScan()">
        <span class="material-symbols-outlined" aria-hidden="true">photo_camera</span>${trHtml('Scan food and review cooking fat')}
      </button>
      ${!getFoodAnalysisBackend() ? `<p class="phasic-tool-muted text-sm">${trHtml('AI analysis is awaiting backend setup. You can prepare a photo and enter nutrition manually.')}</p>` : ''}
      <section class="flex flex-col gap-3">
        <h3 class="font-heading font-bold text-base">${trHtml('Today’s reviewed food scans')}</h3>
        ${scannedMeals.length ? `<ul class="flex flex-col gap-3">${scannedMeals.map(meal => `
          <li class="phasic-tool-card flex flex-col gap-2">
            <p class="font-heading font-bold text-sm break-words">${escapeHtml(meal.name)}</p>
            <p class="phasic-tool-muted text-sm">${trHtml(meal.scanAnalysis!.source === 'ai_estimate' ? 'AI estimate' : meal.scanAnalysis!.source === 'manual' ? 'Manual nutrition entry' : 'Demo estimate')} · ${trHtml(meal.mealType)}</p>
            <p class="text-sm">${trHtml('Total fat: {0} g', formatDisplayNumber(meal.nutritionSnapshot.fat))}</p>
            <p class="phasic-tool-muted text-sm">${meal.scanAnalysis!.reviewedCookingFatGrams === null ? trHtml('Cooking fat: not estimated')
              : trHtml('{0} g cooking fat included', formatDisplayNumber(meal.scanAnalysis!.reviewedCookingFatGrams))}</p>
            <button type="button" class="phasic-tool-secondary" onclick="window.phasicOpenScanMeal(${htmlJsArg(meal.id)})">${trHtml('View saved analysis')}</button>
          </li>`).join('')}</ul>` : `<p class="phasic-tool-muted text-sm">${trHtml('No reviewed food scans logged today.')}</p>`}
      </section>
      <h3 class="font-heading font-bold text-base">${trHtml('Manual extra-fat estimate')}</h3>
      <div class="phasic-tool-note text-sm leading-relaxed">
        ${trHtml('Use these additions only for fat missing from another meal. Reviewed scan totals already include their cooking fat.')}
      </div>

      <fieldset class="flex flex-col gap-3">
        <legend class="font-heading font-bold text-sm mb-3">${trHtml('Estimated additions')}</legend>
        ${HIDDEN_FAT_PRESETS.map(preset => `
          <div class="phasic-tool-card flex items-center gap-3">
            <span class="material-symbols-outlined text-primary dark:text-primary-fixed shrink-0" aria-hidden="true">${PRESET_ICONS[preset.id]}</span>
            <label class="min-w-0 flex-1" for="phasic-fat-${preset.id}">
              <span class="block font-heading font-bold text-sm">${trHtml(preset.label)}</span>
              <span class="block phasic-tool-muted text-sm mt-1">${trHtml('+{0} g fat each', formatDisplayNumber(preset.fatGrams, 0))}</span>
            </label>
            <input id="phasic-fat-${preset.id}" data-dialog-draft type="number" min="0" max="20" step="1" inputmode="numeric" value="0" oninput="window.phasicRefreshHiddenFat()" class="phasic-tool-input w-16 text-center shrink-0" aria-label="${trHtml('{0} additions', tr(preset.label))}" />
            <button type="button" class="phasic-tool-secondary h-12 w-12 rounded-full flex items-center justify-center shrink-0" onclick="window.phasicAddFatPreset('${preset.id}')" aria-label="${trHtml('Add one {0} estimate', tr(preset.label))}">
              <span class="material-symbols-outlined" aria-hidden="true">add</span>
            </button>
          </div>
        `).join('')}
      </fieldset>

      <label class="flex flex-col gap-2 font-heading font-bold text-sm" for="phasic-fat-meal">
        ${trHtml('Attach estimate to meal')}
        <select id="phasic-fat-meal" data-dialog-draft class="phasic-tool-input w-full">
          ${MEAL_TYPES.map(type => `<option value="${type}" ${type === 'lunch' ? 'selected' : ''}>${trHtml(type)}</option>`).join('')}
        </select>
      </label>

      <section class="phasic-tool-card flex flex-col gap-3" aria-label="${trHtml('Cooking-fat estimate summary')}">
        <div class="grid grid-cols-2 gap-3">
          <div class="min-w-0">
            <p class="phasic-tool-muted text-sm">${trHtml('Added fat')}</p>
            <p id="phasic-fat-estimate" class="font-heading font-extrabold text-2xl mt-1 break-words" aria-live="polite">${trHtml('{0} g', formatDisplayNumber(0))}</p>
          </div>
          <div class="min-w-0">
            <p class="phasic-tool-muted text-sm">${trHtml('Added energy')}</p>
            <p id="phasic-fat-calories" class="font-heading font-extrabold text-2xl mt-1 break-words">${trHtml('{0} kcal', formatDisplayNumber(0, 0))}</p>
          </div>
        </div>
        <div class="border-t border-outline-variant/30 pt-3">
          <p class="phasic-tool-muted text-sm">${trHtml('Strict allowance after this estimate')}</p>
          <p id="phasic-fat-remaining" class="font-heading font-bold mt-1" aria-live="polite">${gauge.overageGrams > 0 ? trHtml('{0} g over the ceiling', formatDisplayNumber(gauge.overageGrams)) : trHtml('{0} g remaining', formatDisplayNumber(remaining))}</p>
          ${gauge.unknownEntryCount ? `<p class="phasic-tool-muted text-sm mt-2">${trHtml('Some logged fat values are unknown. Remaining allowance may be lower.')}</p>` : ''}
        </div>
      </section>
      <p id="phasic-fat-feedback" class="phasic-tool-error text-sm empty:hidden" role="alert"></p>
      <button type="button" class="ui-primary-button" onclick="window.phasicSaveHiddenFat()">
        <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>
        ${trHtml('Add estimate to today')}
      </button>
      <p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('Saving adds fat and its energy to today’s diary. Your daily allowance updates immediately.')}</p>

      <section class="flex flex-col gap-3">
        <h3 class="font-heading font-bold text-base">${trHtml('Today’s cooking-fat estimates')}</h3>
        ${savedEstimates.length
          ? `<ul class="flex flex-col gap-3">${savedEstimates.map(meal => renderSavedEstimate(meal.id, meal.time, meal.mealType, meal.hiddenFatEstimate!, meal.fat)).join('')}</ul>`
          : `<p class="phasic-tool-muted text-sm">${trHtml('No cooking-fat estimates added today.')}</p>`}
      </section>
    </div>
  `;
}
