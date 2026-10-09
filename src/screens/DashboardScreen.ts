import { store } from '../store/appState';
import { formatFriendlyDate, getTodayKey } from '../utils/dateUtils';
import { clampProgressRatio, formatRemainingCalories, safeRatio } from '../utils/safeNumbers';
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
  const proteinRemaining = Math.max(0, Math.round(proteinGoal - totals.protein));
  const coachMessage = dayMeals.length === 0
    ? `No meals logged for this day yet. Add your first meal to start tracking your ${proteinGoal}g protein target.`
    : proteinRemaining > 0
      ? `You have <strong>${proteinRemaining}g protein</strong> remaining toward today's ${proteinGoal}g target.`
      : `You've reached today's ${proteinGoal}g protein target.`;
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
            <span>Nutrition</span>
          </button>
          <button onclick="window.navigateApp('fitness')" class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-on-surface-variant dark:text-gray-400 hover:text-primary font-heading text-xs font-medium transition-all">
            <span class="material-symbols-outlined text-[16px]">fitness_center</span>
            <span>Fitness</span>
          </button>
        </div>

        <div class="flex items-center justify-between -mt-1" style="order: 0;">
          <p class="text-[11px] text-on-surface-variant dark:text-gray-400">
            ${state.dashboardWidgetOrder.length - state.hiddenDashboardWidgets.length} widgets on Home
          </p>
          <button onclick="window.toggleDashboardWidgetDrawer(true)" class="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-dark-surface-card text-primary dark:text-primary-container text-[11px] font-bold border border-outline-variant/30 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[15px]">tune</span>
            Customize
          </button>
        </div>

        <!-- Primary Card: Daily Energy & Circular Calorie Ring -->
        <section style="${widgetStyle('energy')}" class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient relative overflow-hidden">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary-container"></span>
              <h2 class="font-heading text-sm font-bold text-on-surface dark:text-white">Daily Energy Budget</h2>
            </div>
            <span class="text-xs font-semibold text-on-surface-variant dark:text-gray-300 bg-surface-container-low dark:bg-dark-surface-card-high px-2.5 py-0.5 rounded-full border border-outline-variant/30">
              Goal: ${goal.toLocaleString()} kcal
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
                <span class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400 uppercase tracking-wider mt-1">${remainingDisplay.isOver ? 'kcal over' : 'kcal left'}</span>
              </div>
            </div>
          </div>

          <!-- Visual Energy Equation Strip -->
          <div class="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-outline-variant/30">
            <div class="flex flex-col items-center bg-surface-container-low dark:bg-dark-surface-card-high py-2 px-1 rounded-xl">
              <div class="flex items-center gap-1 text-on-surface-variant dark:text-gray-400 mb-0.5">
                <span class="material-symbols-outlined text-[13px]">restaurant</span>
                <span class="text-[11px] font-semibold">Food</span>
              </div>
              <span class="font-heading font-bold text-sm text-on-surface dark:text-white">${consumed}</span>
              <span class="text-[9px] text-on-surface-variant dark:text-gray-400">kcal in</span>
            </div>

            <div class="flex flex-col items-center bg-surface-container-low dark:bg-dark-surface-card-high py-2 px-1 rounded-xl">
              <div class="flex items-center gap-1 text-tertiary dark:text-tertiary-fixed mb-0.5">
                <span class="material-symbols-outlined text-[13px]">fitness_center</span>
                <span class="text-[11px] font-semibold">Exercise</span>
              </div>
              <span class="font-heading font-bold text-sm text-tertiary dark:text-tertiary-fixed">${burned}</span>
              <span class="text-[9px] text-on-surface-variant dark:text-gray-400">kcal out</span>
            </div>

            <div class="flex flex-col items-center bg-[#EAF9F0] dark:bg-primary/20 py-2 px-1 rounded-xl border border-primary-container/20">
              <div class="flex items-center gap-1 text-primary dark:text-primary-container mb-0.5">
                <span class="material-symbols-outlined text-[13px]">flag</span>
                <span class="text-[11px] font-semibold">Net Left</span>
              </div>
              <span class="font-heading font-bold text-sm text-primary dark:text-primary-container">${remainingDisplay.value}</span>
              <span class="text-[9px] text-primary/80 dark:text-primary-container/80">kcal</span>
            </div>
          </div>
        </section>

        <!-- Macronutrients Breakdown Section -->
        <section style="${widgetStyle('macros')}" class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-sm font-bold text-on-surface dark:text-white">Macronutrients</h3>
            <span class="text-xs text-primary dark:text-primary-container font-semibold cursor-pointer" onclick="window.navigateApp('diary')">View Diary &rarr;</span>
          </div>

          <!-- 3 Macro Cards -->
          <div class="grid grid-cols-3 gap-2.5">
            <!-- Protein -->
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl flex flex-col gap-1.5 border border-outline-variant/20">
              <div class="flex justify-between items-center">
                <span class="text-[11px] font-bold text-on-surface-variant dark:text-gray-400">Protein</span>
                <span class="text-[10px] font-bold text-primary dark:text-primary-container">${proteinPct}%</span>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="font-heading text-base font-extrabold text-on-surface dark:text-white">${totals.protein}</span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">/ ${proteinGoal}g</span>
              </div>
              <div class="w-full bg-surface-container-highest dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div class="bg-primary h-full rounded-full transition-all duration-500" style="width: ${proteinPct}%"></div>
              </div>
            </div>

            <!-- Carbs -->
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl flex flex-col gap-1.5 border border-outline-variant/20">
              <div class="flex justify-between items-center">
                <span class="text-[11px] font-bold text-on-surface-variant dark:text-gray-400">Carbs</span>
                <span class="text-[10px] font-bold text-tertiary dark:text-tertiary-fixed">${carbsPct}%</span>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="font-heading text-base font-extrabold text-on-surface dark:text-white">${totals.carbs}</span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">/ ${carbsGoal}g</span>
              </div>
              <div class="w-full bg-surface-container-highest dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div class="bg-tertiary dark:bg-tertiary-fixed h-full rounded-full transition-all duration-500" style="width: ${carbsPct}%"></div>
              </div>
            </div>

            <!-- Fat -->
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl flex flex-col gap-1.5 border border-outline-variant/20">
              <div class="flex justify-between items-center">
                <span class="text-[11px] font-bold text-on-surface-variant dark:text-gray-400">Fat</span>
                <span class="text-[10px] font-bold text-amber-500">${fatPct}%</span>
              </div>
              <div class="flex items-baseline gap-1">
                <span class="font-heading text-base font-extrabold text-on-surface dark:text-white">${totals.fat}</span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">/ ${fatGoal}g</span>
              </div>
              <div class="w-full bg-surface-container-highest dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div class="bg-amber-500 h-full rounded-full transition-all duration-500" style="width: ${fatPct}%"></div>
              </div>
            </div>
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
                <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white">Hydration Level</h4>
                <span class="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded-full">${waterGlasses * 250} ml</span>
              </div>
              <p class="text-[11px] text-on-surface-variant dark:text-gray-400">${waterGlasses} of ${state.waterTarget} glasses consumed</p>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <button onclick="window.removeWater('${selectedDate}')" class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <button onclick="window.addWater('${selectedDate}')" class="w-8 h-8 rounded-full bg-blue-500 text-white shadow-sm flex items-center justify-center active:scale-95 transition-all">
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
                <span class="font-heading font-bold text-xs text-tertiary dark:text-tertiary-fixed tracking-wide uppercase">AI Nutrition Coach</span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">Live</span>
              </div>
              <p class="text-xs text-on-surface dark:text-gray-200 mt-1 leading-relaxed">
                ${coachMessage}
              </p>
              <button onclick="window.navigateApp('coach')" class="mt-2 text-[11px] font-bold text-primary dark:text-primary-container flex items-center gap-1 hover:underline">
                Ask Coach for dinner ideas <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Meals Section for Selected Date -->
        <section style="${widgetStyle('meals')}" class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-sm font-bold text-on-surface dark:text-white">
              ${isToday ? "Today's Meals" : `Meals for ${formatFriendlyDate(selectedDate)}`} (${dayMeals.length})
            </h3>
            <button onclick="window.toggleQuickActions(true)" class="text-xs font-bold text-primary dark:text-primary-container flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[16px]">add</span>
              <span>Log Meal</span>
            </button>
          </div>

          ${dayMeals.length === 0 ? `
            <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-6 rounded-2xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center text-center">
              <span class="material-symbols-outlined text-[24px] text-on-surface-variant mb-1">restaurant</span>
              <p class="text-xs font-bold text-on-surface dark:text-white">No meals recorded yet</p>
              <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">Tap below to add a meal for this day</p>
              <button onclick="window.toggleQuickActions(true)" class="mt-3 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm">
                + Add Food
              </button>
            </div>
          ` : `
            <div class="flex flex-col gap-2">
              ${dayMeals.map(meal => `
                <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center justify-between hover:border-primary/40 transition-all">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-primary dark:text-primary-container">
                      <span class="material-symbols-outlined text-[22px]">${meal.icon}</span>
                    </div>
                    <div>
                      <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white">${meal.name}</h4>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span class="text-[10px] text-on-surface-variant dark:text-gray-400 uppercase tracking-wider">${meal.mealType} &bull; ${meal.time}</span>
                        <span class="text-[10px] text-primary dark:text-primary-container font-semibold">${meal.protein}g P &bull; ${meal.carbs}g C</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="font-heading font-bold text-xs text-on-surface dark:text-white">${meal.calories} <span class="text-[10px] font-normal text-on-surface-variant dark:text-gray-400">kcal</span></span>
                    <button onclick="window.deleteMeal('${meal.id}')" class="text-on-surface-variant hover:text-error p-1 transition-colors">
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
          <section class="w-full max-w-[430px] rounded-t-[28px] bg-surface dark:bg-dark-surface border-t border-outline-variant/30 shadow-2xl px-5 pt-3 pb-8" onclick="event.stopPropagation()" aria-label="Customize Home widgets">
            <div class="w-10 h-1 rounded-full bg-outline-variant/60 mx-auto mb-4"></div>
            <div class="flex items-start justify-between mb-4">
              <div>
                <h2 class="font-heading text-base font-extrabold text-on-surface dark:text-white">Customize Home</h2>
                <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">Move widgets or add and remove them from Home.</p>
              </div>
              <button onclick="window.toggleDashboardWidgetDrawer(false)" class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant" aria-label="Close widget drawer">
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
                      <button onclick="window.moveDashboardWidget('${id}', -1)" ${index === 0 ? 'disabled' : ''} class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant disabled:opacity-25" aria-label="Move ${widget.label} up">
                        <span class="material-symbols-outlined text-[17px]">keyboard_arrow_up</span>
                      </button>
                      <button onclick="window.moveDashboardWidget('${id}', 1)" ${index === state.dashboardWidgetOrder.length - 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant disabled:opacity-25" aria-label="Move ${widget.label} down">
                        <span class="material-symbols-outlined text-[17px]">keyboard_arrow_down</span>
                      </button>
                      <button onclick="window.toggleDashboardWidget('${id}')" class="h-8 min-w-[64px] px-2 rounded-lg text-[10px] font-bold ${hidden ? 'bg-primary text-white' : 'bg-error/10 text-error'}">
                        ${hidden ? 'Add' : 'Remove'}
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
