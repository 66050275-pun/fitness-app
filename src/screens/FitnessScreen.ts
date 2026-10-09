import { renderWorkoutMuscleMap } from '../components/Fitness/WorkoutMuscleMap';
import { renderExerciseIllustration } from '../components/Fitness/ExerciseIllustration';
import { store } from '../store/appState';
import { WORKOUT_PRESETS, AVAILABLE_EXERCISE_POOL } from '../data/workoutPresets';
import type { WorkoutPreset, WorkoutExercise, ActiveWorkoutSessionState, WorkoutHistoryEntry, AppState } from '../types/index.ts';
import { htmlJsArg, escapeHtml } from '../utils/sanitize';
import { renderAppHeader } from '../components/Navigation/AppHeader';
import { renderMonthlyFitnessCalendar } from '../components/Fitness/MonthlyFitnessCalendar';
import { renderWeeklyProgramEditorModal } from '../components/Fitness/WeeklyProgramEditorModal';
import { renderPlannerDateDetailModal } from '../components/Fitness/PlannerDateDetailModal';
import { renderTodaysWorkoutCard } from '../components/Fitness/TodaysWorkoutCard';

export function renderFitnessScreen(passedState?: AppState): string {
  const state = passedState || store.getState();
  const { fitnessSubView } = state;

  switch (fitnessSubView) {
    case 'setup':
      return renderWorkoutSetupView(state.selectedPresetId, state.draftWorkout);
    case 'active':
      return renderActiveWorkoutView(state.activeWorkout);
    case 'summary':
      return renderWorkoutSummaryView(state.lastWorkoutSummary);
    case 'home':
    default:
      return renderWorkoutHomeView(state);
  }
}

// ==========================================
// 1. WORKOUT HOME VIEW
// ==========================================
function renderWorkoutHomeView(state: AppState): string {
  const history = state.workoutHistory;
  const prs = store.calculatePersonalRecords();
  return `
    <div class="flex flex-col min-h-screen pb-28 bg-surface dark:bg-dark-surface transition-colors">
      
      ${renderAppHeader({
        state,
        subtitleType: 'default',
        showQuickAdd: false,
      })}

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-3">
        
        <!-- Segmented Control: Nutrition vs Fitness -->
        <div class="w-full bg-surface-container-low dark:bg-dark-surface-card p-1 rounded-full flex items-center border border-outline-variant/30 shadow-sm">
          <button onclick="window.navigateApp('dashboard')" class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-on-surface-variant dark:text-gray-400 hover:text-primary font-heading text-xs font-medium transition-all">
            <span class="material-symbols-outlined text-[16px]">restaurant</span>
            <span>Nutrition</span>
          </button>
          <button class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-surface-container-lowest dark:bg-dark-surface-card-high text-primary dark:text-primary-container shadow-sm font-heading text-xs font-bold transition-all">
            <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' 1;">fitness_center</span>
            <span>Fitness</span>
          </button>
        </div>

        <!-- Fitness Planner Sub-Mode Switcher -->
        <div class="w-full bg-surface-container-low dark:bg-dark-surface-card p-1 rounded-full flex items-center border border-outline-variant/30 shadow-sm">
          <!-- 1. My Program (Left) -->
          <button 
            type="button"
            onclick="window.setFitnessPlannerMode('program')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full font-heading text-xs font-bold transition-all ${
              state.fitnessPlannerMode === 'program'
                ? 'bg-surface-container-lowest dark:bg-dark-surface-card-high text-primary dark:text-primary-container shadow-sm'
                : 'text-on-surface-variant dark:text-gray-400 hover:text-primary'
            }"
          >
            <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' ${state.fitnessPlannerMode === 'program' ? 1 : 0};">calendar_month</span>
            <span>My Program</span>
          </button>

          <!-- 2. Choose Workout (Right) -->
          <button 
            type="button"
            onclick="window.setFitnessPlannerMode('workouts')"
            class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full font-heading text-xs font-bold transition-all ${
              state.fitnessPlannerMode !== 'program'
                ? 'bg-surface-container-lowest dark:bg-dark-surface-card-high text-primary dark:text-primary-container shadow-sm'
                : 'text-on-surface-variant dark:text-gray-400 hover:text-primary'
            }"
          >
            <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' ${state.fitnessPlannerMode !== 'program' ? 1 : 0};">fitness_center</span>
            <span>Choose Workout</span>
          </button>
        </div>

        ${state.fitnessPlannerMode === 'program' ? `
          <!-- Today's Workout Hero Card -->
          ${renderTodaysWorkoutCard(state)}

          <!-- Monthly Calendar & Program Controls -->
          ${renderMonthlyFitnessCalendar(state)}
        ` : `
        <!-- Section Title: Choose Your Workout -->
        <div class="flex items-center justify-between pt-1">
          <div>
            <h2 class="font-heading font-bold text-base text-on-surface dark:text-white">Choose Your Workout</h2>
            <p class="text-xs text-on-surface-variant dark:text-gray-400">Select a training split to customize exercises</p>
          </div>
        </div>

        <!-- Workout Preset Cards Grid -->
        <div class="flex flex-col gap-3">
          ${WORKOUT_PRESETS.map(preset => renderPresetCard(preset)).join('')}
        </div>

        <!-- PRs & Personal Records Card -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px] text-amber-500">emoji_events</span>
              <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Personal Records (PRs)</h3>
            </div>
            <span class="text-[10px] text-primary dark:text-primary-container font-semibold">${prs.length} Verified</span>
          </div>

          ${prs.length === 0 ? `
            <div class="p-6 rounded-xl border border-dashed border-outline-variant/40 text-center flex flex-col items-center justify-center">
              <span class="material-symbols-outlined text-3xl text-on-surface-variant/50 dark:text-gray-500 mb-1.5">military_tech</span>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 font-medium leading-relaxed">
                Complete weighted exercises to establish your first PR.
              </p>
            </div>
          ` : `
            <div class="grid grid-cols-2 gap-2.5">
              ${prs.map(pr => {
                const delta = pr.previousRecordValue ? pr.weightKg - pr.previousRecordValue : null;
                const safeName = escapeHtml(pr.exerciseName);
                return `
                  <button 
                    type="button"
                    onclick="window.openPersonalRecordDetail(${htmlJsArg(pr.id)})"
                    aria-label="View ${safeName} personal record"
                    class="w-full text-left bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl border border-outline-variant/20 hover:border-primary/40 active:scale-[0.97] transition-all min-h-[88px] flex flex-col justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <div class="flex items-center justify-between text-on-surface-variant dark:text-gray-400 mb-1 w-full">
                      <span class="text-[10px] font-bold uppercase truncate max-w-[95px] text-on-surface dark:text-gray-200 group-hover:text-primary transition-colors">${safeName}</span>
                      <div class="flex items-center text-amber-500">
                        <span class="material-symbols-outlined text-[14px]">emoji_events</span>
                        <span class="material-symbols-outlined text-[14px] text-on-surface-variant/40 group-hover:text-primary transition-colors ml-0.5">chevron_right</span>
                      </div>
                    </div>

                    <div>
                      <div class="flex items-baseline gap-1">
                        <span class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight">${pr.weightKg} kg</span>
                        <span class="text-[10px] text-on-surface-variant dark:text-gray-400 font-semibold">&times; ${pr.reps}</span>
                      </div>
                      <span class="text-[10px] ${delta && delta > 0 ? 'text-primary dark:text-primary-container font-semibold' : 'text-on-surface-variant dark:text-gray-400'} block mt-0.5 truncate">
                        ${delta && delta > 0 ? `+${delta} kg progression` : `Est 1RM: ${pr.estimatedOneRepMax} kg`}
                      </span>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          `}
        </section>

        <!-- Workout History Section -->
        <section class="flex flex-col gap-2.5 pt-1">
          <div class="flex items-center justify-between">
            <h3 class="font-heading text-sm font-bold text-on-surface dark:text-white">Recent Workout History</h3>
            <span class="text-xs text-on-surface-variant dark:text-gray-400">${history.length} logged</span>
          </div>

          ${history.length === 0 ? `
            <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-6 rounded-2xl border border-dashed border-outline-variant/40 text-center flex flex-col items-center">
              <div class="w-12 h-12 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant dark:text-gray-400 mb-2">
                <span class="material-symbols-outlined text-[24px]">fitness_center</span>
              </div>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 font-medium">No workouts logged yet.</p>
              <button 
                type="button"
                onclick="window.scrollTo({ top: 120, behavior: 'smooth' })"
                class="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold active:scale-95 transition-all shadow-sm"
              >
                Choose a Workout
              </button>
            </div>
          ` : `
            <div class="flex flex-col gap-2.5">
              ${history.map((item: WorkoutHistoryEntry) => {
                const dateObj = new Date(item.startedAt);
                const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const fullDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                const mins = item.durationSeconds > 0 ? Math.max(1, Math.round(item.durationSeconds / 60)) : 0;
                const isIncomplete = item.status === 'incomplete' || item.completedSetCount === 0 || !item.finishedAt;
                const safeName = escapeHtml(item.name);

                return `
                  <button 
                    type="button"
                    onclick="window.openWorkoutDetail(${htmlJsArg(item.id)})"
                    aria-label="View ${safeName} workout from ${fullDate}"
                    class="w-full text-left bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm hover:border-primary/40 active:scale-[0.99] transition-all flex items-center justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
                  >
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl ${isIncomplete ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary dark:text-primary-container'} flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[20px]">fitness_center</span>
                      </div>
                      <div>
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white group-hover:text-primary transition-colors">${safeName}</h4>
                          ${isIncomplete ? `
                            <span class="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Incomplete
                            </span>
                          ` : ''}
                        </div>
                        <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">
                          ${shortDate} &bull; ${mins > 0 ? `${mins} min` : '0 min'} &bull; ${item.completedSetCount} sets
                        </p>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <div class="text-right">
                        <span class="font-heading font-bold text-xs ${item.estimatedCalories ? 'text-primary dark:text-primary-container' : 'text-on-surface-variant dark:text-gray-400'} block">
                          ${item.estimatedCalories ? `~${item.estimatedCalories} kcal` : '&mdash;'}
                        </span>
                        <span class="text-[10px] text-on-surface-variant dark:text-gray-400 font-medium">
                          ${item.totalVolume > 0 ? `${item.totalVolume.toLocaleString()} kg vol` : '&mdash;'}
                        </span>
                      </div>
                      <span class="material-symbols-outlined text-[18px] text-on-surface-variant/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all">chevron_right</span>
                    </div>
                  </button>
                `;
              }).join('')}
            </div>
          `}
        </section>
        `}
      </main>

      ${renderWeeklyProgramEditorModal()}
      ${renderPlannerDateDetailModal()}
      ${state.plannerToastMessage ? `
        <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-surface dark:bg-white dark:text-dark-surface px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-fade-in flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px] text-primary">check_circle</span>
          <span>${escapeHtml(state.plannerToastMessage)}</span>
        </div>
      ` : ''}
    </div>
  `;
}

function renderPresetCard(preset: WorkoutPreset): string {
  const intensityColor = 
    preset.intensity === 'Very High' 
      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
      : preset.intensity === 'High' 
        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';

  return `
    <div 
      onclick="window.selectWorkoutType(${htmlJsArg(preset.id)})"
      class="bg-surface-container-lowest dark:bg-dark-surface-card p-4 rounded-2xl border border-outline-variant/30 shadow-sm hover:border-primary/50 cursor-pointer active:scale-[0.99] transition-all group"
    >
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <span class="material-symbols-outlined text-[24px]">${preset.icon}</span>
          </div>
          <div>
            <h3 class="font-heading font-bold text-sm text-on-surface dark:text-white group-hover:text-primary transition-colors">${preset.title}</h3>
            <p class="text-xs text-on-surface-variant dark:text-gray-400">${preset.subtitle}</p>
          </div>
        </div>
        
        <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${intensityColor}">
          ${preset.intensity}
        </span>
      </div>

      <!-- Detail Badges -->
      <div class="flex items-center gap-3 mt-3 pt-3 border-t border-outline-variant/20 text-xs text-on-surface-variant dark:text-gray-400">
        <div class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">format_list_bulleted</span>
          <span>${preset.exercises.length} Exercises</span>
        </div>
        <div class="flex items-center gap-1">
          <span class="material-symbols-outlined text-[14px]">timer</span>
          <span>~${preset.estimatedMinutes} min</span>
        </div>
        <div class="flex items-center gap-1 truncate max-w-[150px]">
          <span class="material-symbols-outlined text-[14px]">accessibility</span>
          <span class="truncate">${preset.primaryMuscles}</span>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// 2. WORKOUT SETUP VIEW
// ==========================================
function renderWorkoutSetupView(presetId: string | null, draftExercises: WorkoutExercise[] | null): string {
  const preset = WORKOUT_PRESETS.find(p => p.id === presetId);
  const title = preset ? preset.title : 'Custom Routine';
  const exercises = draftExercises || [];

  return `
    <div class="flex flex-col min-h-screen pb-28 bg-surface dark:bg-dark-surface transition-colors">
      
      <!-- Top App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2.5">
          <button onclick="window.cancelWorkoutSetup()" aria-label="Go Back" class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 class="font-heading font-bold text-base text-on-surface dark:text-white leading-tight">${title}</h1>
            <p class="text-xs text-on-surface-variant dark:text-gray-400">Customize sets, reps & exercise order</p>
          </div>
        </div>

        <span class="px-2.5 py-1 rounded-full bg-primary/10 text-primary dark:text-primary-container text-xs font-bold">
          ${exercises.length} Exercises
        </span>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-3.5 pt-3">
        
        <!-- Information Banner -->
        <div class="p-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center gap-2.5 text-xs text-on-surface-variant dark:text-gray-300">
          <span class="material-symbols-outlined text-primary text-[18px]">info</span>
          <span>Adjust your sets & target reps below, or add exercises before starting.</span>
        </div>

        ${renderWorkoutMuscleMap(exercises)}

        <!-- Exercise Routine List -->
        <div class="flex flex-col gap-2.5">
          ${exercises.map((ex, idx) => `
            <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col gap-3">
              
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="w-6 h-6 rounded-full bg-surface-container dark:bg-gray-700 text-on-surface dark:text-gray-200 text-xs font-bold flex items-center justify-center">
                    ${idx + 1}
                  </span>
                  <div>
                    <h3 class="font-heading font-bold text-sm text-on-surface dark:text-white">${escapeHtml(ex.name)}</h3>
                    <span class="text-[11px] text-on-surface-variant dark:text-gray-400">${escapeHtml(ex.muscleGroup)} &bull; Rest ${ex.restSeconds}s</span>
                  </div>
                </div>

                <!-- Remove Exercise Button -->
                <button 
                  onclick="window.removeDraftExercise(${idx})" 
                  aria-label="Remove exercise"
                  ${exercises.length <= 1 ? 'disabled class="text-outline/40 cursor-not-allowed"' : 'class="text-on-surface-variant hover:text-error transition-colors p-1"'}
                >
                  <span class="material-symbols-outlined text-[18px]">delete_outline</span>
                </button>
              </div>

              ${renderExerciseIllustration(ex.name)}

              <!-- Sets and Reps Counter Controls -->
              <div class="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
                
                <!-- Sets Adjuster -->
                <div class="flex items-center justify-between bg-surface-container-low dark:bg-dark-surface-card-high px-3 py-1.5 rounded-xl">
                  <span class="text-xs font-semibold text-on-surface-variant dark:text-gray-400">Sets</span>
                  <div class="flex items-center gap-2">
                    <button onclick="window.updateDraftSets(${idx}, -1)" class="w-6 h-6 rounded-full bg-surface-container dark:bg-gray-700 flex items-center justify-center text-xs font-bold active:scale-95 transition-all">-</button>
                    <span class="font-heading font-bold text-xs w-4 text-center text-on-surface dark:text-white">${ex.targetSets}</span>
                    <button onclick="window.updateDraftSets(${idx}, 1)" class="w-6 h-6 rounded-full bg-surface-container dark:bg-gray-700 flex items-center justify-center text-xs font-bold active:scale-95 transition-all">+</button>
                  </div>
                </div>

                <!-- Reps Adjuster -->
                <div class="flex items-center justify-between bg-surface-container-low dark:bg-dark-surface-card-high px-3 py-1.5 rounded-xl">
                  <span class="text-xs font-semibold text-on-surface-variant dark:text-gray-400">Reps</span>
                  <div class="flex items-center gap-2">
                    <button onclick="window.updateDraftReps(${idx}, -1)" class="w-6 h-6 rounded-full bg-surface-container dark:bg-gray-700 flex items-center justify-center text-xs font-bold active:scale-95 transition-all">-</button>
                    <span class="font-heading font-bold text-xs w-6 text-center text-on-surface dark:text-white">${ex.targetReps}</span>
                    <button onclick="window.updateDraftReps(${idx}, 1)" class="w-6 h-6 rounded-full bg-surface-container dark:bg-gray-700 flex items-center justify-center text-xs font-bold active:scale-95 transition-all">+</button>
                  </div>
                </div>

              </div>

            </div>
          `).join('')}
        </div>

        <!-- Add Exercise Expander -->
        <div class="pt-1">
          <div id="add-exercise-accordion" class="hidden bg-surface-container-lowest dark:bg-dark-surface-card p-4 rounded-2xl border border-outline-variant/30 mb-3 flex flex-col gap-2">
            <h4 class="font-heading font-bold text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-1">Select from Exercise Catalog</h4>
            <div class="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
              ${AVAILABLE_EXERCISE_POOL.map(poolEx => `
                <div class="p-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high">
                  <div class="flex items-center gap-2.5">
                    ${renderExerciseIllustration(poolEx.name, true)}
                    <div class="flex-1 min-w-0">
                    <span class="font-heading font-bold text-xs text-on-surface dark:text-white block">${escapeHtml(poolEx.name)}</span>
                    <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${escapeHtml(poolEx.muscleGroup)}</span>
                  </div>
                  <button 
                    onclick="window.addExerciseToDraft(${htmlJsArg(poolEx.name)}, ${htmlJsArg(poolEx.muscleGroup)}, ${poolEx.defaultSets}, ${poolEx.defaultReps}, ${poolEx.restSeconds})"
                    class="px-2.5 py-1 rounded-lg bg-primary text-white text-[11px] font-bold active:scale-95 transition-all"
                  >
                    + Add
                  </button>
                  </div>
                  <details class="mt-2">
                    <summary class="text-[11px] font-semibold text-primary dark:text-primary-container cursor-pointer">View exercise / ดูภาพท่า</summary>
                    <div class="mt-2">${renderExerciseIllustration(poolEx.name)}</div>
                  </details>
                </div>
              `).join('')}
            </div>
          </div>

          <button 
            onclick="document.getElementById('add-exercise-accordion').classList.toggle('hidden')" 
            class="w-full py-3 rounded-2xl border-2 border-dashed border-outline-variant/50 hover:border-primary text-primary dark:text-primary-container font-heading text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <span class="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Add Exercise from Catalog</span>
          </button>
        </div>

        <!-- Bottom Start Button (Sticky) -->
        <div class="pt-3">
          <button 
            onclick="window.startWorkout()" 
            class="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-heading text-sm font-extrabold shadow-glow-primary hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined text-[20px]">play_arrow</span>
            <span>Start Workout Session</span>
          </button>
        </div>

      </main>

    </div>
  `;
}

// ==========================================
// 3. ACTIVE WORKOUT VIEW
// ==========================================
function renderActiveWorkoutView(activeWorkout: ActiveWorkoutSessionState | null): string {
  if (!activeWorkout) {
    return `<div class="p-6 text-center text-sm">No active session. <button onclick="window.cancelWorkoutSetup()" class="text-primary underline">Return home</button></div>`;
  }

  const { currentExerciseIndex, exercises, isPaused, restTimerSeconds } = activeWorkout;
  const currentEx = exercises[currentExerciseIndex] || exercises[0];
  const timerStr = store.formatTimerString(activeWorkout.elapsedSeconds);
  const totalExercises = exercises.length;

  return `
    <div class="flex flex-col min-h-screen pb-24 bg-surface dark:bg-dark-surface transition-colors">
      
      <!-- Sticky Active Header -->
      <header class="sticky top-0 z-40 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20 shadow-sm">
        
        <!-- Title and Cancel Button -->
        <div class="flex items-center gap-2">
          <button onclick="window.cancelActiveWorkout()" aria-label="Cancel Workout" class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
          <div>
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-primary dark:text-primary-container block">Active Session</span>
            <h2 class="font-heading font-bold text-xs text-on-surface dark:text-white truncate max-w-[140px]">${escapeHtml(activeWorkout.presetTitle)}</h2>
          </div>
        </div>

        <!-- Live Elapsed Timer Display -->
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 bg-surface-container-low dark:bg-dark-surface-card px-3 py-1 rounded-full border border-outline-variant/30">
            <span class="w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-primary-container animate-pulse'}"></span>
            <span id="active-workout-timer-display" class="font-display font-extrabold text-sm text-on-surface dark:text-white">${timerStr}</span>
          </div>

          <!-- Pause / Resume Button -->
          <button onclick="window.togglePauseWorkout()" aria-label="${isPaused ? 'Resume' : 'Pause'}" class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[18px]">${isPaused ? 'play_arrow' : 'pause'}</span>
          </button>

          <!-- Finish CTA -->
          <button onclick="window.finishActiveWorkout()" class="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold active:scale-95 transition-transform shadow-sm">
            Finish
          </button>
        </div>

      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-3">
        
        <!-- Progress Stepper Header -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs text-on-surface-variant dark:text-gray-400">
            <span class="font-bold">Exercise ${currentExerciseIndex + 1} of ${totalExercises}</span>
            <span>${Math.round(((currentExerciseIndex + 1) / totalExercises) * 100)}% progress</span>
          </div>
          <div class="w-full h-1.5 bg-surface-container-highest dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-primary transition-all duration-300" style="width: ${((currentExerciseIndex + 1) / totalExercises) * 100}%"></div>
          </div>
        </div>

        <!-- Rest Timer Countdown Card (Shows when active) -->
        ${restTimerSeconds !== null ? `
          <div class="p-3.5 rounded-2xl bg-gradient-to-r from-[#e6f8f5] to-[#effdf4] dark:from-dark-surface-card dark:to-dark-surface-card-high border border-tertiary-container/40 ai-luminescence flex items-center justify-between animate-fade-in">
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-outlined text-tertiary text-[24px]" style="font-variation-settings: 'FILL' 1;">timer</span>
              <div>
                <span class="text-[10px] uppercase font-bold text-tertiary dark:text-tertiary-fixed tracking-wider block">Rest Interval</span>
                <span id="active-rest-timer-countdown" class="font-display font-extrabold text-lg text-on-surface dark:text-white leading-none">${restTimerSeconds}s</span>
              </div>
            </div>
            <button onclick="window.skipRestTimer()" class="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-700 text-tertiary dark:text-white text-xs font-bold shadow-sm active:scale-95 transition-all">
              Skip Rest
            </button>
          </div>
        ` : ''}

        <!-- Current Exercise Spotlight Card -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          
          <div class="flex items-start justify-between border-b border-outline-variant/20 pb-3">
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-heading font-extrabold text-base text-on-surface dark:text-white">${escapeHtml(currentEx.name)}</h3>
                <span class="px-2 py-0.2 rounded-full bg-primary/10 text-primary dark:text-primary-container text-[10px] font-extrabold">${currentEx.sets.length} Sets</span>
              </div>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">${escapeHtml(currentEx.muscleGroup)} &bull; Rest ${currentEx.restSeconds}s</p>
            </div>
          </div>

          ${renderExerciseIllustration(currentEx.name)}

          <!-- Sets Logging Table -->
          <div class="flex flex-col gap-2">
            <!-- Table Header -->
            <div class="grid grid-cols-12 gap-2 text-[11px] font-bold text-on-surface-variant dark:text-gray-400 px-1">
              <div class="col-span-2 text-center">SET</div>
              <div class="col-span-4 text-center">WEIGHT (KG)</div>
              <div class="col-span-4 text-center">REPS</div>
              <div class="col-span-2 text-center">DONE</div>
            </div>

            <!-- Set Rows -->
            ${currentEx.sets.map((set, sIdx) => `
              <div class="grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-all ${
                set.completed 
                  ? 'bg-[#EAF9F0] dark:bg-primary/20 border-primary-container/40' 
                  : 'bg-surface-container-low dark:bg-dark-surface-card-high border-outline-variant/30'
              }">
                <!-- Set Number -->
                <div class="col-span-2 text-center font-heading font-extrabold text-xs text-on-surface dark:text-white">
                  ${set.setNumber}
                </div>

                <!-- Weight Input -->
                <div class="col-span-4 flex items-center justify-center">
                  <input 
                    type="number" 
                    min="0" 
                    step="0.5" 
                    value="${escapeHtml(set.weightKg === 0 ? '' : set.weightKg)}"
                    placeholder="0"
                    onchange="window.updateActiveSetInput(${currentExerciseIndex}, ${sIdx}, this.value, null)"
                    class="w-16 text-center py-1 rounded-lg bg-surface-container-lowest dark:bg-dark-surface text-xs font-bold border border-outline-variant/40 focus:border-primary text-on-surface dark:text-white focus:outline-none"
                  />
                </div>

                <!-- Reps Input -->
                <div class="col-span-4 flex items-center justify-center">
                  <input 
                    type="number" 
                    min="0" 
                    value="${escapeHtml(set.actualReps)}"
                    onchange="window.updateActiveSetInput(${currentExerciseIndex}, ${sIdx}, null, this.value)"
                    class="w-16 text-center py-1 rounded-lg bg-surface-container-lowest dark:bg-dark-surface text-xs font-bold border border-outline-variant/40 focus:border-primary text-on-surface dark:text-white focus:outline-none"
                  />
                </div>

                <!-- Complete Checkbox Button -->
                <div class="col-span-2 flex justify-center">
                  <button 
                    onclick="window.completeActiveSet(${currentExerciseIndex}, ${sIdx})"
                    aria-label="Complete set ${set.setNumber}"
                    class="w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      set.completed 
                        ? 'bg-primary text-white shadow-sm scale-105' 
                        : 'bg-surface-container-highest dark:bg-gray-700 text-on-surface-variant hover:text-primary active:scale-95'
                    }"
                  >
                    <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' ${set.completed ? 1 : 0};">
                      check
                    </span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

        </section>

        <!-- Navigation Between Exercises -->
        <div class="flex items-center justify-between gap-3 pt-2">
          <button 
            onclick="window.prevActiveExercise()" 
            ${currentExerciseIndex === 0 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="active:scale-95"'}
            class="flex-1 py-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 text-xs font-bold text-on-surface dark:text-white flex items-center justify-center gap-1 transition-all"
          >
            <span class="material-symbols-outlined text-[18px]">chevron_left</span>
            <span>Previous</span>
          </button>

          ${currentExerciseIndex < totalExercises - 1 ? `
            <button 
              onclick="window.nextActiveExercise()" 
              class="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
            >
              <span>Next Exercise</span>
              <span class="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          ` : `
            <button 
              onclick="window.finishActiveWorkout()" 
              class="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-glow-primary active:scale-95 transition-all"
            >
              <span>Finish Workout</span>
              <span class="material-symbols-outlined text-[18px]">flag</span>
            </button>
          `}
        </div>

      </main>

    </div>
  `;
}

// ==========================================
// 4. WORKOUT SUMMARY VIEW
// ==========================================
function renderWorkoutSummaryView(summary: WorkoutHistoryEntry | null): string {
  if (!summary) {
    return `<div class="p-6 text-center text-sm">No summary available. <button onclick="window.cancelWorkoutSetup()" class="text-primary underline">Return Home</button></div>`;
  }

  const mins = summary.durationSeconds > 0 ? Math.max(1, Math.round(summary.durationSeconds / 60)) : 0;
  const startDate = new Date(summary.startedAt);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  const completedExCount = summary.exercises.filter(e => e.sets.some(s => s.completed)).length;
  const isIncomplete = summary.status === 'incomplete' || summary.completedSetCount === 0;

  return `
    <div class="flex flex-col min-h-screen pb-24 bg-surface dark:bg-dark-surface transition-colors">
      
      <!-- Top Celebration Banner -->
      <div class="p-6 ${isIncomplete ? 'bg-gradient-to-br from-amber-600 to-amber-800' : 'bg-gradient-to-br from-primary to-[#004d24]'} text-white flex flex-col items-center text-center shadow-lg relative overflow-hidden">
        <div class="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-2 shadow-inner">
          <span class="material-symbols-outlined text-[32px] text-white">
            ${isIncomplete ? 'schedule' : 'emoji_events'}
          </span>
        </div>
        <span class="text-[11px] font-extrabold uppercase tracking-widest text-white/90">
          ${isIncomplete ? 'Session Incomplete' : 'Session Finished'}
        </span>
        <h1 class="font-heading font-extrabold text-xl text-white mt-0.5">${escapeHtml(summary.name)}</h1>
        <p class="text-xs text-white/80">${formattedDate}</p>
      </div>

      <!-- Main Summary Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 -mt-3 relative z-10 bg-surface dark:bg-dark-surface rounded-t-3xl pt-5">
        
        <!-- 4 Key Metrics Tiles -->
        <div class="grid grid-cols-2 gap-2.5">
          
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <div class="flex items-center gap-1 text-on-surface-variant dark:text-gray-400 mb-1">
              <span class="material-symbols-outlined text-[16px]">timer</span>
              <span class="text-[11px] font-bold uppercase">Duration</span>
            </div>
            <span class="font-heading font-extrabold text-lg text-on-surface dark:text-white">${mins} <span class="text-xs font-normal">min</span></span>
          </div>

          <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <div class="flex items-center gap-1 text-on-surface-variant dark:text-gray-400 mb-1">
              <span class="material-symbols-outlined text-[16px]">task_alt</span>
              <span class="text-[11px] font-bold uppercase">Exercises</span>
            </div>
            <span class="font-heading font-extrabold text-lg text-on-surface dark:text-white">${completedExCount} / ${summary.exercises.length}</span>
          </div>

          <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <div class="flex items-center gap-1 text-on-surface-variant dark:text-gray-400 mb-1">
              <span class="material-symbols-outlined text-[16px]">repeat</span>
              <span class="text-[11px] font-bold uppercase">Total Sets</span>
            </div>
            <span class="font-heading font-extrabold text-lg text-on-surface dark:text-white">${summary.completedSetCount} <span class="text-xs font-normal">completed</span></span>
          </div>

          <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <div class="flex items-center gap-1 text-on-surface-variant dark:text-gray-400 mb-1">
              <span class="material-symbols-outlined text-[16px]">weight</span>
              <span class="text-[11px] font-bold uppercase">Total Volume</span>
            </div>
            <span class="font-heading font-extrabold text-lg text-on-surface dark:text-white">${summary.totalVolume > 0 ? `${summary.totalVolume.toLocaleString()} <span class="text-xs font-normal">kg</span>` : '&mdash;'}</span>
          </div>

        </div>

        <!-- Estimated Calorie Burn Banner -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[22px]">local_fire_department</span>
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white">
                Estimated Burn: ${summary.estimatedCalories ? `~${summary.estimatedCalories} kcal` : '&mdash;'}
              </h4>
              ${summary.estimatedCalories ? `<span class="px-1.5 py-0.2 rounded-full bg-orange-500/10 text-orange-600 text-[9px] font-extrabold uppercase">Calculated</span>` : ''}
            </div>
            <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5 leading-relaxed">
              ${summary.estimatedCalories 
                ? `Based on mechanical volume (${summary.totalVolume.toLocaleString()} kg) and duration. Connect biometric sensor in Settings for real-time heart rate accuracy.`
                : `No calories recorded as this workout did not complete weighted volume.`}
            </p>
          </div>
        </div>

        <!-- Completed Exercise Logs -->
        <section class="flex flex-col gap-2.5">
          <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Exercise Breakdown</h3>
          
          <div class="flex flex-col gap-2">
            ${summary.exercises.map(ex => `
              <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3 rounded-xl border border-outline-variant/30 text-xs">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-heading font-bold text-on-surface dark:text-white">${escapeHtml(ex.exerciseName)}</span>
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${escapeHtml(ex.muscleGroups)}</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  ${ex.sets.map(s => `
                    <span class="px-2 py-0.5 rounded-md text-[10px] ${
                      s.completed 
                        ? 'bg-primary/10 text-primary dark:text-primary-container font-semibold' 
                        : 'bg-surface-container dark:bg-gray-700 text-on-surface-variant line-through'
                    }">
                      Set ${s.setNumber}: ${s.weightKg > 0 ? `${s.weightKg}kg &times; ` : ''}${s.reps} reps
                    </span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </section>

        <!-- Actions -->
        <div class="flex flex-col gap-2 pt-2">
          <button 
            onclick="window.saveWorkoutSummary()" 
            class="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-heading text-sm font-extrabold shadow-glow-primary active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined text-[20px]">save</span>
            <span>${isIncomplete ? 'Save as Incomplete & Return Home' : 'Save Workout & Return to Home'}</span>
          </button>
          
          <button 
            onclick="window.discardWorkoutSummary()" 
            class="w-full py-3 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 text-xs font-bold text-on-surface-variant dark:text-gray-400 hover:text-error active:scale-95 transition-all"
          >
            Discard Session
          </button>
        </div>

      </main>

    </div>
  `;
}
