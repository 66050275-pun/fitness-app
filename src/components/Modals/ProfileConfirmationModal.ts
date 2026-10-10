import { trHtml } from '../../i18n/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
import { htmlJsArg } from '../../utils/sanitize.ts';
/**
 * Profile Confirmation Modal Component
 * 
 * Reusable modal for confirming destructive or significant actions:
 * - Deleting a weight entry
 * - Resetting goals
 * - Deleting food history, workout history, or all local data
 */

import { store } from '../../store/appState';

export function renderProfileConfirmationModal(): string {
  const state = store.getState();
  const modal = state.profileConfirmModal;
  if (!modal) return '';

  const {
    title,
    message,
    confirmLabel,
    confirmColorClass = 'bg-error text-white',
    requireTypingText
  } = modal;

  return `
    <div 
      id="profile-confirm-modal-backdrop" data-dialog-close="window.closeProfileConfirmModal()"
      onclick="if(event.target === this) window.closeProfileConfirmModal()"
      class="ui-dialog-layer fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div class="ui-dialog-panel w-full max-w-sm bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl border border-outline-variant/30 p-5 shadow-modal flex flex-col gap-4">
        
        <!-- Header -->
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[24px]">warning</span>
          </div>
          <div>
            <h3 id="confirm-modal-title" class="font-heading font-bold text-base text-on-surface dark:text-white leading-tight">
              ${escapeHtml(title)}
            </h3>
            <p class="text-xs text-on-surface-variant dark:text-gray-300 mt-1 leading-relaxed">
              ${escapeHtml(message)}
            </p>
          </div>
        </div>

        <!-- Optional required text match (e.g. DELETE) -->
        ${requireTypingText ? `
          <div class="flex flex-col gap-1.5 pt-1">
            <label for="confirm-typing-input" class="text-[11px] font-semibold text-on-surface-variant dark:text-gray-400">
              ${trHtml("Type")} <strong class="text-error font-extrabold uppercase">${escapeHtml(requireTypingText)}</strong> ${trHtml("to confirm:")}
            </label>
            <input 
              type="text"
              id="confirm-typing-input" data-dialog-draft data-dialog-draft-effect="input"
              oninput="document.getElementById('confirm-action-button').disabled = (this.value.trim() !== ${htmlJsArg(requireTypingText)})"
              class="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-mono text-on-surface dark:text-white uppercase focus:border-error focus:outline-none"
              placeholder="${escapeHtml(requireTypingText)}"
            />
          </div>
        ` : ''}

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/20">
          <button
            type="button"
            onclick="window.closeProfileConfirmModal()"
            class="px-4 py-2.5 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface dark:text-gray-300 hover:bg-surface-container transition-colors"
          >
            ${trHtml("Cancel")}
          </button>
          
          <button
            type="button"
            id="confirm-action-button"
            ${requireTypingText ? 'disabled' : ''}
            onclick="window.executeProfileConfirmModalAction()"
            class="px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${confirmColorClass}"
          >
            ${escapeHtml(confirmLabel)}
          </button>
        </div>

      </div>
    </div>
  `;
}
