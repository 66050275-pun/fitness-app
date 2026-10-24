import { trHtml } from '../i18n/index.ts';
import { formatDisplayNumber } from '../utils/safeNumbers.ts';
import { getMealNutrientForDisplay } from '../utils/mealNutritionDisplay.ts';
import { store } from '../store/appState';
import { getWeekDates, formatDiaryDate } from '../utils/dateUtils';
import { renderAppHeader } from '../components/Navigation/AppHeader';
import { renderDiaryWeek, renderDiaryMicros, renderDiaryMeals } from '../components/Food/DiarySections.ts';
import { getFatGauge } from '../services/phasicRecompService.ts';

export function renderDiaryScreen(): string {
  const state = store.getState();
  const date = state.selectedDate;
  const meals = store.getMealsForDate(date);
  const totals = store.getTotals(date);
  const goals = store.getEffectiveNutritionGoals(date);
  const consumed = store.getConsumedCalories(date);
  const weekStart = state.visibleDiaryWeekStart || date;
  const weekCalories = store.getDailyCalorieTotals(getWeekDates(weekStart).map(day => day.dateKey));
  const gauge = Number.isFinite(goals.fatTarget) && goals.fatTarget > 0
    ? getFatGauge(meals, date, goals.fatTarget, state.userProfile.dietProgram ?? 'standard', state.userProfile.currentWeightKg) : null;
  const missingCalories = meals.filter(meal => getMealNutrientForDisplay(meal, 'calories') === null).length;
  const targets = { protein: goals.proteinTarget, carbs: goals.carbsTarget, fat: gauge?.ceilingGrams ?? goals.fatTarget };
  const refeedCalories = Math.max(0, goals.calorieTarget - state.nutritionGoals.calorieTarget);
  return `<div class="nutrition-screen flex flex-col min-h-screen">
    ${renderAppHeader({ state, subtitleType: 'diary', selectedDate: date, showQuickAdd: true })}
    <main class="nutrition-main">
      ${renderDiaryWeek(weekStart, date, weekCalories, key => store.getEffectiveCalorieTarget(key))}
      <section class="nutrition-card" aria-labelledby="diary-summary-title">
        <div class="nutrition-section-heading"><h2 id="diary-summary-title">${trHtml('Nutrition Summary')}</h2><span class="nutrition-help">${trHtml(formatDiaryDate(date))}</span></div>
        <p class="diary-energy ui-number"><strong>${formatDisplayNumber(consumed, 0)}</strong> ${trHtml('kcal')}</p>
        <p class="nutrition-help">${trHtml('Daily target: {0} kcal', formatDisplayNumber(goals.calorieTarget, 0))}</p>
        ${missingCalories ? `<p class="nutrition-info">${trHtml('Known calories only. Missing entries: {0}.', missingCalories)}</p>` : ''}
        <dl class="diary-summary-grid">${(['protein', 'carbs', 'fat'] as const).map(key => {
          const missing = meals.filter(meal => getMealNutrientForDisplay(meal, key) === null).length;
          const amount = meals.length > 0 && missing === meals.length ? null : key === 'fat' ? gauge?.consumedKnownGrams ?? totals.fat : totals[key];
          return `<div><dt>${trHtml(key === 'protein' ? 'Protein' : key === 'carbs' ? 'Carbs' : 'Fat')}</dt><dd><strong class="ui-number">${formatDisplayNumber(amount)} ${trHtml('g')}</strong><p class="nutrition-help">${trHtml('Target: {0} g', formatDisplayNumber(targets[key]))}</p>${missing ? `<p class="nutrition-help">${trHtml('Incomplete data · missing entries: {0}', missing)}</p>` : ''}</dd></div>`;
        }).join('')}<div><dt>${trHtml('Water')}</dt><dd><strong class="ui-number">${formatDisplayNumber(store.getWaterGlasses(date) * 250, 0)} ${trHtml('ml')}</strong><p class="nutrition-help">${trHtml('Target: {0} ml', formatDisplayNumber(goals.waterTarget, 0))}</p></dd></div></dl>
        ${gauge?.usedWeightCap ? `<p class="nutrition-info">${trHtml('Mini Cut uses a daily fat ceiling of {0} g; saved nutrition targets stay unchanged.', formatDisplayNumber(targets.fat))}</p>` : ''}
        ${gauge?.missingWeight ? `<p class="nutrition-info">${trHtml('Add your current weight in Profile to calculate the Mini Cut fat ceiling.')}</p>` : ''}
        ${refeedCalories ? `<p class="nutrition-info">${trHtml('Refeed day: +{0} kcal and +{1} g carbs. Log meals as usual.', formatDisplayNumber(refeedCalories, 0), formatDisplayNumber(goals.carbsTarget - state.nutritionGoals.carbsTarget))}</p>` : ''}
      </section>
      ${renderDiaryMicros(meals)}
      ${renderDiaryMeals(meals, date)}
    </main>
  </div>`;
}
