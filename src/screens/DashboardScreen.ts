import { tr, trHtml } from '../i18n/index.ts';
import { store } from '../store/appState';
import { formatFriendlyDate, getTodayKey } from '../utils/dateUtils';
import { formatDisplayNumber } from '../utils/safeNumbers';
import { getMealNutrientForDisplay } from '../utils/mealNutritionDisplay.ts';
import type { DashboardWidgetId } from '../types/index.ts';
import { renderAppHeader } from '../components/Navigation/AppHeader';
import { getFatGauge } from '../services/phasicRecompService.ts';
import { renderEnergyCard, renderMacrosCard, renderHydrationCard, renderCoachCard, renderMealsCard } from '../components/Dashboard/DashboardWidgets.ts';
import type { DashboardMacro } from '../components/Dashboard/DashboardWidgets.ts';

export function renderDashboardScreen(): string {
  const state = store.getState();
  const selectedDate = state.selectedDate;
  const dayMeals = store.getMealsForDate(selectedDate);
  const totals = store.getTotals(selectedDate);
  const goals = store.getEffectiveNutritionGoals(selectedDate);
  const fatGauge = Number.isFinite(goals.fatTarget) && goals.fatTarget > 0
    ? getFatGauge(dayMeals, selectedDate, goals.fatTarget,
      state.userProfile.dietProgram ?? 'standard', state.userProfile.currentWeightKg)
    : null;
  const targets = { protein: goals.proteinTarget, carbs: goals.carbsTarget, fat: fatGauge?.ceilingGrams ?? goals.fatTarget };
  const macros: DashboardMacro[] = (['protein', 'carbs', 'fat'] as const).map(id => {
    const missing = dayMeals.filter(meal => getMealNutrientForDisplay(meal, id) === null).length;
    return {
      id, label: id === 'protein' ? 'Protein' : id === 'carbs' ? 'Carbs' : 'Fat',
      amount: dayMeals.length > 0 && missing === dayMeals.length ? null
        : id === 'fat' ? fatGauge?.consumedKnownGrams ?? totals.fat : totals[id],
      target: targets[id], missing,
    };
  });
  const fatNote = fatGauge?.missingWeight
    ? tr('Add your current weight in Profile to calculate the Mini Cut fat ceiling.')
    : fatGauge?.usedWeightCap
      ? tr('Mini Cut uses a daily fat ceiling of {0} g; saved nutrition targets stay unchanged.', formatDisplayNumber(targets.fat))
      : '';
  const remainingProtein = Math.max(0, goals.proteinTarget - totals.protein);
  const coachMessage = !Number.isFinite(goals.proteinTarget) || goals.proteinTarget <= 0
    ? tr('Set a protein target in Profile to see your daily summary.')
    : macros[0].missing > 0
    ? tr('Some meals are missing protein data. Check your diary to complete this summary.')
    : dayMeals.length === 0
      ? tr('Add a meal to start tracking your protein target of {0} g.', formatDisplayNumber(goals.proteinTarget))
      : remainingProtein > 0
        ? tr('Protein remaining for this day: {0} g.', formatDisplayNumber(remainingProtein))
        : tr('Protein target reached for this day.');
  const mealTitle = `${selectedDate === getTodayKey() ? tr("Today's Meals") : tr('Meals for {0}', formatFriendlyDate(selectedDate))} (${formatDisplayNumber(dayMeals.length, 0)})`;
  const widgets: Record<DashboardWidgetId, () => string> = {
    energy: () => renderEnergyCard({
      consumed: store.getConsumedCalories(selectedDate), burned: store.getBurnedCalories(selectedDate),
      target: goals.calorieTarget, remaining: store.getNetRemainingCalories(selectedDate),
      missingCalories: dayMeals.filter(meal => getMealNutrientForDisplay(meal, 'calories') === null).length,
      refeedCalories: Math.max(0, goals.calorieTarget - state.nutritionGoals.calorieTarget),
      refeedCarbs: Math.max(0, goals.carbsTarget - state.nutritionGoals.carbsTarget),
    }),
    macros: () => renderMacrosCard(macros, fatNote),
    hydration: () => renderHydrationCard(selectedDate, store.getWaterGlasses(selectedDate), goals.waterTarget),
    coach: () => renderCoachCard(coachMessage),
    meals: () => renderMealsCard(dayMeals, mealTitle),
  };
  const visibleWidgets = state.dashboardWidgetOrder.filter(id => !state.hiddenDashboardWidgets.includes(id));

  return `<div class="dashboard-screen flex flex-col min-h-screen">
    ${renderAppHeader({ state, subtitleType: 'dashboard', selectedDate, showQuickAdd: true })}
    <main class="dashboard-main">
      <nav class="dashboard-tracking-nav" aria-label="${trHtml('Tracking sections')}">
        <button id="dashboard-tab-nutrition" type="button" aria-current="page" onclick="window.navigateApp('dashboard')"><span class="material-symbols-outlined" aria-hidden="true">restaurant</span>${trHtml('Nutrition')}</button>
        <button id="dashboard-tab-fitness" type="button" onclick="window.navigateApp('fitness')"><span class="material-symbols-outlined" aria-hidden="true">fitness_center</span>${trHtml('Fitness')}</button>
      </nav>
      <div class="dashboard-toolbar">
        <p class="dashboard-note">${formatDisplayNumber(visibleWidgets.length, 0)} ${trHtml('widgets on Home')}</p>
        <button id="dashboard-customize" type="button" class="dashboard-text-action" aria-haspopup="dialog" onclick="window.toggleDashboardWidgetDrawer(true)"><span class="material-symbols-outlined" aria-hidden="true">tune</span>${trHtml('Customize')}</button>
      </div>
      ${visibleWidgets.map(id => widgets[id]()).join('')}
      ${visibleWidgets.length === 0 ? `<section class="dashboard-card dashboard-empty"><span class="material-symbols-outlined" aria-hidden="true">widgets</span><h2>${trHtml('Your dashboard is empty')}</h2><p>${trHtml('Choose Customize to show the widgets you want on Home.')}</p><button id="dashboard-restore-widgets" type="button" class="ui-primary-button" onclick="window.toggleDashboardWidgetDrawer(true)">${trHtml('Customize Home')}</button></section>` : ''}
    </main>
  </div>`;
}
