import { tr, trHtml, translatedLabel } from '../../i18n/index.ts';
import { store } from '../../store/appState.ts';
import { WORKOUT_PRESETS } from '../../data/workoutPresets.ts';
import { WEEKDAY_LABELS, calculateWeeklyTemplateSummary } from '../../utils/fitnessPlannerCalculations.ts';
import type { WeekdayNumber } from '../../types/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function renderWeeklyProgramEditorModal(passedState?: any): string {
  const state = passedState || store.getState();
  if (!state.plannerWeeklyEditorOpen && !state.plannerConfirmOverwriteMonth) {
    return '';
  }

  // Handle Overwrite Confirmation Modal if active
  if (state.plannerConfirmOverwriteMonth) {
    const { year, month } = state.plannerConfirmOverwriteMonth;
    const monthName = tr(MONTH_NAMES[month - 1] || "Month");

    return `
      <div 
        id="planner-overwrite-modal-backdrop"
        class="ui-dialog-layer bg-black/60 backdrop-blur-xs"
        data-dialog-close="window.cancelPlannerOverwrite()"
        onclick="if(event.target === this) window.cancelPlannerOverwrite()"
        role="dialog"
        aria-modal="true"
        aria-labelledby="overwrite-modal-title"
      >
        <div class="ui-dialog-panel bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 shadow-modal">
          <div class="ui-dialog-header flex items-center gap-3 text-amber-500 px-5 pt-5 pb-4">
            <div class="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <div>
              <h3 id="overwrite-modal-title" class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight">
                ${trHtml("Overwrite Schedule?")}
              </h3>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">
                ${monthName} ${year}
              </p>
            </div>
          </div>

          <div class="ui-dialog-body px-5 pb-2">
            <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
              ${trHtml("Your calendar for")} <strong>${monthName} ${year}</strong> ${trHtml("already has scheduled workouts. Applying this routine will replace planned days while preserving your completed workout records.")}
            </p>
          </div>

          <div class="ui-dialog-footer flex items-center gap-2 px-5 pt-2 pb-5">
            <button 
              type="button" 
              onclick="window.cancelPlannerOverwrite()"
              class="flex-1 py-2.5 px-3 rounded-xl border border-outline-variant/40 text-on-surface-variant dark:text-gray-300 hover:bg-surface-container font-heading text-xs font-bold transition-all"
            >
              ${trHtml("Cancel")}
            </button>
            <button 
              type="button" 
              onclick="window.confirmPlannerOverwrite(${year}, ${month})"
              class="flex-1 py-2.5 px-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-heading text-xs font-bold transition-all shadow-sm"
            >
              ${trHtml("Overwrite & Apply")}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  const template = state.weeklyFitnessTemplate;
  const days = template?.days || {};
  const currentSummary = calculateWeeklyTemplateSummary(template);
  const currentMonth = state.plannerCalendarMonth;
  const currentYear = state.plannerCalendarYear;
  const monthName = tr(MONTH_NAMES[currentMonth - 1] || "Month");

  return `
    <div 
      id="weekly-program-modal-backdrop"
      onclick="if(event.target === this) window.closeWeeklyProgramEditor()"
      class="ui-dialog-layer bg-black/60 backdrop-blur-xs"
      data-dialog-close="window.closeWeeklyProgramEditor()"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weekly-program-modal-title"
    >
      <div 
        class="ui-dialog-panel bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 shadow-modal"
      >
        <!-- Header -->
        <div class="ui-dialog-header px-5 py-4 flex items-center justify-between gap-3 border-b border-outline-variant/20">
          <div>
            <h2 id="weekly-program-modal-title" class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight">
              ${trHtml("Weekly Routine Builder")}
            </h2>
            <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">
              ${escapeHtml(currentSummary)}
            </p>
          </div>

          <button 
            type="button" 
            onclick="window.closeWeeklyProgramEditor()"
            aria-label="${trHtml("Close routine builder")}"
            class="w-8 h-8 shrink-0 rounded-full bg-surface-container dark:bg-dark-surface-card-high text-on-surface-variant dark:text-gray-300 hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- 7-Day Configuration Canvas -->
        <div class="ui-dialog-body px-5 py-4 flex flex-col gap-2.5">
          <p class="text-xs text-on-surface-variant dark:text-gray-400 mb-1 leading-relaxed">
            ${trHtml("Assign training routines for each day of the week, or mark days as active recovery.")}
          </p>

          ${([1, 2, 3, 4, 5, 6, 7] as WeekdayNumber[]).map(dayNum => {
            const label = WEEKDAY_LABELS[dayNum];
            const currentVal = days[dayNum];
            let selectedType = 'none';
            if (currentVal) {
              if (currentVal.type === 'rest') selectedType = 'rest';
              else if (currentVal.type === 'preset') selectedType = currentVal.presetId;
            }

            return `
              <div class="p-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex items-center justify-between gap-3">
                <div class="w-24 shrink-0">
                  <span class="font-heading font-bold text-xs text-on-surface dark:text-white block">
                    ${trHtml(label.full)}
                  </span>
                  <span class="text-[10px] text-on-surface-variant/70 dark:text-gray-400">
                    ${trHtml("Day")} ${dayNum}
                  </span>
                </div>

                <!-- Selector dropdown -->
                <div class="min-w-0 flex-1">
                  <select 
                    id="weekly-day-select-${dayNum}"
                    onchange="window.handleWeeklyDaySelect(${dayNum}, this.value)"
                    aria-label="${trHtml("Select routine for")} ${trHtml(label.full)}"
                    class="w-full text-xs font-semibold py-2 px-3 rounded-lg bg-surface dark:bg-dark-surface border border-outline-variant/40 text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                  >
                    <option value="none" ${selectedType === 'none' ? 'selected' : ''}>${trHtml("-- No Plan --")}</option>
                    <option value="rest" ${selectedType === 'rest' ? 'selected' : ''}>${trHtml("😴 Rest Day")}</option>
                    <optgroup label="Workout Presets">
                      ${WORKOUT_PRESETS.map(p => `
                        <option value="${escapeHtml(p.id)}" ${selectedType === p.id ? 'selected' : ''}>
                          🏋️ ${escapeHtml(translatedLabel(p.title))} (${p.estimatedMinutes}${trHtml("m)")}
                        </option>
                      `).join('')}
                    </optgroup>
                  </select>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Action Footer -->
        <div class="ui-dialog-footer px-5 py-3 border-t border-outline-variant/20 flex flex-col gap-2 bg-surface-container-lowest dark:bg-dark-surface-card">
          <div class="grid grid-cols-2 gap-2">
            <!-- Apply to This Week Only -->
            <button 
              type="button" 
              onclick="window.applyWeeklyToCurrentWeek()"
              class="py-2.5 px-3 rounded-xl border border-primary/40 text-primary dark:text-primary-container hover:bg-primary/10 font-heading text-xs font-bold transition-all text-center"
            >
              ${trHtml("This Week Only")}
            </button>

            <!-- Repeat for this month -->
            <button 
              type="button" 
              onclick="window.applyWeeklyToMonth(${currentYear}, ${currentMonth})"
              class="py-2.5 px-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-heading text-xs font-bold transition-all text-center shadow-sm"
            >
              ${trHtml("Repeat for")} ${monthName}
            </button>
          </div>

          <button 
            type="button" 
            onclick="window.saveWeeklyRoutineOnly()"
            class="w-full py-2 text-[11px] font-bold text-on-surface-variant dark:text-gray-400 hover:text-primary transition-colors text-center"
          >
            ${trHtml("Save Template Without Scheduling")}
          </button>
        </div>

      </div>
    </div>
  `;
}
