import { translatedMuscles, exerciseLabel } from '../i18n/fitnessLabels.ts';
import { tr, trHtml, getLocale, translatedLabel } from '../i18n/index.ts';
import { store } from '../store/appState';
import { htmlJsArg, escapeHtml } from '../utils/sanitize';

export function renderPersonalRecordDetailScreen(): string {
  const state = store.getState();
  const exerciseName = state.selectedPersonalRecordExerciseId;
  const prs = store.calculatePersonalRecords();
  const pr = prs.find(p => p.exerciseName.trim().toLowerCase() === (exerciseName || '').trim().toLowerCase()) 
    || prs.find(p => p.id === exerciseName);

  if (!pr) {
    return `
      <div class="flex flex-col min-h-screen bg-surface dark:bg-dark-surface p-6 items-center justify-center text-center">
        <span class="material-symbols-outlined text-4xl text-on-surface-variant mb-2">emoji_events</span>
        <h2 class="font-heading font-bold text-base text-on-surface dark:text-white">${trHtml("No Record Found")}</h2>
        <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-1">${trHtml("Complete weighted exercises to establish your first PR.")}</p>
        <button onclick="window.closePersonalRecordDetail()" class="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm">
          ${trHtml("Return to Fitness")}
        </button>
      </div>
    `;
  }

  const occurrences = store.getExerciseHistory(pr.exerciseName);
  const deltaKg = pr.previousRecordValue ? pr.weightKg - pr.previousRecordValue : null;

  return `
    <div class="flex flex-col min-h-screen pb-12 bg-surface dark:bg-dark-surface transition-colors">
      
      <!-- Top App Bar -->
      <header class="sticky top-0 z-40 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20 shadow-sm">
        <div class="flex items-center gap-2.5">
          <button 
            onclick="window.closePersonalRecordDetail()" 
            aria-label="${trHtml("Back to Fitness")}"
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 class="font-heading font-bold text-base text-on-surface dark:text-white leading-tight">${escapeHtml(exerciseLabel(pr.exerciseName))}</h1>
            <p class="text-xs text-on-surface-variant dark:text-gray-400">${escapeHtml(translatedMuscles(pr.muscleGroup))}</p>
          </div>
        </div>

        <span class="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-extrabold flex items-center gap-1 border border-amber-500/20">
          <span class="material-symbols-outlined text-[14px]">emoji_events</span>
          ${trHtml("Personal Record")}
        </span>
      </header>

      <!-- Main Content Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">
        
        <!-- Hero PR Highlight Card -->
        <section class="p-5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-primary/15 to-[#004d24]/20 dark:bg-dark-surface-card border border-amber-500/30 shadow-ambient flex flex-col items-center text-center relative overflow-hidden">
          
          <div class="w-14 h-14 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg mb-2">
            <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1;">emoji_events</span>
          </div>

          <span class="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">${trHtml("Current All-Time Record")}</span>
          <div class="flex items-baseline gap-1.5 my-1">
            <span class="font-display font-extrabold text-3xl text-on-surface dark:text-white">${pr.weightKg}</span>
            <span class="text-base font-bold text-on-surface dark:text-gray-200">${trHtml("kg")}</span>
            <span class="text-sm font-semibold text-on-surface-variant dark:text-gray-400">${trHtml("&times;")} ${pr.reps} ${trHtml("reps")}</span>
          </div>

          <p class="text-xs text-on-surface-variant dark:text-gray-300">
            ${trHtml("Achieved on")} <strong>${escapeHtml(pr.achievedAt)}</strong> ${trHtml("in workout")} <em>${escapeHtml(translatedLabel(pr.workoutName))}</em>
          </p>
        </section>

        <!-- Analytics Metric Tiles -->
        <div class="grid grid-cols-2 gap-2.5">
          
          <!-- Estimated 1RM (Epley) -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <div class="flex items-center justify-between text-on-surface-variant dark:text-gray-400 mb-1">
              <span class="text-[10px] font-bold uppercase">${trHtml("Estimated 1RM")}</span>
              <span class="material-symbols-outlined text-[14px] text-primary">functions</span>
            </div>
            <span class="font-heading font-extrabold text-lg text-on-surface dark:text-white">${pr.estimatedOneRepMax} <span class="text-xs font-normal">${trHtml("kg")}</span></span>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Epley Formula: w &times; (1 + r/30)")}</span>
          </div>

          <!-- Progression Delta -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <div class="flex items-center justify-between text-on-surface-variant dark:text-gray-400 mb-1">
              <span class="text-[10px] font-bold uppercase">${trHtml("Progression Delta")}</span>
              <span class="material-symbols-outlined text-[14px] ${deltaKg && deltaKg > 0 ? 'text-primary' : 'text-on-surface-variant'}">trending_up</span>
            </div>
            <span class="font-heading font-extrabold text-lg ${deltaKg && deltaKg > 0 ? 'text-primary dark:text-primary-container' : 'text-on-surface dark:text-white'}">
              ${deltaKg !== null ? tr("{0} kg", deltaKg > 0 ? `+${deltaKg}` : deltaKg) : tr("Baseline")}
            </span>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">
              ${pr.previousRecordValue ? tr("Prev: {0} kg", pr.previousRecordValue) : tr("Initial verified test")}
            </span>
          </div>

          <!-- Total Lifetime Sessions -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <div class="flex items-center justify-between text-on-surface-variant dark:text-gray-400 mb-1">
              <span class="text-[10px] font-bold uppercase">${trHtml("Training Frequency")}</span>
              <span class="material-symbols-outlined text-[14px]">event_repeat</span>
            </div>
            <span class="font-heading font-extrabold text-lg text-on-surface dark:text-white">${pr.totalTimesPerformed} <span class="text-xs font-normal">${trHtml("sessions")}</span></span>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Recorded in workout logs")}</span>
          </div>

          <!-- Latest Workout Occurrence -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col cursor-pointer hover:border-primary/40 transition-all" onclick="window.openWorkoutDetail(${htmlJsArg(pr.workoutId)})">
            <div class="flex items-center justify-between text-on-surface-variant dark:text-gray-400 mb-1">
              <span class="text-[10px] font-bold uppercase">${trHtml("Latest Session")}</span>
              <span class="material-symbols-outlined text-[14px] text-primary">chevron_right</span>
            </div>
            <span class="font-heading font-bold text-xs text-primary dark:text-primary-container truncate">${escapeHtml(translatedLabel(pr.workoutName))}</span>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Tap to view full session")}</span>
          </div>

        </div>

        <!-- Exercise History Timeline (Newest to Oldest) -->
        <section class="flex flex-col gap-2.5 pt-2">
          <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">${trHtml("Exercise History Timeline (")}${occurrences.length})</h3>

          <div class="flex flex-col gap-2.5">
            ${occurrences.map(occ => `
              <div 
                onclick="window.openWorkoutDetail(${htmlJsArg(occ.workoutId)})"
                class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm hover:border-primary/40 cursor-pointer active:scale-[0.99] transition-all flex flex-col gap-2 group"
              >
                <div class="flex items-start justify-between">
                  <div>
                    <div class="flex items-center gap-1.5">
                      <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white group-hover:text-primary transition-colors">${escapeHtml(translatedLabel(occ.workoutName))}</h4>
                      ${occ.hasPR ? `
                        <span class="px-1.5 py-0.2 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-[9px] border border-amber-500/30 flex items-center gap-0.5">
                          <span class="material-symbols-outlined text-[10px]">emoji_events</span>
                          ${trHtml("PR")}
                        </span>
                      ` : ''}
                    </div>
                    <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${escapeHtml(occ.date)}</span>
                  </div>

                  <div class="text-right">
                    <span class="font-heading font-extrabold text-xs text-on-surface dark:text-white">${occ.bestSet.weightKg} ${trHtml("kg &times;")} ${occ.bestSet.reps}</span>
                    <span class="text-[10px] text-primary dark:text-primary-container font-semibold block">${occ.totalExerciseVolume.toLocaleString(getLocale())} ${trHtml("kg vol")}</span>
                  </div>
                </div>

                <!-- Sets mini breakdown -->
                <div class="flex flex-wrap gap-1 pt-1.5 border-t border-outline-variant/20">
                  ${occ.sets.map(s => `
                    <span class="px-1.5 py-0.5 rounded text-[10px] ${
                      s.isPersonalRecord 
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold' 
                        : s.completed 
                          ? 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface dark:text-gray-300' 
                          : 'bg-surface-container/40 text-on-surface-variant line-through'
                    }">
                      ${s.weightKg > 0 ? tr("{0}k &times;", s.weightKg) : ''}${s.reps}
                    </span>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </section>

      </main>

    </div>
  `;
}
