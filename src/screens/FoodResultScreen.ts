import { trHtml } from '../i18n/index.ts';
import { store } from '../store/appState.ts';
import { readReviewNumber, resolveCookingFatDraft, reviewedNutrition } from '../services/foodScanService.ts';
import { getFatGauge } from '../services/phasicRecompService.ts';
import { getTodayKey } from '../utils/dateUtils.ts';
import { formatDisplayNumber } from '../utils/safeNumbers.ts';
import { escapeHtml } from '../utils/sanitize.ts';
import type { MealType } from '../types/index.ts';

import { renderFoodScanHeader } from '../components/FoodScan/FoodScanHeader.ts';
import { renderScanReviewField as field, renderScanReviewErrorSummary } from '../components/FoodScan/FoodScanReviewForm.ts';

export function renderFoodResultScreen(): string {
  const state = store.getState();
  const food = state.lastScannedFood;
  const review = state.foodScan.review;
  const queue = state.foodScan.items;
  const currentIndex = queue.findIndex(item => item.id === state.foodScan.reviewItemId);
  const otherReviews = queue.filter(item => item.status === 'review' && item.id !== state.foodScan.reviewItemId);
  if (!food || !review) return `<div class="food-scan-screen food-scan-layout nutrition-screen min-h-screen flex flex-col">
    ${renderFoodScanHeader('Food scan review', trHtml('No food analysis to review'), true)}<main class="nutrition-main">
    <button type="button" class="ui-primary-button" onclick="window.openScannerMode('food')">${trHtml('Scan Food')}</button></main></div>`;

  let nutrition;
  let cookingGrams = null;
  try { const resolved = resolveCookingFatDraft(review); nutrition = reviewedNutrition(resolved); cookingGrams = readReviewNumber(resolved.cookingFatGrams); }
  catch { nutrition = { calories: null, protein: null, carbs: null, fat: null }; }
  const cooking = food.cookingFat;
  const special = store.isSpecialProgramUnlocked();
  const today = getTodayKey();
  const gauge = getFatGauge(store.getMealsForDate(today), today, store.getEffectiveNutritionGoals(today).fatTarget,
    state.userProfile.dietProgram ?? 'standard', state.userProfile.currentWeightKg);
  const fatBalance = nutrition.fat === null ? null : gauge.ceilingGrams - gauge.consumedKnownGrams - nutrition.fat;
  const cookingKnown = cooking?.estimatedGrams !== null && cooking?.estimatedGrams !== undefined;
  const rangeKnown = cooking?.rangeMinGrams !== null && cooking?.rangeMinGrams !== undefined
    && cooking?.rangeMaxGrams !== null && cooking?.rangeMaxGrams !== undefined;

  return `
    <div class="food-scan-screen food-scan-layout nutrition-screen min-h-screen flex flex-col">
      ${renderFoodScanHeader('Food scan review', currentIndex >= 0 && queue.length > 1
        ? trHtml('Photo {0} of {1}', currentIndex + 1, queue.length) : trHtml('One confirmed meal updates your daily totals.'), true)}
      <main class="nutrition-main">
      <form id="scan-review-form" class="scan-review-form" novalidate onsubmit="event.preventDefault();window.scanSaveReviewedMeal()">
      ${renderScanReviewErrorSummary()}
      ${otherReviews.length ? `<section class="phasic-tool-note text-sm flex flex-col gap-2">
        <p class="font-heading font-bold">${trHtml('Other results ready to review')}</p>
        <div class="flex flex-wrap gap-2">${otherReviews.map(item => `<button type="button" class="phasic-tool-secondary" onclick="window.scanReviewPhoto('${item.id}')">${trHtml('Photo {0}', queue.indexOf(item) + 1)}</button>`).join('')}</div>
      </section>` : ''}
      ${state.foodScan.photoUrl ? `<img src="${escapeHtml(state.foodScan.photoUrl)}" alt="${trHtml('Selected food photo')}" class="food-result-photo w-full rounded-3xl object-contain" />` : ''}
      <section class="phasic-tool-note text-sm flex flex-col gap-2">
        <p class="font-heading font-bold">${trHtml(food.source === 'ai_estimate' ? 'AI estimate' : food.source === 'manual' ? 'Manual nutrition entry' : 'Demo estimate')}</p>
        ${food.analysisProvider ? `<p>${trHtml('Analyzed with {0}', [food.analysisProvider, food.analysisModel].filter(Boolean).join(' · '))}</p>` : ''}
        ${food.confidence !== null ? `<p>${trHtml('Analysis confidence: {0}%', formatDisplayNumber(food.confidence * 100, 0))}</p>` : ''}
        <p>${trHtml(food.source === 'manual' ? 'Enter nutrition for the entire portion. Blank macro values stay unknown.'
          : 'Check the portion, nutrition and cooking-fat assumptions before saving.')}</p>
        ${food.warnings.length ? `<ul class="list-disc pl-5">${food.warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>` : ''}
      </section>

      <section class="phasic-tool-card flex flex-col gap-4">
        <h2 class="font-heading font-bold text-base">${trHtml('Food and portion')}</h2>
        ${field(review, 'name', 'Food name')}
        ${field(review, 'servingDescription', 'Serving description')}
        <p class="phasic-tool-muted text-sm">${trHtml('All nutrition values below describe this entire portion.')}</p>
        ${food.servingWeightGrams !== null ? `<p class="phasic-tool-muted text-sm">${trHtml('Estimated portion weight: {0} g', formatDisplayNumber(food.servingWeightGrams))}</p>` : ''}
      </section>

      <section class="phasic-tool-card flex flex-col gap-4">
        <h2 class="font-heading font-bold text-base">${trHtml('Review nutrition')}</h2>
        <p id="scan-review-nutrition-help" class="scan-help">${trHtml('Enter nutrition for the whole portion above. Leave unknown macros blank; enter 0 only when known to be zero.')}</p>
        <div class="scan-review-grid">
          ${field(review, 'calories', 'Calories (kcal)', true)}
          ${field(review, 'protein', 'Protein (g)', true)}
          ${field(review, 'carbs', 'Carbs (g)', true)}
          ${field(review, 'fat', 'Total fat (g)', true)}
        </div>
        <p class="phasic-tool-muted text-sm">${trHtml('Total fat already includes the cooking-fat estimate. Adjust the portion and totals together if needed.')}</p>
      </section>

      <section class="phasic-tool-card flex flex-col gap-3">
        <div class="flex items-start gap-3"><span class="material-symbols-outlined text-primary shrink-0" aria-hidden="true">manage_search</span>
          <div class="min-w-0"><h2 class="font-heading font-bold text-base">${trHtml('Hidden Fat Scanner')}</h2>
            <p class="phasic-tool-muted text-sm mt-1">${trHtml('Cooking fat is part of the meal’s total fat.')}</p></div></div>
        <p class="font-heading font-bold">${cookingKnown ? trHtml('AI cooking-fat estimate: {0} g', formatDisplayNumber(cooking!.estimatedGrams))
          : trHtml(special ? 'Cooking fat was not estimated. You may enter the included amount yourself.' : 'Cooking fat: not estimated')}</p>
        ${rangeKnown ? `<p class="phasic-tool-muted text-sm">${trHtml('Estimated range: {0}–{1} g', formatDisplayNumber(cooking!.rangeMinGrams), formatDisplayNumber(cooking!.rangeMaxGrams))}</p>` : ''}
        ${cooking?.confidence !== null && cooking?.confidence !== undefined ? `<p class="phasic-tool-muted text-sm">${trHtml('Cooking-fat confidence: {0}%', formatDisplayNumber(cooking.confidence * 100, 0))}</p>` : ''}
        ${cooking?.sources.length ? `<div><h3 class="font-heading font-bold text-sm">${trHtml('Likely cooking-fat sources')}</h3><ul class="phasic-tool-muted text-sm list-disc pl-5 mt-1">${cooking.sources.map(source => `<li>${escapeHtml(source)}</li>`).join('')}</ul></div>` : ''}
        ${cooking?.assumptions.length ? `<div><h3 class="font-heading font-bold text-sm">${trHtml('Analysis assumptions')}</h3><ul class="phasic-tool-muted text-sm list-disc pl-5 mt-1">${cooking.assumptions.map(assumption => `<li>${escapeHtml(assumption)}</li>`).join('')}</ul></div>` : ''}
        ${special ? `
          ${field(review, 'cookingFatGrams', 'Cooking fat included in total (g)', true)}
          ${cookingKnown ? `<div class="food-scan-modes grid grid-cols-3 gap-2" role="group" aria-label="${trHtml('Adjust cooking-fat estimate')}">
            <button type="button" onclick="window.scanCookingPreset('less')">${trHtml('Less oil')}</button>
            <button type="button" onclick="window.scanCookingPreset('regular')">${trHtml('Original estimate')}</button>
            <button type="button" onclick="window.scanCookingPreset('more')">${trHtml('More oil')}</button>
          </div>` : ''}
          <p class="phasic-tool-muted text-sm">${trHtml('Changing a known cooking-fat amount adjusts total fat by the difference and calories by 9 kcal per gram. When no amount is known, enter total fat first and identify the included part.')}</p>
        ` : `<p class="phasic-tool-muted text-sm">${trHtml('Cooking-fat adjustments are available in Special Program.')}</p>`}
        <p id="scan-cooking-total" class="font-heading font-bold text-sm" aria-live="polite">${cookingGrams === null ? trHtml('Not estimated') : trHtml('{0} g included in total fat', formatDisplayNumber(cookingGrams))}</p>
      </section>

      ${food.ingredients.length ? `<section class="phasic-tool-card"><h2 class="font-heading font-bold text-base mb-3">${trHtml('Detected Ingredients')}</h2>
        <div class="flex flex-wrap gap-2">${food.ingredients.map(ingredient => `<span class="rounded-xl px-3 py-2 bg-surface-container-lowest dark:bg-dark-surface-card text-sm">${escapeHtml(ingredient)}</span>`).join('')}</div></section>` : ''}
      ${food.micronutrients ? `<section class="phasic-tool-card space-y-3">
        <button type="button" class="phasic-tool-secondary w-full" onclick="window.openNutrientsFromScanned()">${trHtml('View All Nutrients')}</button>
        <p class="phasic-tool-muted text-sm">${trHtml('{0} of {1} nutrients estimated; the rest are unknown.', [...food.micronutrients.vitamins, ...food.micronutrients.minerals, ...food.micronutrients.otherNutrients].filter(n => n.amount !== null).length, [...food.micronutrients.vitamins, ...food.micronutrients.minerals, ...food.micronutrients.otherNutrients].length)}</p>
        <p class="phasic-tool-muted text-sm">${trHtml('AI nutrient values are estimates for the original analyzed portion. Unknown values stay unavailable and are excluded from totals.')}</p>
      </section>` : ''}

      <section class="phasic-tool-card flex flex-col gap-3">
        <h2 class="font-heading font-bold text-base">${trHtml('Assign to Meal')}</h2>
        <div class="food-scan-modes grid grid-cols-2 gap-2" role="group" aria-label="${trHtml('Assign to Meal')}">
          ${(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => `<button type="button" id="scan-meal-${type}" data-scan-meal="${type}" aria-pressed="${review.mealType === type}" onclick="window.scanReviewMeal('${type}')">${trHtml(type)}</button>`).join('')}
        </div>
      </section>
      <section class="phasic-tool-card flex flex-col gap-3" aria-label="${trHtml('Meal totals to save')}">
        <h2 class="font-heading font-bold text-base">${trHtml('Meal totals to save')}</h2>
        <dl class="scan-review-totals">
          ${(['calories', 'protein', 'carbs', 'fat'] as const).map(key => `<div class="min-w-0">
            <dt>${trHtml({ calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat' }[key])}</dt>
            <dd class="ui-number"><span id="scan-total-${key}" aria-live="polite">${formatDisplayNumber(nutrition[key], key === 'calories' ? 0 : 1)}</span> <span>${trHtml(key === 'calories' ? 'kcal' : 'g')}</span></dd>
          </div>`).join('')}
        </dl>
        <p class="phasic-tool-muted text-sm">${trHtml(special ? 'Today’s strict fat allowance after this meal' : 'Today’s fat allowance after this meal')}</p>
        <p id="scan-fat-balance" class="font-heading font-bold" aria-live="polite">${fatBalance === null ? trHtml('Add total fat to preview today’s allowance.') : trHtml(fatBalance < 0 ? '{0} g over the ceiling' : '{0} g remaining', formatDisplayNumber(Math.abs(fatBalance)))}</p>
        <p class="phasic-tool-muted text-sm">${trHtml('Unknown fat in other logged meals may reduce the remaining allowance.')}</p>
        <p id="scan-review-consistency" class="food-scan-caution text-sm empty:hidden" role="status"></p>
      </section>
      <p id="scan-review-error" class="phasic-tool-error text-sm empty:hidden" role="alert" tabindex="-1"></p>
      <button id="scan-save-meal" type="submit" class="ui-primary-button">${trHtml('Confirm and log today’s meal')}</button>
      <button type="button" class="phasic-tool-secondary" onclick="window.scanOpenQueue()">${trHtml('Back to photo queue')}</button>
      ${currentIndex >= 0 ? `<button type="button" class="scan-skip-link" onclick="window.scanSkipPhoto('${queue[currentIndex].id}')">${trHtml('Skip this photo / duplicate dish')}</button>` : ''}
      <p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('Saves one meal with the reviewed totals and analysis history in your encrypted vault. Check the save indicator for storage completion.')}</p>
      </form>
      </main>
    </div>`;
}
