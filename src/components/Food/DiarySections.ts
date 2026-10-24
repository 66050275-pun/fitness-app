import { tr, trHtml, getLocale } from '../../i18n/index.ts';
import { mealLabel, mealDescription, portionLabel } from '../../i18n/foodLabels.ts';
import { escapeHtml, htmlJsArg } from '../../utils/sanitize.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';
import { getMealMicronutrientsForDisplay, getMealNutrientForDisplay } from '../../utils/mealNutritionDisplay.ts';
import { getWeekDates, parseLocalDateKey } from '../../utils/dateUtils.ts';
import { aggregateDailyMicronutrients } from '../../utils/nutrientCalculations.ts';
import { renderCalorieProgressRing } from '../Nutrition/CalorieProgressRing.ts';
import type { MealItem } from '../../types/index.ts';

export function renderDiaryWeek(weekStart: string, selectedDate: string, calories: Record<string, number>, targetFor: (date: string) => number): string {
  const days = getWeekDates(weekStart);
  const first = parseLocalDateKey(days[0].dateKey).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
  return `<section class="diary-week" aria-labelledby="diary-week-title">
    <div class="nutrition-section-heading"><h2 id="diary-week-title">${trHtml('Week of {0}', first)}</h2><div class="diary-week-actions">
      <button id="diary-week-previous" type="button" class="ui-icon-button" onclick="window.goToPreviousWeek()" aria-label="${trHtml('Previous week')}"><span class="material-symbols-outlined" aria-hidden="true">chevron_left</span></button>
      <button id="diary-week-next" type="button" class="ui-icon-button" onclick="window.goToNextWeek()" aria-label="${trHtml('Next week')}"><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>
    </div></div>
    <div id="diary-week-dates" class="diary-week-dates" role="group" aria-label="${trHtml('Choose diary date')}" data-scroll-key="diary-week-${escapeHtml(weekStart)}-${escapeHtml(selectedDate)}">
      ${days.map(day => {
        const consumed = calories[day.dateKey] ?? 0;
        const target = targetFor(day.dateKey);
        const label = `${day.dayName}, ${day.monthName} ${day.dayNum}, ${day.year}. ${tr('{0} of {1} calories logged', formatDisplayNumber(consumed, 0), formatDisplayNumber(target, 0))}${day.isToday ? tr('. Today') : ''}`;
        return `<button id="diary-day-${day.dateKey}" type="button" class="diary-day" aria-pressed="${day.dateKey === selectedDate}" aria-label="${escapeHtml(label)}" onclick="window.selectDate(${htmlJsArg(day.dateKey)})">
          <span>${escapeHtml(day.dayName)}</span><span aria-hidden="true">${renderCalorieProgressRing({ consumed, target, size: 36, strokeWidth: 3, innerContentHtml: `<span class="font-bold">${day.dayNum}</span>` })}</span>
          <span class="diary-today-marker ${day.isToday ? 'is-today' : ''}" aria-hidden="true"></span>
        </button>`;
      }).join('')}
    </div>
  </section>`;
}

export function renderDiaryMicros(meals: MealItem[]): string {
  const summary = aggregateDailyMicronutrients(meals);
  const items = summary.nutrients.map(nutrient => `<div class="diary-micro-item"><h3>${trHtml(nutrient.shortName || nutrient.name)}</h3>
    <p class="ui-number"><strong>${formatDisplayNumber(nutrient.totalAmount, 4)}</strong> ${trHtml(nutrient.unit)}</p>
    ${nutrient.dailyValuePercent != null ? `<p>${formatDisplayNumber(nutrient.dailyValuePercent, 1)} ${trHtml('% DV')}</p>` : ''}
    <p class="nutrition-help">${trHtml(nutrient.mealsReportingCount === 1 ? '{0} meal' : '{0} meals', nutrient.mealsReportingCount)} · ${trHtml(nutrient.statusLabel)}</p>
  </div>`);
  return `<section class="nutrition-card" aria-labelledby="diary-micros-title"><div class="nutrition-section-heading"><h2 id="diary-micros-title">${trHtml('Daily Micronutrient Summary')}</h2>
    <span class="nutrition-badge">${trHtml('{0} of {1} meals with nutrient data', summary.mealsWithMicronutrients, summary.totalMealsInDay)}</span></div>
    ${items.length ? `<div class="diary-micro-grid">${items.slice(0, 6).join('')}</div>${items.length > 6 ? `<details class="diary-more-micros"><summary>${trHtml('Show {0} more nutrients', items.length - 6)}</summary><div class="diary-micro-grid">${items.slice(6).join('')}</div></details>` : ''}`
      : `<p class="nutrition-help">${trHtml(meals.length ? 'No nutrient values recorded for this date.' : 'No meals logged for this date. Log meals to view trace minerals and vitamins.')}</p>`}
    <p class="nutrition-help">${trHtml('Values come from logged portions and may include AI estimates. Missing values are not counted as zero.')}</p>
  </section>`;
}

export function renderDiaryMeals(meals: MealItem[], date: string): string {
  const groups = (['breakfast', 'lunch', 'dinner', 'snack'] as const).filter(type => meals.some(meal => meal.mealType === type));
  return `<section class="diary-meals" aria-labelledby="diary-meals-title"><div class="nutrition-section-heading"><h2 id="diary-meals-title" tabindex="-1">${trHtml('Logged meals: {0}', meals.length)}</h2>
    <button id="diary-scan-food" type="button" class="nutrition-secondary-button" onclick="window.navigateApp('scanner')"><span class="material-symbols-outlined" aria-hidden="true">photo_camera</span>${trHtml('Scan Food')}</button></div>
    ${!meals.length ? `<div class="nutrition-card nutrition-empty"><span class="material-symbols-outlined" aria-hidden="true">restaurant</span><h3>${trHtml('No meals recorded for this date')}</h3><p>${trHtml('Log your meals or scan food to track calories and macros for this day.')}</p>
      <button type="button" class="ui-primary-button" onclick="window.selectDate(${htmlJsArg(date)});window.navigateApp('quickLog')">${trHtml('Quick Log')}</button><button type="button" class="nutrition-secondary-button" onclick="window.toggleQuickActions(true)">${trHtml('Add Food')}</button></div>`
      : groups.map(type => `<section class="diary-meal-group" aria-labelledby="diary-group-${type}"><div class="nutrition-section-heading"><h3 id="diary-group-${type}">${trHtml(type)}</h3>
        <button type="button" class="nutrition-secondary-button" onclick="window.setFoodSearchMealType('${type}');window.navigateApp('foodSearch')" aria-label="${trHtml('Add food to {0}', tr(type))}"><span class="material-symbols-outlined" aria-hidden="true">add</span>${trHtml('Add Food')}</button></div>
        <ul class="diary-meal-list">${meals.filter(meal => meal.mealType === type).map(renderDiaryMeal).join('')}</ul>
      </section>`).join('')}
  </section>`;
}

function renderDiaryMeal(meal: MealItem): string {
  const name = mealLabel(meal, meal.name);
  const profile = getMealMicronutrientsForDisplay(meal);
  const hasMicro = profile && [...profile.vitamins, ...profile.minerals, ...(profile.otherNutrients ?? [])].some(row => row.amount !== null && Number.isFinite(row.amount));
  return `<li class="nutrition-card diary-meal-card"><div class="diary-meal-heading">
    <button id="diary-meal-${escapeHtml(meal.id)}" type="button" class="diary-open-meal" onclick="window.openMealDetail(${htmlJsArg(meal.id)})" aria-label="${trHtml('View meal {0}', name)}">
      <span class="diary-meal-name">${escapeHtml(name)}</span><span class="nutrition-help">${escapeHtml(mealDescription(meal))} · ${escapeHtml(meal.time)}</span>
      <strong class="diary-meal-calories ui-number">${formatDisplayNumber(getMealNutrientForDisplay(meal, 'calories'), 0)} <span>${trHtml('kcal')}</span></strong>
    </button>
    <button type="button" class="ui-icon-button diary-delete" onclick="window.deleteMeal(${htmlJsArg(meal.id)});document.getElementById('diary-meals-title')?.focus({preventScroll:true})" aria-label="${trHtml('Delete {0}', name)}"><span class="material-symbols-outlined" aria-hidden="true">delete_outline</span></button>
    </div>
    ${meal.portion?.servingDescription ? `<p class="nutrition-help">${escapeHtml(portionLabel(meal.portion, meal.foodSource === 'built_in' || meal.foodSource === 'demo'))}</p>` : ''}
    <dl class="diary-meal-macros">${(['protein', 'carbs', 'fat'] as const).map(key => `<div><dt>${trHtml(key === 'protein' ? 'Protein' : key === 'carbs' ? 'Carbs' : 'Fat')}</dt><dd class="ui-number">${formatDisplayNumber(getMealNutrientForDisplay(meal, key))} ${trHtml('g')}</dd></div>`).join('')}</dl>
    <div class="nutrition-section-heading"><div class="diary-meal-badges">${hasMicro ? `<span class="nutrition-badge">${trHtml('Micros')}</span>` : ''}${meal.foodSource === 'ai_estimate' || meal.scanAnalysis?.source === 'ai_estimate' ? `<span class="nutrition-badge">${trHtml('AI ESTIMATE')}</span>` : meal.foodSource === 'demo' ? `<span class="nutrition-badge">${trHtml('DEMO')}</span>` : ''}</div>
      <button type="button" class="nutrition-secondary-button" onclick="window.addAgainMeal(${htmlJsArg(meal.id)})" aria-label="${trHtml('Add {0} again', name)}"><span class="material-symbols-outlined" aria-hidden="true">replay</span>${trHtml('Add Again')}</button>
    </div>
  </li>`;
}
