import { exerciseLabel } from '../../i18n/fitnessLabels.ts';
import { getLocale, tr, trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState.ts';
import type { ActiveWorkoutSessionState } from '../../types/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
import { renderWorkoutAssistantMount } from './WorkoutAssistantTip.ts';

const TICK_COUNT = 180;

function radialTicks(major: boolean): string {
  const paths: string[] = [];
  for (let tick = 0; tick < TICK_COUNT; tick += 1) {
    if ((tick % 5 === 0) !== major) continue;
    const angle = tick * 2 * Math.PI / TICK_COUNT - Math.PI / 2;
    const innerRadius = major ? 136 : 141;
    paths.push(`M${(160 + Math.cos(angle) * innerRadius).toFixed(2)},${(160 + Math.sin(angle) * innerRadius).toFixed(2)}L${(160 + Math.cos(angle) * 149).toFixed(2)},${(160 + Math.sin(angle) * 149).toFixed(2)}`);
  }
  return paths.join('');
}

const majorTicks = radialTicks(true);
const minorTicks = radialTicks(false);

function remainingSeconds(workout: ActiveWorkoutSessionState): number {
  return Number.isFinite(workout.restTimerSeconds) ? Math.max(0, Math.ceil(workout.restTimerSeconds ?? 0)) : 0;
}

function countdown(workout: ActiveWorkoutSessionState): string {
  const seconds = remainingSeconds(workout);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function progress(workout: ActiveWorkoutSessionState): number {
  const total = Number.isFinite(workout.restTimerTotal) ? Math.max(1, workout.restTimerTotal) : 1;
  return Math.min(1, remainingSeconds(workout) / total) * 100;
}

function finishLabel(workout: ActiveWorkoutSessionState): string {
  if (workout.restTimerPaused || workout.isPaused) return tr('Rest paused');
  const endsAt = workout.restTimerEndsAt ?? Date.now() + remainingSeconds(workout) * 1000;
  const time = new Date(endsAt).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false });
  return tr('Ends at {0}', time);
}

/** Updates the clock without recreating the dialog or disturbing focus. */
export function updateRestTimerDisplay(workout: ActiveWorkoutSessionState): void {
  if (workout.restTimerSeconds === null) return;
  const compact = document.getElementById('active-rest-timer-compact');
  if (compact) compact.textContent = countdown(workout);
  const layer = document.getElementById('rest-timer-dialog');
  if (!layer) return;
  const readout = layer.querySelector('#active-rest-timer-countdown');
  const finish = layer.querySelector('#rest-timer-finish-time');
  const ring = layer.querySelector('#rest-timer-progress');
  if (readout) readout.textContent = countdown(workout);
  if (finish) finish.textContent = finishLabel(workout);
  ring?.setAttribute('stroke-dasharray', `${progress(workout)} 100`);
}

/** A focused clock surface, with the app's privacy control kept above it. */
export function renderRestTimerDialog(): string {
  const state = store.getState();
  const workout = state.activeWorkout;
  if (!workout || workout.restTimerSeconds === null || !workout.restTimerOpen
    || state.currentScreen !== 'fitness' || state.fitnessSubView !== 'active') return '';

  const exercise = workout.exercises[workout.currentExerciseIndex] ?? workout.exercises[0];
  const paused = workout.restTimerPaused || workout.isPaused;
  const pauseLabel = workout.isPaused ? 'Resume Workout' : workout.restTimerPaused ? 'Resume' : 'Pause';

  return `
    <div id="rest-timer-dialog" class="ui-dialog-layer rest-timer-layer"
      data-dialog-close="window.closeRestTimer()"
      onclick="if(event.target === this) window.closeRestTimer()"
      role="dialog" aria-modal="true" aria-labelledby="rest-timer-title">
      <section class="ui-dialog-panel rest-timer-panel">
        <header class="ui-dialog-header rest-timer-header">
          <button type="button" class="rest-timer-back" onclick="window.closeRestTimer()" aria-label="${trHtml('Back to workout')}">
            <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
          <div class="rest-timer-heading">
            <h2 id="rest-timer-title">${trHtml('Rest Interval')}</h2>
            ${exercise ? `<p>${escapeHtml(exerciseLabel(exercise.name))}</p>` : ''}
          </div>
        </header>

        <div class="ui-dialog-body rest-timer-body">
          <div class="rest-timer-dial">
            <svg class="rest-timer-ticks" viewBox="0 0 320 320" fill="none" aria-hidden="true">
              <defs>
                <path id="rest-timer-major-ticks" d="${majorTicks}" />
                <path id="rest-timer-minor-ticks" d="${minorTicks}" />
                <mask id="rest-timer-progress-mask">
                  <circle id="rest-timer-progress" cx="160" cy="160" r="143" pathLength="100"
                    stroke="white" stroke-width="24" stroke-dasharray="${progress(workout)} 100" transform="rotate(-90 160 160)" />
                </mask>
              </defs>
              <circle class="rest-timer-rim" cx="160" cy="160" r="157" />
              <g class="rest-timer-ticks-muted"><use href="#rest-timer-major-ticks" /><use href="#rest-timer-minor-ticks" /></g>
              <g class="rest-timer-ticks-active" mask="url(#rest-timer-progress-mask)"><use href="#rest-timer-major-ticks" /><use href="#rest-timer-minor-ticks" /></g>
            </svg>
            <div class="rest-timer-face">
              <p class="rest-timer-label">${trHtml('Rest timer')}</p>
              <span id="active-rest-timer-countdown" class="rest-timer-countdown" role="timer" aria-live="off" aria-atomic="true">${countdown(workout)}</span>
              <p id="rest-timer-finish-time" class="rest-timer-finish-time">${escapeHtml(finishLabel(workout))}</p>
            </div>
          </div>
          <button type="button" class="rest-timer-add" onclick="window.addRestTimerSeconds(30)">
            <span class="material-symbols-outlined" aria-hidden="true">add_circle</span>
            <span>${trHtml('+30 seconds')}</span>
          </button>
          ${renderWorkoutAssistantMount(workout)}
        </div>

        <footer class="ui-dialog-footer rest-timer-controls">
          <div class="rest-timer-control">
            <button type="button" class="rest-timer-round-button rest-timer-primary" onclick="window.toggleRestTimerPause()" aria-label="${trHtml(pauseLabel)}">
              <span class="material-symbols-outlined" aria-hidden="true">${paused ? 'play_arrow' : 'pause'}</span>
            </button>
            <span>${trHtml(pauseLabel)}</span>
          </div>
          <div class="rest-timer-control">
            <button type="button" class="rest-timer-round-button rest-timer-secondary" onclick="window.skipRestTimer()" aria-label="${trHtml('Skip Rest')}">
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
            <span>${trHtml('Skip Rest')}</span>
          </div>
        </footer>
      </section>
    </div>
  `;
}
