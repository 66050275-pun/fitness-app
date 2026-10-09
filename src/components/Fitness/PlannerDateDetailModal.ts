import { store } from '../../store/appState.ts';
import { formatDiaryDate, getTodayKey } from '../../utils/dateUtils.ts';
import { 
  resolveDayStatus, 
  getCompletedWorkoutForDate 
} from '../../utils/fitnessPlannerCalculations.ts';
import { WORKOUT_PRESETS } from '../../data/workoutPresets.ts';
import { htmlJsArg, escapeHtml } from '../../utils/sanitize.ts';

export function renderPlannerDateDetailModal(passedState?: any): string {
  const state = passedState || store.getState();
  if (!state.plannerDetailModalOpen || !state.selectedPlannerDate) {
    return '';
  }

  const dateKey = state.selectedPlannerDate;
  const todayKey = getTodayKey();
  const scheduled = state.scheduledWorkouts[dateKey];
  const history = state.workoutHistory;
  const status = resolveDayStatus(dateKey, scheduled, history, todayKey);
  const completedWorkout = getCompletedWorkoutForDate(dateKey, history);
  const isToday = dateKey === todayKey;
  const friendlyDate = formatDiaryDate(dateKey);

  // Status Badge Metadata
  let statusBadge = '';
  switch (status) {
    case 'completed':
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
          <span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          Completed
        </span>
      `;
      break;
    case 'planned':
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary dark:text-primary-container text-xs font-extrabold uppercase tracking-wider">
          <span class="material-symbols-outlined text-[14px]">event</span>
          Planned
        </span>
      `;
      break;
    case 'missed':
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-extrabold uppercase tracking-wider">
          <span class="material-symbols-outlined text-[14px]">error_outline</span>
          Missed
        </span>
      `;
      break;
    case 'rest':
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-extrabold uppercase tracking-wider">
          <span class="material-symbols-outlined text-[14px]">spa</span>
          Rest Day
        </span>
      `;
      break;
    case 'unplanned':
    default:
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-extrabold uppercase tracking-wider">
          Unplanned
        </span>
      `;
      break;
  }

  // Find preset details if scheduled
  let scheduledPreset = null;
  const scheduledWorkout = scheduled?.workout;
  if (scheduledWorkout && scheduledWorkout.type === 'preset') {
    scheduledPreset = WORKOUT_PRESETS.find(p => p.id === scheduledWorkout.presetId) || null;
  }

  return `
    <div 
      id="planner-detail-modal-backdrop"
      onclick="if(event.target === this) window.closePlannerDateDetail()"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="planner-detail-modal-title"
    >
      <div 
        class="w-full max-w-md max-h-[90vh] bg-surface-container-lowest dark:bg-dark-surface-card rounded-t-[28px] border-t border-outline-variant/30 shadow-modal overflow-hidden flex flex-col animate-slide-up"
        style="padding-bottom: max(env(safe-area-inset-bottom, 16px), 16px);"
      >
        <!-- Pull Handle -->
        <div class="pt-3 pb-1 flex justify-center shrink-0">
          <div class="w-10 h-1 rounded-full bg-outline-variant/50"></div>
        </div>

        <!-- Header -->
        <div class="px-5 py-3 flex items-center justify-between border-b border-outline-variant/20 shrink-0">
          <div>
            <div class="flex items-center gap-2 mb-1">
              ${statusBadge}
              ${isToday ? `
                <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold uppercase">Today</span>
              ` : ''}
            </div>
            <h2 id="planner-detail-modal-title" class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight">
              ${friendlyDate}
            </h2>
          </div>

          <button 
            type="button" 
            onclick="window.closePlannerDateDetail()"
            aria-label="Close date detail"
            class="w-8 h-8 rounded-full bg-surface-container dark:bg-dark-surface-card-high text-on-surface-variant dark:text-gray-300 hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 no-scrollbar">
          
          ${completedWorkout ? `
            <!-- Completed Workout Card -->
            <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">check</span>
                  </div>
                  <div>
                    <h3 class="font-heading font-bold text-sm text-on-surface dark:text-white leading-tight">
                      ${escapeHtml(completedWorkout.name)}
                    </h3>
                    <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Completed Routine</span>
                  </div>
                </div>
              </div>

              <!-- Stat Grid -->
              <div class="grid grid-cols-4 gap-2 pt-1 text-center">
                <div class="p-2 rounded-xl bg-surface/60 dark:bg-dark-surface/60 border border-outline-variant/20">
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Sets</span>
                  <span class="font-heading font-extrabold text-sm text-on-surface dark:text-white">${completedWorkout.completedSetCount}</span>
                </div>
                <div class="p-2 rounded-xl bg-surface/60 dark:bg-dark-surface/60 border border-outline-variant/20">
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Time</span>
                  <span class="font-heading font-extrabold text-sm text-on-surface dark:text-white">${Math.round(completedWorkout.durationSeconds / 60)}m</span>
                </div>
                <div class="p-2 rounded-xl bg-surface/60 dark:bg-dark-surface/60 border border-outline-variant/20">
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Volume</span>
                  <span class="font-heading font-extrabold text-sm text-on-surface dark:text-white">${(completedWorkout.totalVolume || 0).toLocaleString()} kg</span>
                </div>
                <div class="p-2 rounded-xl bg-surface/60 dark:bg-dark-surface/60 border border-outline-variant/20">
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Burned</span>
                  <span class="font-heading font-extrabold text-sm text-emerald-600 dark:text-emerald-400">${completedWorkout.estimatedCalories || 0} kcal</span>
                </div>
              </div>

              <!-- Action: View Workout Details -->
              <button 
                type="button" 
                onclick="window.openWorkoutHistoryDetail(${htmlJsArg(completedWorkout.id)})"
                class="w-full py-2.5 rounded-xl bg-surface-container dark:bg-dark-surface-card-high border border-outline-variant/30 text-on-surface dark:text-white font-heading text-xs font-bold flex items-center justify-center gap-1.5 hover:border-primary/50 transition-all"
              >
                <span class="material-symbols-outlined text-[16px]">visibility</span>
                <span>View Workout Summary</span>
              </button>
            </div>
          ` : ''}

          ${!completedWorkout && scheduledPreset ? `
            <!-- Planned Preset Card -->
            <div class="p-4 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl bg-primary/10 text-primary dark:text-primary-container flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-[24px]">${scheduledPreset.icon}</span>
                </div>
                <div class="flex-1">
                  <h3 class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight">
                    ${escapeHtml(scheduledPreset.title)}
                  </h3>
                  <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">
                    ${escapeHtml(scheduledPreset.subtitle)}
                  </p>
                </div>
              </div>

              <!-- Workout Quick Info -->
              <div class="grid grid-cols-3 gap-2 text-center pt-1">
                <div class="p-2 rounded-xl bg-surface dark:bg-dark-surface border border-outline-variant/20">
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Est. Time</span>
                  <span class="font-heading font-bold text-xs text-on-surface dark:text-white">${scheduledPreset.estimatedMinutes} mins</span>
                </div>
                <div class="p-2 rounded-xl bg-surface dark:bg-dark-surface border border-outline-variant/20">
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Exercises</span>
                  <span class="font-heading font-bold text-xs text-on-surface dark:text-white">${scheduledPreset.exercises.length} movements</span>
                </div>
                <div class="p-2 rounded-xl bg-surface dark:bg-dark-surface border border-outline-variant/20">
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Focus</span>
                  <span class="font-heading font-bold text-xs text-primary dark:text-primary-container truncate block">${escapeHtml(scheduledPreset.primaryMuscles.split(',')[0])}</span>
                </div>
              </div>

              <!-- Primary Start Workout Action -->
              <button 
                type="button" 
                onclick="window.startScheduledWorkout(${htmlJsArg(dateKey)}, ${htmlJsArg(scheduledPreset.id)})"
                class="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-heading text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.98] transition-all"
              >
                <span class="material-symbols-outlined text-[18px]">play_arrow</span>
                <span>${isToday ? 'Start Today’s Workout' : 'Start This Workout'}</span>
              </button>
            </div>
          ` : ''}

          ${!completedWorkout && scheduled && scheduled.workout.type === 'rest' ? `
            <!-- Rest Day Card -->
            <div class="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center flex flex-col items-center gap-2">
              <div class="w-12 h-12 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <span class="material-symbols-outlined text-[28px]">spa</span>
              </div>
              <h3 class="font-heading font-extrabold text-base text-on-surface dark:text-white">
                Rest & Recovery Day
              </h3>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 leading-relaxed max-w-xs">
                Muscle recovery and restorative sleep are vital for muscle protein synthesis and injury prevention.
              </p>
            </div>
          ` : ''}

          ${!completedWorkout && !scheduled ? `
            <!-- Empty Unplanned Card -->
            <div class="p-6 rounded-2xl border border-dashed border-outline-variant/40 text-center flex flex-col items-center gap-2">
              <span class="material-symbols-outlined text-3xl text-on-surface-variant/40 mb-1">calendar_today</span>
              <h3 class="font-heading font-bold text-sm text-on-surface dark:text-white">
                No Workout Scheduled
              </h3>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 leading-relaxed max-w-xs">
                You have not assigned a workout routine or marked this day as rest.
              </p>
            </div>
          ` : ''}

          <!-- Date Management Options -->
          <div class="flex flex-col gap-2 pt-2 border-t border-outline-variant/20">
            <span class="text-xs font-heading font-bold text-on-surface-variant dark:text-gray-400 uppercase tracking-wider">
              Date Options
            </span>

            <!-- Change Workout Preset Dropdown -->
            <div class="p-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex items-center justify-between gap-3">
              <span class="text-xs font-bold text-on-surface dark:text-white">
                Assign Routine:
              </span>
              <select 
                onchange="if(this.value) window.handleDateWorkoutOverride(${htmlJsArg(dateKey)}, this.value)"
                aria-label="Change routine for this date"
                class="text-xs font-semibold py-1.5 px-2.5 rounded-lg bg-surface dark:bg-dark-surface border border-outline-variant/40 text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer max-w-[180px]"
              >
                <option value="">-- Choose Option --</option>
                <option value="rest">😴 Set as Rest Day</option>
                <optgroup label="Presets">
                  ${WORKOUT_PRESETS.map(p => `
                    <option value="${escapeHtml(p.id)}" ${scheduledPreset?.id === p.id ? 'selected' : ''}>
                      🏋️ ${escapeHtml(p.title)}
                    </option>
                  `).join('')}
                </optgroup>
              </select>
            </div>

            <div class="flex items-center gap-2">
              ${scheduled && scheduled.workout.type !== 'rest' ? `
                <button 
                  type="button" 
                  onclick="window.handleDateWorkoutOverride(${htmlJsArg(dateKey)}, 'rest')"
                  class="flex-1 py-2 px-3 rounded-xl border border-outline-variant/30 text-xs font-bold text-on-surface-variant dark:text-gray-300 hover:text-amber-500 hover:border-amber-500/40 transition-all flex items-center justify-center gap-1"
                >
                  <span class="material-symbols-outlined text-[16px]">spa</span>
                  <span>Set as Rest Day</span>
                </button>
              ` : ''}

              ${scheduled ? `
                <button 
                  type="button" 
                  onclick="window.removeScheduledWorkout(${htmlJsArg(dateKey)})"
                  class="flex-1 py-2 px-3 rounded-xl border border-outline-variant/30 text-xs font-bold text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all flex items-center justify-center gap-1"
                >
                  <span class="material-symbols-outlined text-[16px]">delete_outline</span>
                  <span>Remove from Plan</span>
                </button>
              ` : ''}
            </div>
          </div>

        </div>

      </div>
    </div>
  `;
}
