import { store } from '../../store/appState.ts';
import { 
  getMonthCalendarGrid, 
  getTodayKey, 
  formatDiaryDate 
} from '../../utils/dateUtils.ts';
import { 
  resolveDayStatus, 
  calculateMonthlyProgramSummary, 
  calculateWeeklyTemplateSummary 
} from '../../utils/fitnessPlannerCalculations.ts';
import { WORKOUT_PRESETS } from '../../data/workoutPresets.ts';
import { escapeHtml } from '../../utils/sanitize.ts';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function renderMonthlyFitnessCalendar(passedState?: any): string {
  const state = passedState || store.getState();
  const year = state.plannerCalendarYear;
  const month = state.plannerCalendarMonth; // 1..12
  const scheduledMap = state.scheduledWorkouts;
  const history = state.workoutHistory;
  const todayKey = getTodayKey();
  const template = state.weeklyFitnessTemplate;

  const now = new Date();
  const isCurrentMonthView = now.getFullYear() === year && (now.getMonth() + 1) === month;
  const monthName = MONTH_NAMES[month - 1] || 'Month';

  // Generate calendar grid
  const cells = getMonthCalendarGrid(year, month, state.selectedPlannerDate || undefined);

  // Calculate monthly stats
  const summary = calculateMonthlyProgramSummary(year, month, scheduledMap, history, todayKey);
  const templateSummaryText = calculateWeeklyTemplateSummary(template);

  return `
    <div class="flex flex-col gap-3.5">
      <!-- Calendar Container Card -->
      <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient">
        
        <!-- Calendar Month Header & Navigation -->
        <div class="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div class="flex items-center gap-1.5">
            <h3 class="font-heading font-extrabold text-base text-on-surface dark:text-white">
              ${monthName} <span class="text-primary dark:text-primary-container font-semibold">${year}</span>
            </h3>
            ${!isCurrentMonthView ? `
              <button 
                type="button" 
                onclick="window.goToPlannerTodayMonth()" 
                class="px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-container text-[10px] font-bold transition-all ml-1"
                aria-label="Return to current month"
              >
                Today
              </button>
            ` : ''}
          </div>

          <!-- Prev / Next Month Controls -->
          <div class="flex items-center gap-1">
            <button 
              type="button"
              onclick="window.prevPlannerMonth()"
              aria-label="Previous month"
              class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant dark:text-gray-300 hover:text-primary hover:bg-surface-container transition-all"
            >
              <span class="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button 
              type="button"
              onclick="window.nextPlannerMonth()"
              aria-label="Next month"
              class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant dark:text-gray-300 hover:text-primary hover:bg-surface-container transition-all"
            >
              <span class="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        <!-- Weekday Headers -->
        <div class="grid grid-cols-7 gap-1 pt-2 pb-1 text-center">
          ${WEEKDAY_HEADERS.map(d => `
            <div class="text-[11px] font-bold text-on-surface-variant/70 dark:text-gray-400 uppercase tracking-tight py-0.5">
              ${d}
            </div>
          `).join('')}
        </div>

        <!-- Calendar Day Cells Grid -->
        <div class="grid grid-cols-7 gap-1">
          ${cells.map(cell => {
            const scheduled = scheduledMap[cell.dateKey];
            const status = resolveDayStatus(cell.dateKey, scheduled, history, todayKey);
            const isToday = cell.isToday;
            const isDimmed = !cell.isCurrentMonth;
            
            // Find preset details if scheduled
            let presetLabel = '';
            const scheduledWorkout = scheduled?.workout;
            if (scheduledWorkout && scheduledWorkout.type === 'preset') {
              const preset = WORKOUT_PRESETS.find(p => p.id === scheduledWorkout.presetId);
              presetLabel = preset ? preset.title.replace(' Day', '') : 'Workout';
            }

            // Accessibility label
            const friendly = formatDiaryDate(cell.dateKey);
            let statusDesc = 'No workout planned';
            if (status === 'completed') statusDesc = 'Workout completed';
            else if (status === 'planned') statusDesc = `Planned: ${presetLabel}`;
            else if (status === 'missed') statusDesc = `Missed: ${presetLabel}`;
            else if (status === 'rest') statusDesc = 'Rest day';

            // Visual styling based on status
            let badgeHtml = '';
            let cellBg = 'bg-surface-container-low/40 dark:bg-dark-surface-card-high/30 hover:bg-surface-container-low dark:hover:bg-dark-surface-card-high';

            if (status === 'completed') {
              cellBg = 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 hover:bg-emerald-500/20';
              badgeHtml = `
                <div class="flex items-center justify-center gap-0.5 mt-0.5 text-emerald-600 dark:text-emerald-400">
                  <span class="material-symbols-outlined text-[13px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                  <span class="text-[9px] font-bold leading-none truncate max-w-[32px]">${presetLabel ? escapeHtml(presetLabel) : 'Done'}</span>
                </div>
              `;
            } else if (status === 'planned') {
              cellBg = 'bg-primary/10 dark:bg-primary/15 border-primary/30 hover:bg-primary/20';
              badgeHtml = `
                <div class="flex items-center justify-center gap-0.5 mt-0.5 text-primary dark:text-primary-container">
                  <span class="material-symbols-outlined text-[13px]">fitness_center</span>
                  <span class="text-[9px] font-bold leading-none truncate max-w-[32px]">${escapeHtml(presetLabel)}</span>
                </div>
              `;
            } else if (status === 'missed') {
              cellBg = 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 hover:bg-rose-500/20';
              badgeHtml = `
                <div class="flex items-center justify-center gap-0.5 mt-0.5 text-rose-600 dark:text-rose-400">
                  <span class="material-symbols-outlined text-[13px]">cancel</span>
                  <span class="text-[9px] font-bold leading-none truncate max-w-[32px]">${escapeHtml(presetLabel || 'Miss')}</span>
                </div>
              `;
            } else if (status === 'rest') {
              cellBg = 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/20 hover:bg-amber-500/20';
              badgeHtml = `
                <div class="flex items-center justify-center gap-0.5 mt-0.5 text-amber-600 dark:text-amber-400">
                  <span class="material-symbols-outlined text-[12px]">spa</span>
                  <span class="text-[9px] font-bold leading-none">Rest</span>
                </div>
              `;
            }

            return `
              <button 
                type="button"
                onclick="window.openPlannerDateDetail('${cell.dateKey}')"
                aria-label="${friendly}: ${statusDesc}"
                class="min-h-[56px] p-1 rounded-xl flex flex-col items-center justify-between border transition-all text-left group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${cellBg} ${isDimmed ? 'opacity-35' : 'opacity-100'} ${isToday ? 'ring-2 ring-primary ring-offset-1 dark:ring-offset-dark-surface' : 'border-outline-variant/20'}"
              >
                <!-- Day Number -->
                <span class="text-[11px] font-bold leading-tight ${isToday ? 'w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]' : 'text-on-surface dark:text-gray-200'}">
                  ${cell.dayNum}
                </span>

                <!-- Status Badge -->
                <div class="w-full flex justify-center">
                  ${badgeHtml}
                </div>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Accessible Legend -->
        <div class="mt-3 pt-2.5 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-[10px] text-on-surface-variant dark:text-gray-400 px-1">
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span class="font-medium">Completed</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-primary"></span>
            <span class="font-medium">Planned</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            <span class="font-medium">Rest Day</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            <span class="font-medium">Missed</span>
          </div>
        </div>

      </div>

      <!-- Monthly Stats & Weekly Routine Quick Card -->
      <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-heading font-bold text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              ${monthName} Summary
            </h4>
            <p class="text-[11px] text-on-surface dark:text-gray-200 mt-0.5 font-medium">
              ${summary.completedCount} completed · ${summary.plannedCount} upcoming · ${summary.restCount} rest days
            </p>
          </div>
          <button 
            type="button" 
            onclick="window.openWeeklyProgramEditor()"
            class="px-3 py-1.5 rounded-full bg-primary text-on-primary hover:bg-primary/90 text-xs font-heading font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all"
            aria-label="Edit weekly routine"
          >
            <span class="material-symbols-outlined text-[16px]">edit_calendar</span>
            <span>${template ? 'Edit Routine' : 'Build Routine'}</span>
          </button>
        </div>

        <!-- Routine description pill -->
        <div class="p-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 truncate">
            <div class="w-7 h-7 rounded-lg bg-primary/10 text-primary dark:text-primary-container flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[18px]">calendar_view_week</span>
            </div>
            <div class="truncate">
              <span class="text-xs font-bold text-on-surface dark:text-white block truncate">
                ${template ? escapeHtml(template.name) : 'No Routine Configured'}
              </span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block truncate">
                ${escapeHtml(templateSummaryText)}
              </span>
            </div>
          </div>
          <button 
            type="button" 
            onclick="window.openWeeklyProgramEditor()" 
            class="text-xs font-bold text-primary dark:text-primary-container hover:underline shrink-0"
          >
            Customize
          </button>
        </div>
      </div>

      <!-- Reset All Program Action Button -->
      <div class="pt-1 pb-2 flex items-center justify-center">
        <button 
          type="button" 
          onclick="window.confirmResetAllFitnessPrograms()"
          class="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-full text-xs font-heading font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
          aria-label="Reset all programs and schedules"
        >
          <span class="material-symbols-outlined text-[16px]">restart_alt</span>
          <span>Reset All Program</span>
        </button>
      </div>
    </div>
  `;
}
