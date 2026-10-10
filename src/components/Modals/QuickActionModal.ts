import { trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState';

export function renderQuickActionModal(): string {
  const { quickActionOpen } = store.getState();
  if (!quickActionOpen) return '';

  return `
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in" onclick="if(event.target === this) window.toggleQuickActions(false)">
      <div class="w-full max-w-[430px] bg-surface-container-lowest dark:bg-dark-surface-card rounded-t-[28px] p-6 shadow-2xl border-t border-outline-variant/30 transform transition-transform animate-slide-up flex flex-col gap-5">
        
        <!-- Drag Handle -->
        <div class="w-12 h-1.5 bg-outline-variant/50 rounded-full mx-auto"></div>

        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-heading text-lg font-bold text-on-surface dark:text-white">${trHtml("Quick Actions")}</h3>
            <p class="text-xs text-on-surface-variant dark:text-gray-400">${trHtml("Capture nutrition and biometrics instantly")}</p>
          </div>
          <button onclick="window.toggleQuickActions(false)" class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant hover:text-on-surface">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Action Items Grid -->
        <div class="flex flex-col gap-2.5">
          
          <!-- AI Visual Food Scanner -->
          <button onclick="window.navigateApp('scanner'); window.toggleQuickActions(false);" class="flex items-center gap-4 p-3.5 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high hover:bg-[#EAF9F0] dark:hover:bg-primary/20 border border-outline-variant/30 transition-all text-left group">
            <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <span class="material-symbols-outlined text-[24px]">photo_camera</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-1.5">
                <span class="font-heading font-bold text-sm text-on-surface dark:text-white">${trHtml("AI Food Lens")}</span>
                <span class="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-tertiary-container/30 text-tertiary dark:text-tertiary-fixed">${trHtml("Smart")}</span>
              </div>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Instant meal detection & macro breakdown")}</p>
            </div>
            <span class="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
          </button>

          <!-- Barcode Scanner -->
          <button onclick="window.navigateApp('scanner'); window.toggleQuickActions(false);" class="flex items-center gap-4 p-3.5 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high hover:bg-[#EAF9F0] dark:hover:bg-primary/20 border border-outline-variant/30 transition-all text-left group">
            <div class="w-12 h-12 rounded-xl bg-surface-container-highest dark:bg-gray-700 text-primary dark:text-primary-container flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <span class="material-symbols-outlined text-[24px]">barcode_scanner</span>
            </div>
            <div class="flex-1">
              <span class="font-heading font-bold text-sm text-on-surface dark:text-white">${trHtml("Scan Barcode")}</span>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Search 2M+ packaged nutrition labels")}</p>
            </div>
            <span class="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
          </button>

          <!-- Quick Water Hydration (+250ml) -->
          <button onclick="window.addWater(); window.toggleQuickActions(false);" class="flex items-center gap-4 p-3.5 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high hover:bg-[#EAF9F0] dark:hover:bg-primary/20 border border-outline-variant/30 transition-all text-left group">
            <div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' 1;">water_drop</span>
            </div>
            <div class="flex-1">
              <span class="font-heading font-bold text-sm text-on-surface dark:text-white">${trHtml("Log Water (+250 ml)")}</span>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Quickly track hydration progress")}</p>
            </div>
            <span class="material-symbols-outlined text-outline text-[20px]">add</span>
          </button>

          <!-- Log Workout -->
          <button onclick="window.navigateApp('fitness'); window.toggleQuickActions(false);" class="flex items-center gap-4 p-3.5 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high hover:bg-[#EAF9F0] dark:hover:bg-primary/20 border border-outline-variant/30 transition-all text-left group">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <span class="material-symbols-outlined text-[24px]">fitness_center</span>
            </div>
            <div class="flex-1">
              <span class="font-heading font-bold text-sm text-on-surface dark:text-white">${trHtml("Record Workout")}</span>
              <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Sync active calorie burn & heart rate")}</p>
            </div>
            <span class="material-symbols-outlined text-outline text-[20px]">chevron_right</span>
          </button>

        </div>

      </div>
    </div>
  `;
}
