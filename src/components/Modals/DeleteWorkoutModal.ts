import { escapeHtml } from '../../utils/sanitize.ts';
import { store } from '../../store/appState';

export function renderDeleteWorkoutModal(): string {
  const state = store.getState();
  const targetId = state.deleteConfirmationWorkoutId;
  if (!targetId) return '';

  const isCancelActive = targetId === 'active_workout_cancel';
  const workout = !isCancelActive ? store.getWorkoutById(targetId) : null;
  const title = isCancelActive ? 'Cancel Active Workout?' : 'Delete Workout Record?';
  const message = isCancelActive
    ? 'You have logged completed sets in this session. If you cancel now, your active workout progress will not be saved.'
    : `Are you sure you want to permanently delete "${workout?.name || 'this workout'}"? All sets, volume, and associated personal records will be updated.`;

  return `
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onclick="if(event.target === this) window.closeDeleteModal()"
    >
      <div class="w-full max-w-[340px] bg-surface-container-lowest dark:bg-dark-surface-card rounded-3xl p-5 shadow-2xl border border-outline-variant/30 flex flex-col gap-4 animate-scale-up">
        
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-error/10 text-error flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[24px]">delete</span>
          </div>
          <div>
            <h3 class="font-heading font-extrabold text-sm text-on-surface dark:text-white leading-snug">${title}</h3>
            <span class="text-[11px] text-error font-semibold">Irreversible action</span>
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
            Cancel
          </button>
          
          <button 
            onclick="window.confirmDeleteWorkout()" 
            class="flex-1 py-2.5 rounded-xl bg-error text-white text-xs font-extrabold shadow-sm active:scale-95 transition-all hover:opacity-90"
          >
            ${isCancelActive ? 'Yes, Cancel' : 'Delete'}
          </button>
        </div>

      </div>
    </div>
  `;
}
