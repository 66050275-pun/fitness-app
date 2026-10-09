import { escapeHtml } from '../utils/sanitize.ts';
import { htmlJsArg } from '../utils/sanitize.ts';
/**
 * Daily Nutrition Diary Screen
 * 
 * Features:
 * - Dynamic Date Navigation (Multi-year, past months, device timezone safe).
 * - Clickable Header Date dropdown opening Calendar Date Picker bottom sheet.
 * - Weekly Date Strip anchored to selectedDate with Prev/Next week navigation.
 * - Calorie Progress Rings around each date (SVG circular progress, no % numbers).
 * - Nutrition Summary with responsive macro stats & daily calorie ring.
 * - Authentic empty states for dates without logged meals or micronutrients.
 */

import { store } from '../store/appState';
import { 
  getWeekDates, 
  formatDiaryDate
} from '../utils/dateUtils';
import { aggregateDailyMicronutrients } from '../utils/nutrientCalculations';
import { renderCalorieProgressRing } from '../components/Nutrition/CalorieProgressRing';
import { renderAppHeader } from '../components/Navigation/AppHeader';

export function renderDiaryScreen(): string {
  const state = store.getState();
  const selectedDate = state.selectedDate;

  const totals = store.getTotals(selectedDate);
  const consumed = store.getConsumedCalories(selectedDate);
  const dayMeals = store.getMealsForDate(selectedDate);
  const waterGlasses = store.getWaterGlasses(selectedDate);
  const calorieTarget = state.calorieTarget || 2100;

  // Weekly Date Strip powered by visibleDiaryWeekStart (anchored to selectedDate)
  const visibleWeekStart = state.visibleDiaryWeekStart || selectedDate;
  const weekDays = getWeekDates(visibleWeekStart);
  const weekDateKeys = weekDays.map(d => d.dateKey);
  const dailyCalories = store.getDailyCalorieTotals(weekDateKeys);

  const microSummary = aggregateDailyMicronutrients(dayMeals);
  return `
    <div class="flex flex-col min-h-screen pb-28 bg-surface dark:bg-dark-surface transition-colors">
      
      ${renderAppHeader({
        state,
        subtitleType: 'diary',
        selectedDate,
        showQuickAdd: true,
      })}

      <!-- Anchored Weekly Date Strip with Prev / Next Week Navigation -->
      <div class="px-screen-gutter py-2.5 bg-surface-container-low dark:bg-dark-surface-card border-b border-outline-variant/30 flex items-center justify-between gap-1">
        <!-- Previous Week Button -->
        <button 
          type="button" 
          onclick="window.goToPreviousWeek()" 
          aria-label="Previous week"
          class="w-7 h-12 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container dark:hover:bg-dark-surface-card-high flex items-center justify-center shrink-0 transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>

        <!-- 7 Days with Calorie Progress Rings (No % numbers displayed) -->
        <div class="flex-1 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
          ${weekDays.map(day => {
            const isSelected = day.dateKey === selectedDate;
            const dayConsumed = dailyCalories[day.dateKey] || 0;

            const dayAriaLabel = `${day.dayName}, ${day.monthName} ${day.dayNum}, ${day.year}. ${
              dayConsumed > 0 
                ? `${dayConsumed.toLocaleString()} of ${calorieTarget.toLocaleString()} calories logged` 
                : (calorieTarget > 0 ? `0 of ${calorieTarget.toLocaleString()} calories logged` : 'calorie target unavailable')
            }${day.isToday ? '. Today' : ''}${isSelected ? '. Selected' : ''}`;

            return `
              <button 
                type="button" 
                onclick="window.selectDate(${htmlJsArg(day.dateKey)})"
                aria-label="${dayAriaLabel}"
                class="flex flex-col items-center py-1.5 px-1 rounded-2xl min-w-[42px] transition-all relative ${
                  isSelected 
                    ? 'bg-surface-container-lowest dark:bg-dark-surface-card shadow-xs ring-1 ring-primary/40' 
                    : 'text-on-surface-variant dark:text-gray-400 hover:bg-surface-container dark:hover:bg-dark-surface-card-high'
                }"
              >
                <!-- Short Day Name (MON, TUE...) -->
                <span class="text-[9px] uppercase font-bold tracking-wider mb-1 ${
                  isSelected ? 'text-primary dark:text-primary-container font-extrabold' : 'text-on-surface-variant dark:text-gray-400'
                }">
                  ${day.dayName}
                </span>

                <!-- Calorie Progress Ring wrapping Day Number (No % shown) -->
                ${renderCalorieProgressRing({
                  consumed: dayConsumed,
                  target: calorieTarget,
                  size: 38,
                  strokeWidth: 3,
                  isSelected: false, // keep progress ring colorful
                  isToday: day.isToday,
                  innerContentHtml: `
                    <span class="font-heading font-extrabold text-xs transition-colors ${
                      isSelected 
                        ? 'w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-xs' 
                        : 'text-on-surface dark:text-white'
                    }">
                      ${day.dayNum}
                    </span>
                  `,
                  ariaLabel: dayAriaLabel
                })}

                <!-- Today Indicator Dot -->
                ${day.isToday ? `
                  <span class="w-1.5 h-1.5 rounded-full bg-primary mt-1"></span>
                ` : '<span class="w-1.5 h-1.5 mt-1"></span>'}
              </button>
            `;
          }).join('')}
        </div>

        <!-- Next Week Button -->
        <button 
          type="button" 
          onclick="window.goToNextWeek()" 
          aria-label="Next week"
          class="w-7 h-12 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container dark:hover:bg-dark-surface-card-high flex items-center justify-center shrink-0 transition-colors"
        >
          <span class="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      <!-- Main Diary Stream -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">
        
        <!-- Day Specific Overview Card with Macro Stats and Mini Calorie Ring -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient">
          <div class="flex items-center justify-between gap-3 mb-2">
            <div>
              <span class="font-heading font-bold text-xs text-on-surface-variant dark:text-gray-400 uppercase tracking-wider block">Nutrition Summary</span>
              <span class="font-heading text-sm font-bold text-on-surface dark:text-white block mt-0.5">${formatDiaryDate(selectedDate)}</span>
            </div>

            <div class="flex items-center gap-2.5">
              ${renderCalorieProgressRing({
                consumed,
                target: calorieTarget,
                size: 46,
                strokeWidth: 3.5,
                innerContentHtml: `
                  <span class="material-symbols-outlined text-[18px] text-primary">local_fire_department</span>
                `,
                ariaLabel: `Daily calorie total: ${consumed} of ${calorieTarget} kcal`
              })}
              <div class="text-right">
                <span class="text-xs font-extrabold ${consumed > 0 ? 'text-primary dark:text-primary-container' : 'text-on-surface-variant dark:text-gray-400'} block">
                  ${consumed.toLocaleString()} kcal
                </span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">
                  of ${calorieTarget.toLocaleString()} goal
                </span>
              </div>
            </div>
          </div>

          <!-- Mini Macro Progress Grid -->
          <div class="grid grid-cols-4 gap-2 mt-3">
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-2.5 rounded-xl text-center">
              <span class="text-[10px] font-bold text-primary dark:text-primary-container block">Protein</span>
              <p class="font-heading font-extrabold text-sm text-on-surface dark:text-white mt-0.5">${totals.protein}g</p>
            </div>
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-2.5 rounded-xl text-center">
              <span class="text-[10px] font-bold text-tertiary dark:text-tertiary-fixed block">Carbs</span>
              <p class="font-heading font-extrabold text-sm text-on-surface dark:text-white mt-0.5">${totals.carbs}g</p>
            </div>
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-2.5 rounded-xl text-center">
              <span class="text-[10px] font-bold text-amber-500 block">Fat</span>
              <p class="font-heading font-extrabold text-sm text-on-surface dark:text-white mt-0.5">${totals.fat}g</p>
            </div>
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-2.5 rounded-xl text-center">
              <span class="text-[10px] font-bold text-blue-500 block">Water</span>
              <p class="font-heading font-extrabold text-sm text-on-surface dark:text-white mt-0.5">${waterGlasses * 250}ml</p>
            </div>
          </div>
        </section>

        <!-- Daily Micronutrient Summary -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-heading font-bold text-xs text-on-surface-variant dark:text-gray-400 uppercase tracking-wider block">Daily Micronutrient Summary</span>
                <span class="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary dark:text-primary-container text-[9px] font-extrabold">VITAMINS &amp; MINERALS</span>
              </div>
              <p class="text-[11px] text-on-surface dark:text-white font-semibold mt-0.5">
                ${microSummary.mealsWithMicronutrients > 0 ? 'Aggregated nutritional trace intake' : 'No micronutrient data for this date'}
              </p>
            </div>

            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              microSummary.mealsWithMicronutrients > 0 
                ? 'bg-primary/10 text-primary dark:text-primary-container border-primary/20' 
                : 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant border-outline-variant/30'
            }">
              ${microSummary.mealsWithMicronutrients}/${microSummary.totalMealsInDay} Meals with Data
            </span>
          </div>

          ${microSummary.totalMealsInDay > 0 ? `
            <!-- Data Coverage Banner -->
            <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-primary">pie_chart</span>
                <span class="text-[11px] text-on-surface dark:text-gray-200 font-medium">
                  Micronutrient data available for <strong>${microSummary.mealsWithMicronutrients} of ${microSummary.totalMealsInDay} meals</strong> (${microSummary.coveragePercentage}%)
                </span>
              </div>
            </div>
          ` : ''}

          ${microSummary.nutrients.length > 0 ? `
            <!-- Top Key Nutrients Grid -->
            <div class="grid grid-cols-2 gap-2">
              ${microSummary.nutrients.slice(0, 6).map(n => {
                const dv = n.dailyValuePercent;
                const progressWidth = dv !== null && dv !== undefined ? Math.min(100, Math.max(0, dv)) : 0;
                return `
                  <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex flex-col gap-1">
                    <div class="flex items-start justify-between">
                      <div>
                        <span class="font-heading font-bold text-xs text-on-surface dark:text-white block leading-tight">${escapeHtml(n.shortName || n.name)}</span>
                        <span class="text-[11px] font-extrabold text-primary dark:text-primary-container mt-0.5 block">${n.totalAmount} ${n.unit}</span>
                      </div>
                      ${dv !== null && dv !== undefined ? `
                        <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-primary/10 text-primary dark:text-primary-container">
                          ${dv}% DV
                        </span>
                      ` : ''}
                    </div>

                    ${dv !== null && dv !== undefined ? `
                      <div class="w-full h-1 rounded-full bg-surface-container-lowest dark:bg-dark-surface-card overflow-hidden">
                        <div class="h-full rounded-full bg-primary" style="width: ${progressWidth}%;"></div>
                      </div>
                    ` : ''}

                    <div class="flex items-center justify-between text-[9px] text-on-surface-variant dark:text-gray-400">
                      <span>${n.mealsReportingCount} meal${n.mealsReportingCount > 1 ? 's' : ''}</span>
                      <span class="capitalize font-medium">${n.statusLabel}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <p class="text-[10px] text-on-surface-variant dark:text-gray-400 italic leading-relaxed">
              * Micronutrients reflect logged meals with verified data. Meals without micronutrient profiles are excluded from totals and not assumed to be zero.
            </p>
          ` : `
            <div class="p-4 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high text-center">
              <p class="text-xs text-on-surface-variant dark:text-gray-400">
                ${dayMeals.length === 0 
                  ? 'No meals logged for this date. Log meals to view trace minerals and vitamins.' 
                  : 'No verified micronutrient profiles recorded for meals on this date.'}
              </p>
            </div>
          `}
        </section>

        <!-- Meals Timeline For Selected Date -->
        <section class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-sm font-bold text-on-surface dark:text-white">
              Logged Items (${dayMeals.length})
            </h3>
            <button 
              type="button" 
              onclick="window.navigateApp('scanner')" 
              class="text-xs font-bold text-primary dark:text-primary-container flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-[16px]">photo_camera</span>
              <span>Scan Food</span>
            </button>
          </div>

          ${dayMeals.length === 0 ? `
            <!-- Authentic Empty State for dates without meals -->
            <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-8 rounded-2xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center text-center">
              <div class="w-14 h-14 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant flex items-center justify-center mb-3">
                <span class="material-symbols-outlined text-[28px]">event_busy</span>
              </div>
              <h4 class="font-heading font-bold text-sm text-on-surface dark:text-white">No meals recorded for this date</h4>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 max-w-[240px] mt-1">
                Log your meals or scan food to track calories and macros for this day.
              </p>
              <div class="flex items-center gap-2 mt-4">
                <button 
                  type="button" 
                  onclick="window.openQuickLog(${htmlJsArg(selectedDate)})"
                  class="px-3.5 py-2 rounded-xl bg-primary text-white font-heading text-xs font-bold shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-1"
                >
                  <span class="material-symbols-outlined text-[16px]">edit_note</span>
                  <span>Quick Log</span>
                </button>
                <button 
                  type="button" 
                  onclick="window.toggleQuickActions(true)" 
                  class="px-3.5 py-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-on-surface dark:text-gray-200 font-heading text-xs font-bold hover:bg-surface-container transition-all flex items-center gap-1"
                >
                  <span class="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Food</span>
                </button>
              </div>
            </div>
          ` : `
            <div class="flex flex-col gap-2.5">
              ${dayMeals.map(meal => {
                const hasMicro = !!meal.micronutrients;
                return `
                <div 
                  onclick="window.openMealDetail(${htmlJsArg(meal.id)})"
                  class="bg-surface-container-lowest dark:bg-dark-surface-card p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col gap-2.5 hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer group"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-primary dark:text-primary-container group-hover:scale-105 transition-transform">
                        <span class="material-symbols-outlined text-[22px]">${escapeHtml(meal.icon)}</span>
                      </div>
                      <div>
                        <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white leading-tight group-hover:text-primary transition-colors">${escapeHtml(meal.name)}</h4>
                        <p class="text-[10px] text-on-surface-variant dark:text-gray-400 capitalize">${escapeHtml(meal.category || meal.mealType)} &bull; ${escapeHtml(meal.time)}</p>
                      </div>
                    </div>

                    <div class="text-right">
                      <span class="font-heading font-bold text-xs text-on-surface dark:text-white">${meal.calories} kcal</span>
                      <button 
                        type="button"
                        onclick="event.stopPropagation(); window.deleteMeal(${htmlJsArg(meal.id)})"
                        class="block ml-auto text-on-surface-variant hover:text-error transition-colors mt-0.5 p-1 -mr-1"
                        aria-label="Delete meal"
                      >
                        <span class="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <!-- Macro Pill Tags & Add Again -->
                  <div class="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-[10px]">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      ${meal.portion?.servingDescription ? `
                        <span class="px-2 py-0.5 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high font-bold text-on-surface dark:text-gray-200">
                          ${escapeHtml(meal.portion.servingDescription)}
                        </span>
                      ` : ''}
                      <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-container font-semibold">${meal.protein}g Protein</span>
                      <span class="px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary dark:text-tertiary-fixed font-semibold">${meal.carbs}g Carbs</span>
                      <span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">${meal.fat}g Fat</span>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                      ${hasMicro ? `
                        <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-container flex items-center gap-0.5">
                          <span class="material-symbols-outlined text-[11px]">verified</span>
                          <span>Micros</span>
                        </span>
                      ` : ''}

                      <button 
                        type="button" 
                        onclick="event.stopPropagation(); window.addAgainMeal(${htmlJsArg(meal.id)})"
                        class="px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-container font-bold text-[10px] active:scale-95 transition-all flex items-center gap-0.5"
                        aria-label="Add ${escapeHtml(meal.name)} again"
                      >
                        <span class="material-symbols-outlined text-[12px]">replay</span>
                        <span>Add Again</span>
                      </button>
                    </div>
                  </div>

                </div>
              `;
              }).join('')}
            </div>
          `}
        </section>

      </main>

    </div>
  `;
}
