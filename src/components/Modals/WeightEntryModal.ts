/**
 * Weight Entry Modal (Add / Edit)
 * 
 * Supports:
 * - Adding a new weight record
 * - Editing an existing weight record
 * - Unit selection (kg or lb) with real-time conversion
 * - Date and time selection
 * - Optional notes
 */

import { store } from '../../store/appState';
import { kgToLb } from '../../utils/unitConversions';
import { getTodayKey } from '../../utils/dateUtils';
import { escapeHtml } from '../../utils/sanitize';

export function renderWeightEntryModal(): string {
  const state = store.getState();
  if (!state.weightModalOpen) return '';

  const editing = state.editingWeightEntry;
  const isEditing = !!editing;
  const userUnit = state.userPreferences?.weightUnit || 'kg';

  let initialDisplayWeight = '';
  if (editing) {
    initialDisplayWeight = userUnit === 'lb' 
      ? String(kgToLb(editing.weightKg))
      : String(editing.weightKg);
  } else if (state.userProfile?.currentWeightKg) {
    initialDisplayWeight = userUnit === 'lb'
      ? String(kgToLb(state.userProfile.currentWeightKg))
      : String(state.userProfile.currentWeightKg);
  }

  const initialDate = editing ? editing.date : getTodayKey();
  const initialTime = editing ? editing.time : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const initialNote = editing?.note || '';

  return `
    <div 
      id="weight-entry-modal-backdrop"
      onclick="if(event.target === this) window.closeWeightModal()"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weight-modal-title"
    >
      <div 
        class="w-full max-w-md bg-surface-container-lowest dark:bg-dark-surface-card rounded-t-[28px] border-t border-outline-variant/30 shadow-modal overflow-hidden flex flex-col animate-slide-up"
        style="padding-bottom: max(env(safe-area-inset-bottom, 16px), 16px);"
      >
        <!-- Pull Handle -->
        <div class="pt-3 pb-1 flex justify-center shrink-0">
          <div class="w-10 h-1 rounded-full bg-outline-variant/50"></div>
        </div>

        <!-- Header -->
        <div class="px-5 py-3 flex items-center justify-between border-b border-outline-variant/20 shrink-0">
          <div>
            <h2 id="weight-modal-title" class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight">
              ${isEditing ? 'Edit Weight Entry' : 'Log Weight'}
            </h2>
            <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">
              ${isEditing ? 'Update recorded measurement' : 'Record current body weight'}
            </p>
          </div>

          <button 
            type="button" 
            onclick="window.closeWeightModal()"
            aria-label="Close modal"
            class="w-8 h-8 rounded-full bg-surface-container dark:bg-dark-surface-card-high text-on-surface-variant dark:text-gray-300 hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- Form Body -->
        <form id="weight-entry-form" onsubmit="event.preventDefault(); window.submitWeightEntry();" class="p-5 flex flex-col gap-4 overflow-y-auto">
          
          <!-- Hidden editing ID -->
          <input type="hidden" id="weight-entry-id" value="${editing?.id || ''}" />

          <!-- Weight Input + Unit Toggle -->
          <div>
            <label for="weight-input-value" class="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-1.5">
              Weight
            </label>
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <input 
                  type="number" 
                  step="0.1" 
                  min="1" 
                  max="500" 
                  id="weight-input-value"
                  required
                  value="${initialDisplayWeight}"
                  placeholder="e.g. 70.5"
                  class="w-full px-4 py-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-base font-heading font-extrabold text-on-surface dark:text-white focus:border-primary focus:outline-none"
                />
              </div>

              <!-- Unit Selector Buttons -->
              <div class="flex rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 p-1 shrink-0">
                <button 
                  type="button"
                  id="weight-unit-kg-btn"
                  onclick="window.setWeightModalUnit('kg')"
                  class="px-3 py-2 rounded-lg text-xs font-bold transition-all ${userUnit === 'kg' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
                >
                  kg
                </button>
                <button 
                  type="button"
                  id="weight-unit-lb-btn"
                  onclick="window.setWeightModalUnit('lb')"
                  class="px-3 py-2 rounded-lg text-xs font-bold transition-all ${userUnit === 'lb' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
                >
                  lb
                </button>
              </div>
              <input type="hidden" id="weight-input-unit" value="${userUnit}" />
            </div>
          </div>

          <!-- Date & Time Row -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="weight-input-date" class="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-1">
                Date
              </label>
              <input 
                type="date" 
                id="weight-input-date"
                required
                value="${initialDate}"
                class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-medium text-on-surface dark:text-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label for="weight-input-time" class="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-1">
                Time
              </label>
              <input 
                type="time" 
                id="weight-input-time"
                required
                value="${initialTime}"
                class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-medium text-on-surface dark:text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <!-- Optional Note -->
          <div>
            <label for="weight-input-note" class="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-1">
              Note (Optional)
            </label>
            <input 
              type="text" 
              id="weight-input-note"
              maxlength="100"
              value="${escapeHtml(initialNote)}"
              placeholder="e.g. Morning fasted, post-workout"
              class="w-full px-3 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs text-on-surface dark:text-white focus:border-primary focus:outline-none"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
            <button 
              type="button" 
              onclick="window.closeWeightModal()"
              class="px-4 py-2.5 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface dark:text-gray-300 hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>

            <button 
              type="submit" 
              class="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all text-center"
            >
              ${isEditing ? 'Save Changes' : 'Log Weight'}
            </button>
          </div>

        </form>
      </div>
    </div>
  `;
}
