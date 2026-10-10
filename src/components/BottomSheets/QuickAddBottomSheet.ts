import { trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState';

export function renderQuickAddBottomSheet(): string {
  const { quickAddOpen } = store.getState();
  if (!quickAddOpen) return '';

  return `
    <div 
      id="quick-add-backdrop" data-dialog-close="window.closeQuickAdd()"
      class="ui-dialog-layer fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity"
      onclick="if(event.target === this) window.closeQuickAdd()"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-title"
    >
      <div 
        id="quick-add-sheet"
        class="ui-dialog-panel w-full max-w-[430px] bg-surface-container-lowest dark:bg-dark-surface-card rounded-t-[32px] p-6 shadow-2xl border-t border-outline-variant/30 transform transition-transform flex flex-col gap-4.5 pb-8 safe-bottom"
        onclick="event.stopPropagation()"
      >

        <!-- Header Row -->
        <div class="ui-dialog-header flex items-start justify-between gap-3 pt-1">
          <div>
            <h2 id="quick-add-title" class="font-heading text-lg font-bold text-on-surface dark:text-white leading-tight">${trHtml("Quick Add")}</h2>
            <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Log nutrition in the way that works for you")}</p>
          </div>
          <button 
            type="button"
            onclick="window.closeQuickAdd()" 
            aria-label="${trHtml("Close Quick Add")}"
            class="shrink-0 w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- 4 Primary Action Buttons -->
        <div class="ui-dialog-body flex flex-col gap-2.5 pt-1">
          
          <!-- Action A: Scan Food (Camera Lens) -->
          <button 
            type="button"
            onclick="window.openScannerMode('food')" 
            aria-label="${trHtml("Scan Food: Identify a meal with your camera")}"
            class="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high hover:bg-[#EAF9F0] dark:hover:bg-primary/20 border border-outline-variant/30 active:scale-[0.99] transition-all text-left group min-h-[58px] cursor-pointer"
          >
            <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
              <span class="material-symbols-outlined text-[24px]">photo_camera</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-heading font-bold text-sm text-on-surface dark:text-white group-hover:text-primary transition-colors">${trHtml("Scan Food")}</span>
                <span class="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded-full bg-primary/10 text-primary dark:text-primary-container">${trHtml("Simulation")}</span>
              </div>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5 truncate">${trHtml("Identify a meal with your camera")}</p>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-[20px]">chevron_right</span>
          </button>

          <!-- Action B: Scan Barcode (Label Lens) -->
          <button 
            type="button"
            onclick="window.openScannerMode('barcode')" 
            aria-label="${trHtml("Scan Barcode: Scan a packaged food label")}"
            class="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high hover:bg-[#EAF9F0] dark:hover:bg-primary/20 border border-outline-variant/30 active:scale-[0.99] transition-all text-left group min-h-[58px] cursor-pointer"
          >
            <div class="w-12 h-12 rounded-xl bg-surface-container-highest dark:bg-gray-700 text-primary dark:text-primary-container flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <span class="material-symbols-outlined text-[24px]">barcode_scanner</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-heading font-bold text-sm text-on-surface dark:text-white group-hover:text-primary transition-colors">${trHtml("Scan Barcode")}</span>
                <span class="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded-full bg-surface-container text-on-surface-variant">${trHtml("Prototype")}</span>
              </div>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5 truncate">${trHtml("Scan a packaged food label")}</p>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-[20px]">chevron_right</span>
          </button>

          <!-- Action C: Search Food (Database) -->
          <button 
            type="button"
            onclick="window.navigateApp('foodSearch'); window.closeQuickAdd();" 
            aria-label="${trHtml("Search Food: Find food from the nutrition database")}"
            class="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high hover:bg-[#EAF9F0] dark:hover:bg-primary/20 border border-outline-variant/30 active:scale-[0.99] transition-all text-left group min-h-[58px] cursor-pointer"
          >
            <div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <span class="material-symbols-outlined text-[24px]">search</span>
            </div>
            <div class="flex-1 min-w-0">
              <span class="font-heading font-bold text-sm text-on-surface dark:text-white group-hover:text-primary transition-colors">${trHtml("Search Food")}</span>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5 truncate">${trHtml("Find food from the nutrition database")}</p>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-[20px]">chevron_right</span>
          </button>

          <!-- Action D: Quick Log (Manual Macros) -->
          <button 
            type="button"
            onclick="window.navigateApp('quickLog'); window.closeQuickAdd();" 
            aria-label="${trHtml("Quick Log: Enter calories and macros manually")}"
            class="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high hover:bg-[#EAF9F0] dark:hover:bg-primary/20 border border-outline-variant/30 active:scale-[0.99] transition-all text-left group min-h-[58px] cursor-pointer"
          >
            <div class="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <span class="material-symbols-outlined text-[24px]">edit_note</span>
            </div>
            <div class="flex-1 min-w-0">
              <span class="font-heading font-bold text-sm text-on-surface dark:text-white group-hover:text-primary transition-colors">${trHtml("Quick Log")}</span>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5 truncate">${trHtml("Enter calories and macros manually")}</p>
            </div>
            <span class="material-symbols-outlined text-on-surface-variant/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all text-[20px]">chevron_right</span>
          </button>

        </div>

      </div>
    </div>
  `;
}
