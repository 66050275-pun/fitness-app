import { translatedMuscles } from '../../i18n/fitnessLabels.ts';
import { tr, trHtml, getLocale, translatedLabel } from '../../i18n/index.ts';
import { getTodayKey } from '../../utils/dateUtils.ts';
import { 
  resolveDayStatus, 
  getCompletedWorkoutForDate 
} from '../../utils/fitnessPlannerCalculations.ts';
import { WORKOUT_PRESETS } from '../../data/workoutPresets.ts';
import { htmlJsArg, escapeHtml } from '../../utils/sanitize.ts';
import type { ScheduledWorkout, WorkoutHistoryEntry, WorkoutPreset } from '../../types/index.ts';

export interface TodaysWorkoutCardState {
  scheduledWorkouts: Record<string, ScheduledWorkout>;
  workoutHistory: WorkoutHistoryEntry[];
}

export function renderTodaysWorkoutCard(passedState?: TodaysWorkoutCardState): string {
  const state = passedState || { scheduledWorkouts: {}, workoutHistory: [] };
  const todayKey = getTodayKey();
  const scheduled = state.scheduledWorkouts[todayKey];
  const history = state.workoutHistory;
  const status = resolveDayStatus(todayKey, scheduled, history, todayKey);
  const completedWorkout = getCompletedWorkoutForDate(todayKey, history);

  // Friendly date: e.g. "Saturday, Sep 12"
  const now = new Date();
  const weekdayStr = now.toLocaleDateString(getLocale(), { weekday: 'long' });
  const monthDayStr = now.toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });
  const todayDisplayDate = `${weekdayStr}, ${monthDayStr}`;

  // Find preset details if scheduled
  let preset: WorkoutPreset | null = null;
  const scheduledWorkout = scheduled?.workout;
  if (scheduledWorkout && scheduledWorkout.type === 'preset') {
    const targetId = scheduledWorkout.presetId;
    preset = WORKOUT_PRESETS.find(p => p.id === targetId || p.id.startsWith(targetId) || targetId.startsWith(p.id)) || null;
  }

  // Multi-sensory Status Badge & Content
  let statusBadge = '';
  let cardContent = '';

  switch (status) {
    case 'completed': {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold uppercase tracking-wider border border-emerald-500/20">
          <span class="material-symbols-outlined text-[14px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
          ${trHtml("Completed")}
        </span>
      `;

      const workoutName = completedWorkout ? completedWorkout.name : (preset ? preset.title : tr("Workout"));
      const setsCount = completedWorkout?.completedSetCount ?? 0;
      const durationMins = completedWorkout?.durationSeconds ? Math.round(completedWorkout.durationSeconds / 60) : 0;
      const volumeKg = completedWorkout?.totalVolume ? completedWorkout.totalVolume.toLocaleString(getLocale()) : '0';
      const burnedKcal = completedWorkout?.estimatedCalories ?? 0;
      const workoutId = completedWorkout?.id || '';

      cardContent = `
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-sm">
              <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">task_alt</span>
            </div>
            <div class="min-w-0">
              <h3 class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight truncate">
                ${escapeHtml(translatedLabel(workoutName))}
              </h3>
              <p class="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5 truncate">
                ${trHtml("Workout finished for today")}
              </p>
            </div>
          </div>
        </div>

        <!-- Metric Stat Grid -->
        <div class="grid grid-cols-4 gap-1.5 pt-0.5 text-center">
          <div class="py-2 px-1 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex flex-col items-center justify-center min-w-0">
            <span class="text-[9px] uppercase font-bold text-on-surface-variant dark:text-gray-400 block truncate w-full">${trHtml("Sets")}</span>
            <span class="font-heading font-extrabold text-sm text-on-surface dark:text-white block mt-0.5 truncate w-full">${setsCount}</span>
          </div>
          <div class="py-2 px-1 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex flex-col items-center justify-center min-w-0">
            <span class="text-[9px] uppercase font-bold text-on-surface-variant dark:text-gray-400 block truncate w-full">${trHtml("Duration")}</span>
            <span class="font-heading font-extrabold text-sm text-on-surface dark:text-white block mt-0.5 truncate w-full">${durationMins} ${trHtml("min")}</span>
          </div>
          <div class="py-2 px-1 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex flex-col items-center justify-center min-w-0">
            <span class="text-[9px] uppercase font-bold text-on-surface-variant dark:text-gray-400 block truncate w-full">${trHtml("Volume")}</span>
            <span class="font-heading font-extrabold text-xs text-on-surface dark:text-white block mt-0.5 truncate w-full">${volumeKg} ${trHtml("kg")}</span>
          </div>
          <div class="py-2 px-1 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex flex-col items-center justify-center min-w-0">
            <span class="text-[9px] uppercase font-bold text-on-surface-variant dark:text-gray-400 block truncate w-full">${trHtml("Burned")}</span>
            <span class="font-heading font-extrabold text-xs text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate w-full">${burnedKcal} ${trHtml("kcal")}</span>
          </div>
        </div>

        <!-- Action Button Row -->
        <div class="flex items-center gap-2 pt-1">
          ${workoutId ? `
            <button 
              type="button"
              onclick="window.openWorkoutHistoryDetail(${htmlJsArg(workoutId)})"
              class="flex-1 py-2.5 px-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-heading text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <span class="material-symbols-outlined text-[16px]">visibility</span>
              <span>${trHtml("View Summary")}</span>
            </button>
          ` : ''}
          <button 
            type="button"
            onclick="window.openPlannerDateDetail(${htmlJsArg(todayKey)})"
            class="py-2.5 px-3.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-on-surface dark:text-white font-heading text-xs font-bold hover:border-primary/40 active:scale-95 transition-all flex items-center justify-center gap-1 shrink-0"
          >
            <span class="material-symbols-outlined text-[16px]">calendar_today</span>
            <span>${trHtml("Details")}</span>
          </button>
        </div>
      `;
      break;
    }

    case 'planned': {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary dark:text-primary-container text-xs font-extrabold uppercase tracking-wider border border-primary/20">
          <span class="material-symbols-outlined text-[14px]">event</span>
          ${trHtml("Planned")}
        </span>
      `;

      const title = preset ? preset.title : tr("Scheduled Workout");
      const muscles = preset ? preset.primaryMuscles : tr("Full Body Training");
      const exerciseCount = preset?.exercises ? preset.exercises.length : 5;
      const durationMins = preset ? preset.estimatedMinutes : 45;
      const icon = preset ? preset.icon : 'fitness_center';
      const presetId = preset?.id || (scheduledWorkout && scheduledWorkout.type === 'preset' ? scheduledWorkout.presetId : 'full-body');

      cardContent = `
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center shrink-0 shadow-md">
              <span class="material-symbols-outlined text-[24px]">${icon}</span>
            </div>
            <div class="min-w-0">
              <h3 class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight truncate">
                ${escapeHtml(translatedLabel(title))}
              </h3>
              <p class="text-xs text-on-surface-variant dark:text-gray-300 font-medium mt-0.5 truncate">
                ${escapeHtml(translatedMuscles(muscles))}
              </p>
            </div>
          </div>
        </div>

        <!-- Metadata pill -->
        <div class="flex items-center gap-2 flex-wrap text-xs text-on-surface-variant dark:text-gray-400 bg-surface-container-low dark:bg-dark-surface-card-high py-1.5 px-3 rounded-xl border border-outline-variant/20">
          <span class="inline-flex items-center gap-1 font-semibold text-on-surface dark:text-white">
            <span class="material-symbols-outlined text-[15px] text-primary">format_list_numbered</span>
            ${exerciseCount} exercises
          </span>
          <span>·</span>
          <span class="inline-flex items-center gap-1 font-semibold text-on-surface dark:text-white">
            <span class="material-symbols-outlined text-[15px] text-primary">timer</span>
            ${trHtml("About")} ${durationMins} ${trHtml("min")}
          </span>
          ${preset?.intensity ? `
            <span>·</span>
            <span class="font-semibold text-primary dark:text-primary-container">${preset.intensity}</span>
          ` : ''}
        </div>

        <!-- Action Button Row -->
        <div class="flex items-center gap-2 pt-1">
          <button 
            type="button"
            onclick="window.startScheduledWorkout(${htmlJsArg(todayKey)}, ${htmlJsArg(presetId)})"
            class="flex-1 py-2.5 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-heading text-xs font-extrabold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[18px]">play_arrow</span>
            <span>${trHtml("Start Workout")}</span>
          </button>
          <button 
            type="button"
            onclick="window.openPlannerDateDetail(${htmlJsArg(todayKey)})"
            class="py-2.5 px-3.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-on-surface dark:text-white font-heading text-xs font-bold hover:border-primary/40 active:scale-95 transition-all flex items-center justify-center gap-1"
            aria-label="${trHtml("View or customize today's workout")}"
          >
            <span class="material-symbols-outlined text-[18px]">more_horiz</span>
          </button>
        </div>
      `;
      break;
    }

    case 'rest': {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-extrabold uppercase tracking-wider border border-amber-500/20">
          <span class="material-symbols-outlined text-[14px]">spa</span>
          ${trHtml("Rest Day")}
        </span>
      `;

      cardContent = `
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-sm">
            <span class="material-symbols-outlined text-[24px]">spa</span>
          </div>
          <div class="min-w-0">
            <h3 class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight">
              ${trHtml("Rest & Active Recovery")}
            </h3>
            <p class="text-xs text-on-surface-variant dark:text-gray-300 mt-1 leading-relaxed">
              ${trHtml("Recovery is part of your program. Focus on hydration, mobility, and recharging for your next workout.")}
            </p>
          </div>
        </div>

        <!-- Action Button Row -->
        <div class="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/15">
          <button 
            type="button"
            onclick="window.openPlannerDateDetail(${htmlJsArg(todayKey)})"
            class="py-2 px-3.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-on-surface dark:text-white font-heading text-xs font-bold hover:border-primary/40 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">edit_calendar</span>
            <span>${trHtml("Change Plan")}</span>
          </button>
        </div>
      `;
      break;
    }

    case 'missed': {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-extrabold uppercase tracking-wider border border-rose-500/20">
          <span class="material-symbols-outlined text-[14px]">error_outline</span>
          ${trHtml("Missed")}
        </span>
      `;

      const title = preset ? preset.title : tr("Scheduled Routine");
      const presetId = preset?.id || (scheduledWorkout && scheduledWorkout.type === 'preset' ? scheduledWorkout.presetId : 'full-body');

      cardContent = `
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-11 h-11 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-sm">
            <span class="material-symbols-outlined text-[24px]">history_toggle_off</span>
          </div>
          <div class="min-w-0">
            <h3 class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight truncate">
              ${trHtml("Missed:")} ${escapeHtml(translatedLabel(title))}
            </h3>
            <p class="text-xs text-on-surface-variant dark:text-gray-300 mt-1 leading-relaxed">
              ${trHtml("This workout was not logged yet. You can still complete it today or reschedule your week.")}
            </p>
          </div>
        </div>

        <!-- Action Button Row -->
        <div class="flex items-center gap-2 pt-1">
          <button 
            type="button"
            onclick="window.startScheduledWorkout(${htmlJsArg(todayKey)}, ${htmlJsArg(presetId)})"
            class="flex-1 py-2.5 px-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-heading text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[16px]">play_arrow</span>
            <span>${trHtml("Start Anyway")}</span>
          </button>
          <button 
            type="button"
            onclick="window.openPlannerDateDetail(${htmlJsArg(todayKey)})"
            class="py-2.5 px-3.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-on-surface dark:text-white font-heading text-xs font-bold hover:border-primary/40 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">event_repeat</span>
            <span>${trHtml("Reschedule")}</span>
          </button>
        </div>
      `;
      break;
    }

    case 'unplanned':
    default: {
      statusBadge = `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-extrabold uppercase tracking-wider">
          <span class="material-symbols-outlined text-[14px]">calendar_today</span>
          ${trHtml("No Plan")}
        </span>
      `;

      cardContent = `
        <div class="flex items-start gap-3 min-w-0">
          <div class="w-11 h-11 rounded-2xl bg-surface-container dark:bg-dark-surface-card-high text-on-surface-variant flex items-center justify-center shrink-0 border border-outline-variant/20 shadow-xs">
            <span class="material-symbols-outlined text-[24px]">calendar_add_on</span>
          </div>
          <div class="min-w-0">
            <h3 class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight">
              ${trHtml("Nothing planned for today")}
            </h3>
            <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-1 leading-relaxed">
              ${trHtml("Add a workout to your calendar or mark today as a rest day to keep your streak alive.")}
            </p>
          </div>
        </div>

        <!-- Action Button Row -->
        <div class="flex items-center gap-2 pt-1">
          <button 
            type="button"
            onclick="window.openPlannerDateDetail(${htmlJsArg(todayKey)})"
            class="flex-1 py-2.5 px-3 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-heading text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[16px]">add_circle</span>
            <span>${trHtml("Plan Today")}</span>
          </button>
          <button 
            type="button"
            onclick="window.setFitnessPlannerMode('workouts')"
            class="py-2.5 px-3.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-on-surface dark:text-white font-heading text-xs font-bold hover:border-primary/40 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">fitness_center</span>
            <span>${trHtml("Choose Workout")}</span>
          </button>
        </div>
      `;
      break;
    }
  }

  return `
    <!-- Today's Workout Hero Widget -->
    <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3.5 transition-all">
      
      <!-- Top Sub-Header -->
      <div class="flex items-center justify-between pb-2 border-b border-outline-variant/15">
        <div>
          <span class="text-[10px] font-extrabold tracking-wider uppercase text-on-surface-variant/80 dark:text-gray-400 block">
            ${trHtml("TODAY'S WORKOUT")}
          </span>
          <span class="font-heading font-bold text-xs text-on-surface dark:text-gray-200 block mt-0.5">
            ${todayDisplayDate}
          </span>
        </div>
        <div>
          ${statusBadge}
        </div>
      </div>

      <!-- Main Dynamic Card Body -->
      ${cardContent}
    </div>
  `;
}
