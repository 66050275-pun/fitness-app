import { tr, trHtml } from '../../i18n/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
import { store } from '../../store/appState';

export function renderDeleteWorkoutModal(): string {
  const state = store.getState();
  const targetId = state.deleteConfirmationWorkoutId;
  if (!targetId) return '';

  const isCancelActive = targetId === 'active_workout_cancel';
  const workout = !isCancelActive ? store.getWorkoutById(targetId) : null;
  const title = isCancelActive ? tr("Cancel Active Workout?") : tr("Delete Workout Record?");
  const message = isCancelActive
    ? tr("You have logged completed sets in this session. If you cancel now, your active workout progress will not be saved.")
    : tr("Are you sure you want to permanently delete \"{0}\"? All sets, volume, and associated personal records will be updated.", workout?.name || tr("this workout"));

  return `
    <div 
      id="delete-workout-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-workout-title" data-dialog-close="window.closeDeleteModal()"
      class="ui-dialog-layer fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onclick="if(event.target === this) window.closeDeleteModal()"
    >
      <div class="ui-dialog-panel w-full max-w-[340px] bg-surface-container-lowest dark:bg-dark-surface-card rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4">
        
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[24px]">delete</span>
          </div>
          <div>
            <h3 id="delete-workout-title" class="font-heading font-extrabold text-sm text-on-surface dark:text-white leading-snug">${title}</h3>
            <span class="text-[11px] text-error font-semibold">${trHtml("Irreversible action")}</span>
          </div>
        </div>

        <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
          ${escapeHtml(message)}
        </p>

        <div class="flex items-center gap-2 pt-1">
          <button 
            onclick="window.closeDeleteModal()" 
            class="flex-1 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs font-bold text-on-surface dark:text-white hover:bg-surface-container active:scale-95 transition-all"
          >
            ${trHtml("Cancel")}
          </button>
          
          <button 
            onclick="window.confirmDeleteWorkout()" 
            class="flex-1 py-2.5 rounded-xl bg-error text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all hover:opacity-90"
          >
            ${isCancelActive ? tr("Yes, Cancel") : tr("Delete")}
          </button>
        </div>

      </div>
    </div>
  `;
}
