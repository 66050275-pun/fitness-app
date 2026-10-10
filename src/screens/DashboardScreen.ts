import { mealLabel } from '../i18n/foodLabels.ts';
import { tr, trHtml } from '../i18n/index.ts';
import { escapeHtml } from '../utils/sanitize.ts';
import { htmlJsArg } from '../utils/sanitize.ts';
import { store } from '../store/appState';
import { formatFriendlyDate, getTodayKey } from '../utils/dateUtils';
import { clampProgressRatio, formatDisplayNumber, formatRemainingCalories, safeRatio } from '../utils/safeNumbers';
import type { DashboardWidgetId } from '../types/index.ts';
import { renderAppHeader } from '../components/Navigation/AppHeader';

const DASHBOARD_WIDGETS: Record<DashboardWidgetId, { label: string; icon: string }> = {
  energy: { label: 'Daily Energy Budget', icon: 'bolt' },
  macros: { label: 'Macronutrients', icon: 'donut_large' },
  hydration: { label: 'Hydration', icon: 'water_drop' },
  coach: { label: 'AI Nutrition Coach', icon: 'auto_awesome' },
  meals: { label: 'Today’s Meals', icon: 'restaurant' }
};

export function renderDashboardScreen(): string {
  const state = store.getState();
  const selectedDate = state.selectedDate;
  const todayKey = getTodayKey();
  const isToday = selectedDate === todayKey;

  const consumed = store.getConsumedCalories(selectedDate);
  const remaining = store.getNetRemainingCalories(selectedDate);
  const remainingDisplay = formatRemainingCalories(remaining);
  const totals = store.getTotals(selectedDate);
  const goal = state.calorieTarget;
  const burned = store.getBurnedCalories(selectedDate);
  const waterGlasses = store.getWaterGlasses(selectedDate);
  const dayMeals = store.getMealsForDate(selectedDate);

  // Calorie ring calculation
  const radius = 66;
  const circumference = 2 * Math.PI * radius; // ~414.69
  const progressRatio = clampProgressRatio(safeRatio(consumed, goal));
  const strokeDashoffset = circumference * (1 - progressRatio);

  // Macro progress percentages from dynamic nutrition goals
  const proteinGoal = state.nutritionGoals?.proteinTarget || 145;
  const carbsGoal = state.nutritionGoals?.carbsTarget || 220;
  const fatGoal = state.nutritionGoals?.fatTarget || 70;
  const proteinPct = Math.round(clampProgressRatio(safeRatio(totals.protein, proteinGoal)) * 100);
  const carbsPct = Math.round(clampProgressRatio(safeRatio(totals.carbs, carbsGoal)) * 100);
  const fatPct = Math.round(clampProgressRatio(safeRatio(totals.fat, fatGoal)) * 100);
  const macroCards = [
    { label: 'Protein', amount: totals.protein, target: proteinGoal, percent: proteinPct,
      text: 'text-primary dark:text-primary-container', bar: 'bg-primary' },
    { label: 'Carbs', amount: totals.carbs, target: carbsGoal, percent: carbsPct,
      text: 'text-tertiary dark:text-tertiary-fixed', bar: 'bg-tertiary dark:bg-tertiary-fixed' },
    { label: 'Fat', amount: totals.fat, target: fatGoal, percent: fatPct,
      text: 'text-amber-500', bar: 'bg-amber-500' },
  ];
  const proteinRemaining = Math.max(0, Math.round(proteinGoal - totals.protein));
  const coachMessage = dayMeals.length === 0
    ? tr("No meals logged for this day yet. Add your first meal to start tracking your {0}g protein target.", formatDisplayNumber(proteinGoal))
    : proteinRemaining > 0
      ? `${trHtml("You have")} <strong>${proteinRemaining}${trHtml("g protein")}</strong> ${trHtml("remaining toward today's")} ${formatDisplayNumber(proteinGoal)}${trHtml("g target.")}`
      : tr("You've reached today's {0}g protein target.", formatDisplayNumber(proteinGoal));
  const widgetOrder = new Map(state.dashboardWidgetOrder.map((id, index) => [id, index + 1]));
  const widgetStyle = (id: DashboardWidgetId) => state.hiddenDashboardWidgets.includes(id)
    ? 'display: none;'
    : `order: ${widgetOrder.get(id) || 1};`;

  return `
    <div class="flex flex-col min-h-screen pb-28 bg-surface dark:bg-dark-surface transition-colors">
      
      ${renderAppHeader({
        state,
        subtitleType: 'dashboard',
        selectedDate,
        showQuickAdd: true,
      })}

      <!-- Main Scrollable Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-3">
        
        <!-- Segmented Control: Nutrition vs Fitness -->
        <div class="w-full bg-surface-container-low dark:bg-dark-surface-card p-1 rounded-full flex items-center border border-outline-variant/30 shadow-sm">
          <button class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-surface-container-lowest dark:bg-dark-surface-card-high text-primary dark:text-primary-container shadow-sm font-heading text-xs font-bold transition-all">
            <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">restaurant</span>
            <span>${trHtml("Nutrition")}</span>
          </button>
          <button onclick="window.navigateApp('fitness')" class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-on-surface-variant dark:text-gray-400 hover:text-primary font-heading text-xs font-medium transition-all">
            <span class="material-symbols-outlined text-[16px]">fitness_center</span>
            <span>${trHtml("Fitness")}</span>
          </button>
        </div>

        <div class="flex items-center justify-between -mt-1" style="order: 0;">
          <p class="text-[11px] text-on-surface-variant dark:text-gray-400">
            ${state.dashboardWidgetOrder.length - state.hiddenDashboardWidgets.length} ${trHtml("widgets on Home")}
          </p>
          <button onclick="window.toggleDashboardWidgetDrawer(true)" class="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-dark-surface-card text-primary dark:text-primary-container text-[11px] font-bold border border-outline-variant/30 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[15px]">tune</span>
            ${trHtml("Customize")}
          </button>
        </div>

        <!-- Primary Card: Daily Energy & Circular Calorie Ring -->
        <section style="${widgetStyle('energy')}" class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary-container"></span>
              <h2 class="font-heading text-sm font-bold text-on-surface dark:text-white">${trHtml("Daily Energy Budget")}</h2>
            </div>
            <span class="ui-number text-xs font-semibold text-on-surface-variant dark:text-gray-300 bg-surface-container-low dark:bg-dark-surface-card-high px-2.5 py-0.5 rounded-full border border-outline-variant/30">
              ${trHtml("Goal:")} ${formatDisplayNumber(goal, 0)} ${trHtml("kcal")}
            </span>
          </div>

          <!-- Circular Progress Ring SVG -->
          <div class="flex flex-col items-center justify-center my-3">
            <div class="relative w-44 h-44 flex items-center justify-center">
              <svg class="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <!-- Background Track -->
                <circle cx="80" cy="80" fill="transparent" r="66" stroke="#EAF9F0" class="dark:stroke-dark-border" stroke-width="12"></circle>
                <!-- Gradient Stroke Progress -->
                <defs>
                  <linearGradient id="energyGrad" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stop-color="#35C76F"></stop>
                    <stop offset="100%" stop-color="#27C4B2"></stop>
                  </linearGradient>
                </defs>
                <circle 
                  class="custom-ring-glow transition-all duration-700 ease-out" 
                  cx="80" cy="80" 
                  fill="transparent" 
                  r="66" 
                  stroke="url(#energyGrad)" 
                  stroke-dasharray="${circumference}" 
                  stroke-dashoffset="${strokeDashoffset}" 
                  stroke-linecap="round" 
                  stroke-width="12">
                </circle>
              </svg>
              
              <!-- Center Metric Content -->
              <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span class="material-symbols-outlined text-primary-container text-[20px] mb-0.5" style="font-variation-settings: 'FILL' 1;">bolt</span>
                <span class="font-display text-3xl font-extrabold text-on-surface dark:text-white leading-none">${remainingDisplay.value}</span>
                <span class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400 uppercase tracking-wider mt-1">${remainingDisplay.isOver ? tr("kcal over") : tr("kcal left")}</span>
              </div>
            </div>
          </div>

          <!-- Visual Energy Equation Strip -->
          <div class="ui-number-grid grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-outline-variant/30">
            <div class="flex flex-col items-center bg-surface-container-low dark:bg-dark-surface-card-high py-2 px-1 rounded-xl">
              <div class="flex items-center gap-1 text-on-surface-variant dark:text-gray-400 mb-0.5">
                <span class="material-symbols-outlined text-[13px]">restaurant</span>
                <span class="text-[11px] font-semibold">${trHtml("Food")}</span>
              </div>
              <span class="ui-number font-heading font-bold text-sm text-on-surface dark:text-white">${formatDisplayNumber(consumed, 0)}</span>
              <span class="text-[9px] text-on-surface-variant dark:text-gray-400">${trHtml("kcal in")}</span>
            </div>

            <div class="flex flex-col items-center bg-surface-container-low dark:bg-dark-surface-card-high py-2 px-1 rounded-xl">
              <div class="flex items-center gap-1 text-tertiary dark:text-tertiary-fixed mb-0.5">
                <span class="material-symbols-outlined text-[13px]">fitness_center</span>
                <span class="text-[11px] font-semibold">${trHtml("Exercise")}</span>
              </div>
              <span class="ui-number font-heading font-bold text-sm text-tertiary dark:text-tertiary-fixed">${formatDisplayNumber(burned, 0)}</span>
              <span class="text-[9px] text-on-surface-variant dark:text-gray-400">${trHtml("kcal out")}</span>
            </div>

            <div class="flex flex-col items-center bg-[#EAF9F0] dark:bg-primary/20 py-2 px-1 rounded-xl border border-primary-container/20">
              <div class="flex items-center gap-1 text-primary dark:text-primary-container mb-0.5">
                <span class="material-symbols-outlined text-[13px]">flag</span>
                <span class="text-[11px] font-semibold">${trHtml("Net Left")}</span>
              </div>
              <span class="font-heading font-bold text-sm text-primary dark:text-primary-container">${remainingDisplay.value}</span>
              <span class="text-[9px] text-primary/80 dark:text-primary-container/80">${trHtml("kcal")}</span>
            </div>
          </div>
        </section>

        <!-- Macronutrients Breakdown Section -->
        <section style="${widgetStyle('macros')}" class="macro-summary bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-heading text-sm font-bold text-on-surface dark:text-white">${trHtml("Macronutrients")}</h3>
            <button type="button" class="text-xs text-primary dark:text-primary-container font-semibold" onclick="window.navigateApp('diary')">${trHtml("View Diary &rarr;")}</button>
          </div>

          <!-- 3 Macro Cards -->
          <div class="macro-grid grid grid-cols-3 gap-2.5">
            ${macroCards.map(macro => `
              <div class="macro-card min-w-0 bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl flex flex-col gap-1.5 border border-outline-variant/20">
                <div class="macro-card-heading flex flex-wrap items-baseline justify-between gap-x-1 gap-y-0.5">
                  <span class="min-w-0 max-w-full text-[11px] font-bold text-on-surface-variant dark:text-gray-400 [overflow-wrap:anywhere]">${trHtml(macro.label)}</span>
                  <span class="shrink-0 text-[10px] font-bold ${macro.text}">${macro.percent}%</span>
                </div>
                <div class="macro-card-reading min-w-0 flex flex-col gap-0.5">
                  <span class="ui-number font-heading text-base font-extrabold text-on-surface dark:text-white">${formatDisplayNumber(macro.amount)}</span>
                  <span class="ui-number text-[10px] text-on-surface-variant dark:text-gray-400">/ ${formatDisplayNumber(macro.target)} ${trHtml("g")}</span>
                </div>
                <div class="macro-card-track mt-auto w-full bg-surface-container-highest dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div class="${macro.bar} h-full rounded-full transition-all duration-500" style="width: ${macro.percent}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Hydration Tracker Card -->
        <section style="${widgetStyle('hydration')}" class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">water_drop</span>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white">${trHtml("Hydration Level")}</h4>
                <span class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded-full">${waterGlasses * 250} ${trHtml("ml")}</span>
              </div>
              <p class="text-[11px] text-on-surface-variant dark:text-gray-400">${waterGlasses} ${trHtml("of")} ${state.waterTarget} ${trHtml("glasses consumed")}</p>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button onclick="window.removeWater(${htmlJsArg(selectedDate)})" class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <button onclick="window.addWater(${htmlJsArg(selectedDate)})" class="w-8 h-8 rounded-full bg-blue-500 text-white shadow-sm flex items-center justify-center active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        </section>

        <!-- AI Intelligent Insight Banner -->
        <section style="${widgetStyle('coach')}" class="p-4 rounded-2xl bg-gradient-to-r from-[#effdf4] to-[#e6f8f5] dark:from-dark-surface-card dark:to-dark-surface-card-high border border-tertiary-container/40 ai-luminescence relative overflow-hidden">
          <div class="flex items-start gap-3 relative z-10">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-tertiary text-white flex items-center justify-center shadow-md shrink-0 mt-0.5">
              <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <span class="font-heading font-bold text-xs text-tertiary dark:text-tertiary-fixed tracking-wide uppercase">${trHtml("AI Nutrition Coach")}</span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("Live")}</span>
              </div>
              <p class="text-xs text-on-surface dark:text-gray-200 mt-1 leading-relaxed">
                ${coachMessage}
              </p>
              <button onclick="window.navigateApp('coach')" class="mt-2 text-[11px] font-bold text-primary dark:text-primary-container flex items-center gap-1 hover:underline">
                ${trHtml("Ask Coach for dinner ideas")} <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Meals Section for Selected Date -->
        <section style="${widgetStyle('meals')}" class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-sm font-bold text-on-surface dark:text-white">
              ${isToday ? tr("Today's Meals") : tr("Meals for {0}", formatFriendlyDate(selectedDate))} (${dayMeals.length})
            </h3>
            <button onclick="window.toggleQuickActions(true)" class="text-xs font-bold text-primary dark:text-primary-container flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>${trHtml("Log Meal")}</span>
            </button>
          </div>

          ${dayMeals.length === 0 ? `
            <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-6 rounded-2xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center text-center">
              <span class="material-symbols-outlined text-[24px] text-on-surface-variant mb-1">restaurant</span>
              <p class="text-xs font-bold text-on-surface dark:text-white">${trHtml("No meals recorded yet")}</p>
              <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Tap below to add a meal for this day")}</p>
              <button onclick="window.toggleQuickActions(true)" class="mt-3 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm">
                ${trHtml("+ Add Food")}
              </button>
            </div>
          ` : `
            <div class="flex flex-col gap-2">
              ${dayMeals.map(meal => `
                <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center justify-between hover:border-primary/40 transition-all">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-primary dark:text-primary-container">
                      <span class="material-symbols-outlined text-[22px]">${escapeHtml(meal.icon)}</span>
                    </div>
                    <div>
                      <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white">${escapeHtml(mealLabel(meal, meal.name))}</h4>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[10px] text-on-surface-variant dark:text-gray-400 uppercase tracking-wider">${trHtml(meal.mealType)} &bull; ${escapeHtml(meal.time)}</span>
                        <span class="ui-number text-[10px] text-primary dark:text-primary-container font-semibold">${formatDisplayNumber(meal.protein)} ${trHtml("g P •")} ${formatDisplayNumber(meal.carbs)} ${trHtml("g C")}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="ui-number font-heading font-bold text-xs text-on-surface dark:text-white">${formatDisplayNumber(meal.calories, 0)} <span class="text-[10px] font-normal text-on-surface-variant dark:text-gray-400">${trHtml("kcal")}</span></span>
                    <button onclick="window.deleteMeal(${htmlJsArg(meal.id)})" class="text-on-surface-variant hover:text-error p-1 transition-colors">
                      <span class="material-symbols-outlined text-[16px]">delete_outline</span>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </section>

      </main>

      ${state.dashboardWidgetDrawerOpen ? `
        <div class="fixed inset-0 z-[80] flex items-end justify-center bg-black/35 backdrop-blur-[2px]" onclick="window.toggleDashboardWidgetDrawer(false)">
          <section class="w-full max-w-[430px] rounded-t-[28px] bg-surface dark:bg-dark-surface border-t border-outline-variant/30 shadow-2xl px-5 pt-3 pb-8" onclick="event.stopPropagation()" aria-label="${trHtml("Customize Home widgets")}">
            <div class="w-10 h-1 rounded-full bg-outline-variant/60 mx-auto mb-4"></div>
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 class="font-heading text-base font-extrabold text-on-surface dark:text-white">${trHtml("Customize Home")}</h2>
                <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Move widgets or add and remove them from Home.")}</p>
              </div>
              <button onclick="window.toggleDashboardWidgetDrawer(false)" class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant" aria-label="${trHtml("Close widget drawer")}">
                <span class="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div class="flex flex-col gap-2">
              ${state.dashboardWidgetOrder.map((id, index) => {
                const widget = DASHBOARD_WIDGETS[id];
                const hidden = state.hiddenDashboardWidgets.includes(id);
                return `
                  <div class="flex items-center gap-3 p-3 rounded-2xl border ${hidden ? 'border-dashed border-outline-variant/50 bg-surface-container-low/60 opacity-75' : 'border-outline-variant/30 bg-surface-container-lowest dark:bg-dark-surface-card'}">
                    <span class="material-symbols-outlined text-[19px] text-primary dark:text-primary-container">${widget.icon}</span>
                    <span class="flex-1 font-heading text-xs font-bold text-on-surface dark:text-white">${widget.label}</span>
                    <div class="flex items-center gap-1">
                      <button onclick="window.moveDashboardWidget(${htmlJsArg(id)}, -1)" ${index === 0 ? 'disabled' : ''} class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant disabled:opacity-25" aria-label="${trHtml("Move {0} up", widget.label)}">
                        <span class="material-symbols-outlined text-[17px]">keyboard_arrow_up</span>
                      </button>
                      <button onclick="window.moveDashboardWidget(${htmlJsArg(id)}, 1)" ${index === state.dashboardWidgetOrder.length - 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant disabled:opacity-25" aria-label="${trHtml("Move {0} down", widget.label)}">
                        <span class="material-symbols-outlined text-[17px]">keyboard_arrow_down</span>
                      </button>
                      <button onclick="window.toggleDashboardWidget(${htmlJsArg(id)})" class="h-8 min-w-[64px] px-2 rounded-lg text-[10px] font-bold ${hidden ? 'bg-primary text-white' : 'bg-error/10 text-error'}">
                        ${hidden ? tr("Add") : tr("Remove")}
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </section>
        </div>
      ` : ''}

    </div>
  `;
}
