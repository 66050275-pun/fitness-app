import { trHtml } from '../../i18n/index.ts';
import { ProgressiveOverloadService } from '../../services/progressiveOverloadService.ts';
import type { ActiveWorkoutSessionState, WorkoutExercise } from '../../types/index.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';
import { escapeHtml } from '../../utils/sanitize.ts';

/** Keep a stable surface so a committed input edit does not replace set inputs. */
export function renderWorkoutAssistantMount(workout: ActiveWorkoutSessionState): string {
  const tip = renderWorkoutAssistantTip(workout);
  return `<div data-workout-assistant-mount class="w-full min-w-0"${tip ? '' : ' hidden'}>${tip}</div>`;
}

/** Refresh recommendations without interrupting blur, focus or a following click. */
export function updateWorkoutAssistantTip(workout: ActiveWorkoutSessionState): void {
  const tip = renderWorkoutAssistantTip(workout);
  document.querySelectorAll<HTMLElement>('[data-workout-assistant-mount]').forEach(mount => {
    mount.innerHTML = tip;
    mount.hidden = !tip;
  });
}

/** Share one recommendation surface between the rest clock and the set log. */
export function renderWorkoutAssistantTip(workout: ActiveWorkoutSessionState): string {
  const suggestion = workout.overloadSuggestion;
  if (!suggestion || suggestion.exerciseIndex !== workout.currentExerciseIndex) return '';
  const exercise = workout.exercises[suggestion.exerciseIndex];
  const completedSet = exercise?.sets[suggestion.completedSetIndex];
  const nextSet = exercise?.sets[suggestion.nextSetIndex];
  if (!exercise || !completedSet?.completed || !nextSet || nextSet.completed) return '';

  const recommendation = ProgressiveOverloadService.getNextSetRecommendation(exercise, suggestion.completedSetIndex);
  if (!recommendation) return '';
  const icon = recommendation.adjustmentType === 'INCREASE_WEIGHT' ? 'trending_up'
    : recommendation.adjustmentType === 'MAINTAIN' ? 'trending_flat' : 'trending_down';
  const setNumber = formatDisplayNumber(nextSet.setNumber, 0);

  return `
    <section class="workout-assistant-tip" aria-label="${trHtml('Next set suggestion')}">
      <div class="workout-assistant-heading">
        <span class="material-symbols-outlined" aria-hidden="true">${icon}</span>
        <h4>${trHtml('Next set suggestion')}</h4>
      </div>
      <p class="workout-assistant-load">${trHtml('{0} kg · {1} reps', formatDisplayNumber(recommendation.suggestedWeightKg), formatDisplayNumber(recommendation.suggestedTargetReps, 0))}</p>
      <p class="workout-assistant-reason">${escapeHtml(recommendation.reason)}</p>
      ${recommendation.estimatedOneRepMaxKg > 0 ? `<p class="workout-assistant-estimate">${trHtml('Estimated 1RM: {0} kg', formatDisplayNumber(recommendation.estimatedOneRepMaxKg, 1))}</p>` : ''}
      ${suggestion.applied ? `
        <p class="workout-assistant-applied">
          <span class="material-symbols-outlined" aria-hidden="true">check_circle</span>
          <span>${trHtml('Applied to set {0}', setNumber)}</span>
        </p>
      ` : `
        <button type="button" class="workout-assistant-apply" onclick="window.applyOverloadSuggestion()">${trHtml('Apply to set {0}', setNumber)}</button>
      `}
    </section>
  `;
}

/** Explain the starting load before the workout begins, without hiding edits. */
export function renderWorkoutProgressionHint(exercise: WorkoutExercise): string {
  const hint = exercise.progressionHint;
  if (!hint || !Number.isFinite(hint.startingWeightKg) || hint.startingWeightKg <= 0
    || !Number.isFinite(hint.previousWeightKg) || !Number.isFinite(hint.targetReps)) return '';

  return `
    <div class="workout-progression-hint">
      <span class="material-symbols-outlined" aria-hidden="true">${hint.progressionTriggered ? 'trending_up' : 'history'}</span>
      <div>
        <p>${trHtml('Starting load from last workout')}</p>
        <strong>${hint.progressionTriggered
          ? trHtml('Progression: {0} → {1} kg', formatDisplayNumber(hint.previousWeightKg), formatDisplayNumber(hint.startingWeightKg))
          : trHtml('{0} kg · {1} reps', formatDisplayNumber(hint.startingWeightKg), formatDisplayNumber(hint.targetReps, 0))}</strong>
        ${hint.progressionTriggered ? `<span>${trHtml('Target: {0} reps', formatDisplayNumber(hint.targetReps, 0))}</span>` : ''}
      </div>
    </div>
  `;
}
