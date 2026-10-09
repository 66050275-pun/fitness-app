import { store } from '../store/appState';
import { htmlJsArg, escapeHtml } from '../utils/sanitize';

export function renderWorkoutDetailScreen(): string {
  const state = store.getState();
  const workoutId = state.selectedWorkoutHistoryId;
  const workout = workoutId ? store.getWorkoutById(workoutId) : undefined;

  if (!workout) {
    return `
      <div class="flex flex-col min-h-screen bg-surface dark:bg-dark-surface p-6 items-center justify-center text-center">
        <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">error_outline</span>
        <h2 class="font-heading font-bold text-base text-on-surface dark:text-white">Workout Not Found</h2>
        <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-1">This workout record may have been removed.</p>
        <button onclick="window.closeWorkoutDetail()" class="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm">
          Return to Fitness
        </button>
      </div>
    `;
  }

  const startDateObj = new Date(workout.startedAt);
  const finishDateObj = workout.finishedAt ? new Date(workout.finishedAt) : startDateObj;
  
  const formattedDate = startDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedStartTime = startDateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const formattedFinishTime = finishDateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const durationMin = workout.durationSeconds > 0 ? Math.max(1, Math.round(workout.durationSeconds / 60)) : null;

  return `
    <div class="flex flex-col min-h-screen pb-12 bg-surface dark:bg-dark-surface transition-colors">
      
      <!-- Top App Bar -->
      <header class="sticky top-0 z-40 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20 shadow-sm">
        <div class="flex items-center gap-2.5">
          <button 
            onclick="window.closeWorkoutDetail()" 
            aria-label="Back to Fitness" 
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 class="font-heading font-bold text-base text-on-surface dark:text-white leading-tight">Workout Details</h1>
            <p class="text-xs text-on-surface-variant dark:text-gray-400">${formattedDate}</p>
          </div>
        </div>

        <button 
          onclick="window.openDeleteModal(${htmlJsArg(workout.id)})"
          aria-label="Delete this workout" 
          class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-error active:scale-95 transition-all"
        >
          <span class="material-symbols-outlined text-[18px]">delete_outline</span>
        </button>
      </header>

      <!-- Main Content Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">
        
        <!-- Summary Header Card -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-3.5">
          
          <div class="flex items-start justify-between">
            <div>
              <div class="flex items-center gap-2">
                <h2 class="font-heading font-extrabold text-lg text-on-surface dark:text-white leading-tight">${escapeHtml(workout.name)}</h2>
                ${workout.status === 'completed' ? `
                  <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-container text-[10px] font-extrabold flex items-center gap-0.5">
                    <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                    Completed
                  </span>
                ` : `
                  <span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold flex items-center gap-0.5">
                    <span class="material-symbols-outlined text-[12px]">schedule</span>
                    Incomplete
                  </span>
                `}
              </div>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">
                ${formattedStartTime} &ndash; ${formattedFinishTime}
              </p>
            </div>
          </div>

          <!-- 4 Core Metrics Grid -->
          <div class="grid grid-cols-2 gap-2.5 pt-1">
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl">
              <span class="text-[10px] font-bold uppercase text-on-surface-variant dark:text-gray-400 block mb-0.5">Total Duration</span>
              <span class="font-heading font-extrabold text-base text-on-surface dark:text-white">
                ${durationMin !== null ? `${durationMin} <span class="text-xs font-normal">min</span>` : '&mdash;'}
              </span>
            </div>

            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl">
              <span class="text-[10px] font-bold uppercase text-on-surface-variant dark:text-gray-400 block mb-0.5">Total Volume</span>
              <span class="font-heading font-extrabold text-base text-on-surface dark:text-white">
                ${workout.totalVolume > 0 ? `${workout.totalVolume.toLocaleString()} <span class="text-xs font-normal">kg</span>` : '&mdash;'}
              </span>
            </div>

            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl">
              <span class="text-[10px] font-bold uppercase text-on-surface-variant dark:text-gray-400 block mb-0.5">Sets Completed</span>
              <span class="font-heading font-extrabold text-base text-on-surface dark:text-white">
                ${workout.completedSetCount} <span class="text-xs font-normal">sets</span>
              </span>
            </div>

            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl">
              <span class="text-[10px] font-bold uppercase text-on-surface-variant dark:text-gray-400 block mb-0.5">Est. Calories</span>
              <span class="font-heading font-extrabold text-base text-primary dark:text-primary-container">
                ${workout.estimatedCalories !== null ? `~${workout.estimatedCalories} <span class="text-xs font-normal">kcal</span>` : '&mdash;'}
              </span>
            </div>
          </div>

        </section>

        <!-- Exercise Breakdown Section -->
        <section class="flex flex-col gap-3">
          <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Exercise Breakdown (${workout.exercises.length})</h3>

          <div class="flex flex-col gap-3">
            ${workout.exercises.map((ex, exIdx) => {
              const completedSets = ex.sets.filter(s => s.completed);
              const exerciseVolume = completedSets.reduce((sum, s) => sum + (s.weightKg * s.reps), 0);

              return `
                <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-sm flex flex-col gap-3">
                  
                  <div class="flex items-start justify-between border-b border-outline-variant/20 pb-2.5">
                    <div class="flex items-center gap-2.5">
                      <span class="w-6 h-6 rounded-full bg-surface-container dark:bg-gray-700 text-on-surface dark:text-gray-200 text-xs font-bold flex items-center justify-center">
                        ${exIdx + 1}
                      </span>
                      <div>
                        <h4 class="font-heading font-bold text-sm text-on-surface dark:text-white">${escapeHtml(ex.exerciseName)}</h4>
                        <span class="text-[11px] text-on-surface-variant dark:text-gray-400">${escapeHtml(ex.muscleGroups)}</span>
                      </div>
                    </div>

                    <div class="text-right">
                      <span class="text-xs font-bold text-primary dark:text-primary-container block">${exerciseVolume.toLocaleString()} kg vol</span>
                      <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${completedSets.length} of ${ex.sets.length} sets</span>
                    </div>
                  </div>

                  <!-- Sets Detailed List -->
                  <div class="flex flex-col gap-1.5">
                    ${ex.sets.map(s => {
                      const setVol = s.weightKg * s.reps;
                      return `
                        <div class="flex items-center justify-between py-1.5 px-2.5 rounded-xl text-xs ${
                          s.completed 
                            ? 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface dark:text-gray-200' 
                            : 'bg-surface-container-low/50 dark:bg-dark-surface-card-high/40 text-on-surface-variant line-through'
                        }">
                          <div class="flex items-center gap-2">
                            <span class="font-heading font-bold text-on-surface-variant text-[11px]">Set ${s.setNumber}</span>
                            <span class="font-medium">${s.weightKg > 0 ? `${s.weightKg} kg &times; ` : ''}${s.reps} reps</span>
                          </div>

                          <div class="flex items-center gap-2">
                            <span class="text-[11px] font-semibold text-on-surface-variant dark:text-gray-400">
                              ${s.completed ? `${setVol.toLocaleString()} kg` : 'Skipped'}
                            </span>
                            ${s.isPersonalRecord ? `
                              <span class="px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-[9px] border border-amber-500/30 flex items-center gap-0.5">
                                <span class="material-symbols-outlined text-[11px]">emoji_events</span>
                                PR
                              </span>
                            ` : ''}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- Bottom Actions -->
        <div class="flex flex-col gap-2.5 pt-2">
          <!-- Repeat Workout Button -->
          <button 
            onclick="window.repeatWorkout(${htmlJsArg(workout.id)})"
            class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-white font-heading text-xs font-extrabold shadow-glow-primary active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined text-[18px]">replay</span>
            <span>Repeat This Workout</span>
          </button>

          <!-- Delete Button -->
          <button 
            onclick="window.openDeleteModal(${htmlJsArg(workout.id)})"
            class="w-full py-3 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 text-xs font-bold text-error active:scale-95 transition-all flex items-center justify-center gap-1.5 hover:bg-red-500/10"
          >
            <span class="material-symbols-outlined text-[18px]">delete</span>
            <span>Delete Workout Record</span>
          </button>
        </div>

      </main>

    </div>
  `;
}
