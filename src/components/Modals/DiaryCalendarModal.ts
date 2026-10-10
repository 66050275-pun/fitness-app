import { tr, trHtml, getLocale } from '../../i18n/index.ts';
import { htmlJsArg } from '../../utils/sanitize.ts';
/**
 * Diary Calendar Date Picker Modal (Bottom Sheet)
 * 
 * Supports:
 * - Free past, month, and multi-year navigation.
 * - Month & Year picker grid to jump across years without repeated clicking.
 * - Weekday headers (Monday to Sunday).
 * - Distinct today indicator and selected date state.
 * - Today quick jump, Cancel, and Apply actions.
 * - Safe area padding, backdrop dismissal, accessibility aria-labels.
 */

import { store } from '../../store/appState';
import { 
  getMonthCalendarGrid, 
  formatDiaryDate, 
  getTodayKey, 
  parseLocalDateKey
} from '../../utils/dateUtils';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function renderDiaryCalendarModal(): string {
  const state = store.getState();
  if (!state.diaryCalendarOpen) {
    return '';
  }

  const draftDateKey = state.diaryCalendarDraftDate || state.selectedDate;
  const viewYear = state.calendarViewYear;
  const viewMonth = state.calendarViewMonth; // 1..12
  const mode = state.calendarPickerMode || 'days';
  const todayKey = getTodayKey();

  const monthName = tr(MONTH_NAMES[viewMonth - 1] || "Month");
  const draftFriendly = formatDiaryDate(draftDateKey);

  // Generate Year range (e.g. currentYear - 10 to currentYear + 1)
  const currentYear = new Date().getFullYear();
  const yearsList: number[] = [];
  for (let y = currentYear - 10; y <= currentYear + 2; y++) {
    yearsList.push(y);
  }

  return `
    <div 
      id="diary-calendar-modal-backdrop"
      onclick="if(event.target === this) window.closeDiaryCalendar()"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
    >
      <div 
        class="w-full max-w-md max-h-[90vh] bg-surface-container-lowest dark:bg-dark-surface-card rounded-t-[28px] border-t border-outline-variant/30 shadow-modal overflow-hidden flex flex-col animate-slide-up"
        style="padding-bottom: max(env(safe-area-inset-bottom, 16px), 16px);"
      >
        <!-- Pull Handle -->
        <div class="pt-3 pb-1 flex justify-center shrink-0">
          <div class="w-10 h-1 rounded-full bg-outline-variant/50"></div>
        </div>

        <!-- Header -->
        <div class="px-5 py-3 flex items-center justify-between border-b border-outline-variant/20 shrink-0">
          <div>
            <h2 id="calendar-modal-title" class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight">
              ${trHtml("Choose Diary Date")}
            </h2>
            <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">
              ${draftFriendly}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button 
              type="button" 
              onclick="window.goToToday()"
              class="px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-container text-[11px] font-bold transition-all"
            >
              ${trHtml("Today")}
            </button>
            <button 
              type="button" 
              onclick="window.closeDiaryCalendar()"
              aria-label="${trHtml("Close calendar")}"
              class="w-8 h-8 rounded-full bg-surface-container dark:bg-dark-surface-card-high text-on-surface-variant dark:text-gray-300 hover:text-on-surface flex items-center justify-center transition-colors"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <!-- Month / Year Selector Header Bar -->
        <div class="px-5 py-2.5 bg-surface-container-low dark:bg-dark-surface-card-high border-b border-outline-variant/20 flex items-center justify-between shrink-0">
          <!-- Clickable Month/Year title toggles picker mode -->
          <button 
            type="button" 
            onclick="window.setCalendarPickerMode(${htmlJsArg(mode === 'days' ? 'monthYear' : 'days')})"
            class="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-xs font-bold text-on-surface dark:text-white hover:border-primary transition-all"
            aria-label="${mode === 'days' ? tr("Switch to month and year picker") : tr("Switch to days view")}"
          >
            <span>${monthName} ${viewYear}</span>
            <span class="material-symbols-outlined text-[16px] text-primary transition-transform duration-200 ${mode === 'monthYear' ? 'rotate-180' : ''}">
              arrow_drop_down
            </span>
          </button>

          <!-- Prev / Next Month Navigation Buttons -->
          <div class="flex items-center gap-1">
            <button 
              type="button" 
              onclick="window.changeCalendarMonth(-1)"
              aria-label="${trHtml("Previous month")}"
              class="w-8 h-8 rounded-lg bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-on-surface dark:text-white hover:bg-surface-container flex items-center justify-center active:scale-95 transition-all"
            >
              <span class="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button 
              type="button" 
              onclick="window.changeCalendarMonth(1)"
              aria-label="${trHtml("Next month")}"
              class="w-8 h-8 rounded-lg bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-on-surface dark:text-white hover:bg-surface-container flex items-center justify-center active:scale-95 transition-all"
            >
              <span class="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        <!-- Body: Days Grid OR Month/Year Quick Picker -->
        <div class="flex-1 overflow-y-auto p-4">
          ${mode === 'monthYear' ? `
            <!-- Month & Year Quick Selector View -->
            <div class="flex flex-col gap-4 animate-fade-in">
              <!-- Year horizontal scroll pills -->
              <div>
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 block mb-1.5">
                  ${trHtml("Select Year")}
                </span>
                <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  ${yearsList.map(yr => `
                    <button 
                      type="button" 
                      onclick="window.setCalendarViewYear(${yr})"
                      class="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                        yr === viewYear
                          ? 'bg-primary text-white shadow-xs'
                          : 'bg-surface-container dark:bg-dark-surface-card-high text-on-surface dark:text-gray-300 hover:bg-surface-container-high'
                      }"
                    >
                      ${yr}
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- 12 Months Grid -->
              <div>
                <span class="text-[10px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 block mb-1.5">
                  ${trHtml("Select Month")}
                </span>
                <div class="grid grid-cols-3 gap-2">
                  ${MONTH_SHORT.map((mShort, idx) => {
                    const mNum = idx + 1;
                    const isCurrentM = mNum === viewMonth;
                    return `
                      <button 
                        type="button" 
                        onclick="window.setCalendarViewMonth(${viewYear}, ${mNum})"
                        class="p-3 rounded-xl text-xs font-bold text-center border transition-all ${
                          isCurrentM
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-surface-container-low dark:bg-dark-surface-card-high border-outline-variant/30 text-on-surface dark:text-white hover:border-primary'
                        }"
                      >
                        ${trHtml(mShort)}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          ` : `
            <!-- Days Grid View -->
            <div class="flex flex-col gap-1.5 animate-fade-in">
              <!-- Weekday Column Headers (Monday to Sunday) -->
              <div class="grid grid-cols-7 gap-1 text-center mb-1">
                ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => `
                  <span class="text-[10px] font-extrabold text-on-surface-variant dark:text-gray-400 uppercase tracking-wider py-1">
                    ${trHtml(w)}
                  </span>
                `).join('')}
              </div>

              <!-- Days Grid Cells -->
              <div class="grid grid-cols-7 gap-1">
                ${(() => {
                  const cells = getMonthCalendarGrid(viewYear, viewMonth, draftDateKey);
                  return cells.map(cell => {
                    const isDraftSelected = cell.dateKey === draftDateKey;
                    const isCellToday = cell.dateKey === todayKey;

                    let btnClass = 'text-on-surface dark:text-gray-200 hover:bg-surface-container dark:hover:bg-dark-surface-card-high';
                    if (!cell.isCurrentMonth) {
                      btnClass = 'text-on-surface-variant/35 dark:text-gray-600';
                    }
                    if (isDraftSelected) {
                      btnClass = 'bg-primary text-white font-extrabold shadow-sm';
                    }

                    // Format accessible label
                    const cellDate = parseLocalDateKey(cell.dateKey);
                    const cellReadable = cellDate.toLocaleDateString(getLocale(), {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    });

                    return `
                      <button 
                        type="button" 
                        onclick="window.setDiaryCalendarDraftDate(${htmlJsArg(cell.dateKey)})"
                        ondblclick="window.applyDiaryCalendarDate('${cell.dateKey}')"
                        aria-label="${cellReadable}${isCellToday ? tr("(Today)") : ''}${isDraftSelected ? tr("(Selected)") : ''}"
                        class="h-10 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-semibold ${btnClass}"
                      >
                        <span>${cell.dayNum}</span>

                        <!-- Today Indicator Dot / Ring -->
                        ${isCellToday && !isDraftSelected ? `
                          <span class="w-1.5 h-1.5 rounded-full bg-primary absolute bottom-1"></span>
                        ` : ''}

                        ${isCellToday && isDraftSelected ? `
                          <span class="w-1.5 h-1.5 rounded-full bg-white absolute bottom-1"></span>
                        ` : ''}
                      </button>
                    `;
                  }).join('');
                })()}
              </div>
            </div>
          `}
        </div>

        <!-- Bottom Action Bar -->
        <div class="px-5 pt-3 pb-2 border-t border-outline-variant/20 flex items-center justify-between gap-3 bg-surface-container-lowest dark:bg-dark-surface-card shrink-0">
          <button 
            type="button" 
            onclick="window.closeDiaryCalendar()"
            class="px-4 py-2.5 rounded-xl border border-outline-variant/40 text-on-surface dark:text-gray-300 hover:bg-surface-container text-xs font-bold transition-colors"
          >
            ${trHtml("Cancel")}
          </button>

          <button 
            type="button" 
            onclick="window.applyDiaryCalendarDate()"
            class="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all text-center"
          >
            ${trHtml("Apply Date")}
          </button>
        </div>
      </div>
    </div>
  `;
}
