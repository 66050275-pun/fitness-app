/**
 * Health Connections Sub-Screen
 * 
 * Manages:
 * - Google Health Connect integration status
 * - Sync capabilities overview (Steps, Workouts, Active calories, Weight)
 * - Strict honest state: "Not connected / Coming soon"
 * - Disabled connect button with clear explanation
 */

export function renderHealthConnectionsScreen(): string {
  return `
    <div class="flex flex-col min-h-screen pb-16 bg-surface dark:bg-dark-surface transition-colors animate-fade-in">
      
      <!-- App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <button 
            type="button" 
            onclick="window.goBackFromProfileSubpage()" 
            aria-label="Back to Profile"
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">Connected Health Apps</h1>
        </div>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Informational Banner -->
        <div class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 flex items-start gap-3 shadow-ambient">
          <span class="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">sync_alt</span>
          <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
            NutriAI is architected to exchange health measurements via Android’s standardized Health Connect platform. External sync is disabled until native certification is completed.
          </p>
        </div>

        <!-- Google Health Connect Platform Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-4">
          
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary dark:text-primary-container flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[28px]">health_and_safety</span>
              </div>
              <div>
                <h2 class="font-heading font-bold text-sm text-on-surface dark:text-white">
                  Google Health Connect
                </h2>
                <span class="text-[11px] text-on-surface-variant dark:text-gray-400 block mt-0.5">
                  Unified Android health data layer
                </span>
              </div>
            </div>

            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant border border-outline-variant/30 shrink-0">
              Not Connected
            </span>
          </div>

          <!-- Planned Sync Data Matrix -->
          <div class="pt-3 border-t border-outline-variant/20 flex flex-col gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              Planned Data Sync Capabilities
            </span>

            <div class="grid grid-cols-2 gap-2">
              <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-primary">directions_walk</span>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-on-surface dark:text-white">Daily Steps</span>
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400">Read from sensors</span>
                </div>
              </div>

              <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-orange-500">fitness_center</span>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-on-surface dark:text-white">Workouts</span>
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400">Two-way sync</span>
                </div>
              </div>

              <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-red-500">local_fire_department</span>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-on-surface dark:text-white">Active Energy</span>
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400">Burned calories</span>
                </div>
              </div>

              <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px] text-blue-500">monitor_weight</span>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-on-surface dark:text-white">Body Weight</span>
                  <span class="text-[10px] text-on-surface-variant dark:text-gray-400">Smart scale sync</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Connection Action Button (Disabled) -->
          <div class="pt-3 border-t border-outline-variant/20 flex flex-col gap-2">
            <button 
              type="button" 
              disabled
              class="w-full py-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant/50 dark:text-gray-500 border border-outline-variant/30 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span class="material-symbols-outlined text-[18px]">lock</span>
              <span>Connect to Health Connect (Coming Soon)</span>
            </button>
            <p class="text-[11px] text-on-surface-variant/80 dark:text-gray-500 text-center leading-normal">
              Native Capacitor Health Connect plugin integration will be activated upon official store deployment.
            </p>
          </div>

        </div>

      </main>

    </div>
  `;
}
