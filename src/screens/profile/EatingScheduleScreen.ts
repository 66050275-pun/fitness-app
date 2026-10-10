import { trHtml } from '../../i18n/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
/**
 * Eating Schedule Sub-Screen
 * 
 * Manages:
 * - Eating window toggle
 * - Daily Start time & End time
 * - Active days of the week
 * - Schedule summary
 * - Reminder settings UI (with clear local/unconnected notice)
 * - Required medical disclaimer
 */

import { store } from '../../store/appState';

const DAYS_SHORT = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' }
];

export function renderEatingScheduleScreen(): string {
  const state = store.getState();
  const schedule = state.eatingSchedule || {
    enabled: false,
    startTime: '12:00',
    endTime: '20:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    remindersEnabled: false
  };

  // Compute duration
  let durationHours = 8;
  try {
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const startMins = (startH * 60) + startM;
    const endMins = (endH * 60) + endM;
    const diffMins = endMins >= startMins ? (endMins - startMins) : (1440 - startMins + endMins);
    durationHours = Math.round((diffMins / 60) * 10) / 10;
  } catch {}

  const fastHours = Math.max(0, 24 - durationHours);

  return `
    <div class="flex flex-col min-h-screen pb-16 bg-surface dark:bg-dark-surface transition-colors animate-fade-in">
      
      <!-- App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <button 
            type="button" 
            onclick="window.goBackFromProfileSubpage()" 
            aria-label="${trHtml("Back to Profile")}"
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">${trHtml("Eating Schedule")}</h1>
        </div>

        <button 
          type="submit" 
          form="eating-schedule-form"
          class="text-xs font-bold text-white px-4 py-1.5 rounded-full bg-primary hover:brightness-105 active:scale-95 transition-all shadow-xs"
        >
          ${trHtml("Save")}
        </button>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Disclaimer Banner -->
        <div class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 flex items-start gap-3 shadow-ambient">
          <span class="material-symbols-outlined text-[20px] text-amber-500 shrink-0 mt-0.5">health_and_safety</span>
          <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
            ${trHtml("Eating schedules are personal and may not be appropriate for everyone. Individuals with a history of disordered eating, pregnancy, or specific medical conditions should consult a physician before restricting meal windows.")}
          </p>
        </div>

        <form id="eating-schedule-form" onsubmit="event.preventDefault(); window.submitEatingSchedule();" class="flex flex-col gap-4">
          
          <!-- Master Toggle Card -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex items-center justify-between">
            <div>
              <span class="font-heading font-bold text-sm text-on-surface dark:text-white block">
                ${trHtml("Use an Eating Window")}
              </span>
              <span class="text-xs text-on-surface-variant dark:text-gray-400 block mt-0.5">
                ${trHtml("Designate specific hours during which meals are consumed")}
              </span>
            </div>

            <button 
              type="button"
              onclick="window.toggleEatingWindowEnabled()"
              class="w-12 h-7 rounded-full transition-colors p-1 flex items-center ${schedule.enabled ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'}"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
            </button>
            <input type="hidden" id="eating-schedule-enabled" value="${escapeHtml(schedule.enabled ? 'true' : 'false')}" />
          </div>

          <!-- Window Configuration (Visible if enabled) -->
          <div id="schedule-config-section" class="${schedule.enabled ? '' : 'opacity-40 pointer-events-none'} transition-opacity flex flex-col gap-4">
            
            <!-- Summary Overview -->
            <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex items-center justify-between">
              <div>
                <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 block">
                  ${trHtml("Window Ratio")}
                </span>
                <span class="font-heading font-extrabold text-lg text-primary dark:text-primary-container block mt-0.5">
                  ${durationHours}${trHtml("h Eating •")} ${fastHours}${trHtml("h Fasting")}
                </span>
              </div>
              <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-[22px]">hourglass_empty</span>
              </div>
            </div>

            <!-- Times Card -->
            <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
              <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                ${trHtml("Window Hours")}
              </span>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="schedule-start-time" class="block text-xs font-semibold text-on-surface dark:text-gray-200 mb-1">
                    ${trHtml("First Meal (Start)")}
                  </label>
                  <input 
                    type="time" 
                    id="schedule-start-time"
                    value="${escapeHtml(schedule.startTime)}"
                    class="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-medium text-on-surface dark:text-white focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label for="schedule-end-time" class="block text-xs font-semibold text-on-surface dark:text-gray-200 mb-1">
                    ${trHtml("Last Meal (End)")}
                  </label>
                  <input 
                    type="time" 
                    id="schedule-end-time"
                    value="${escapeHtml(schedule.endTime)}"
                    class="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-medium text-on-surface dark:text-white focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <!-- Days of Week Card -->
            <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
              <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                ${trHtml("Active Days")}
              </span>

              <div class="grid grid-cols-7 gap-1.5">
                ${DAYS_SHORT.map(d => {
                  const isActive = schedule.daysOfWeek.includes(d.id);
                  return `
                    <button
                      type="button"
                      onclick="window.toggleEatingDay(${d.id})"
                      class="py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive 
                          ? 'bg-primary text-white shadow-xs' 
                          : 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant'
                      }"
                    >
                      ${trHtml(d.label)}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Reminders Card -->
            <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <div>
                  <span class="font-heading font-bold text-xs text-on-surface dark:text-white block">
                    ${trHtml("Window Reminder Notifications")}
                  </span>
                  <span class="text-[11px] text-on-surface-variant dark:text-gray-400 block mt-0.5">
                    ${trHtml("Notify at window opening and closing times")}
                  </span>
                </div>

                <button 
                  type="button"
                  onclick="window.toggleEatingReminders()"
                  class="w-12 h-7 rounded-full transition-colors p-1 flex items-center ${schedule.remindersEnabled ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'}"
                >
                  <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
                </button>
              </div>

              <div class="pt-2 border-t border-outline-variant/20 flex items-center gap-2 text-[10px] text-on-surface-variant dark:text-gray-400">
                <span class="material-symbols-outlined text-[14px]">info</span>
                <span>${trHtml("Requires active app session. Native push notifications planned for future update.")}</span>
              </div>
            </div>

          </div>

          <!-- Save Button -->
          <button 
            type="submit" 
            class="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all text-center mt-1"
          >
            ${trHtml("Save Eating Schedule")}
          </button>

        </form>

      </main>

    </div>
  `;
}
