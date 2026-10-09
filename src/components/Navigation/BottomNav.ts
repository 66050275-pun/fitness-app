import { store } from '../../store/appState';

export function renderBottomNav(): string {
  const { currentScreen, quickAddOpen } = store.getState();

  const isHome = currentScreen === 'dashboard';
  const isDiary = currentScreen === 'diary';
  const isInsights = currentScreen === 'insights';
  const isCoach = currentScreen === 'coach';

  return `
    <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-xl border-t border-outline-variant/30 px-3 py-2.5 grid grid-cols-5 items-center transition-colors shadow-lg">
      
      <!-- 1. Home Tab -->
      <button 
        type="button"
        id="nav-tab-dashboard"
        data-tab="dashboard"
        onclick="window.navigateApp('dashboard')" 
        aria-label="Home"
        class="justify-self-center flex flex-col items-center gap-1 transition-all group ${isHome ? 'text-primary dark:text-primary-container scale-105' : 'text-on-surface-variant hover:text-primary'}"
      >
        <div class="relative flex items-center justify-center">
          <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' ${isHome ? 1 : 0};">home</span>
          ${isHome ? '<span class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary dark:bg-primary-container"></span>' : ''}
        </div>
        <span class="text-[11px] font-semibold tracking-tight">Home</span>
      </button>

      <!-- 2. Diary Tab -->
      <button 
        type="button"
        id="nav-tab-diary"
        data-tab="diary"
        onclick="window.navigateApp('diary')" 
        aria-label="Diary"
        class="justify-self-center flex flex-col items-center gap-1 transition-all group ${isDiary ? 'text-primary dark:text-primary-container scale-105' : 'text-on-surface-variant hover:text-primary'}"
      >
        <div class="relative flex items-center justify-center">
          <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' ${isDiary ? 1 : 0};">calendar_today</span>
          ${isDiary ? '<span class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary dark:bg-primary-container"></span>' : ''}
        </div>
        <span class="text-[11px] font-semibold tracking-tight">Diary</span>
      </button>

      <!-- 3. Center Add (+) FAB Button (Opens Quick Add Bottom Sheet) -->
      <div class="relative -top-5 justify-self-center flex flex-col items-center">
        <button 
          type="button"
          id="nav-fab-quick-add"
          data-action="quick-add"
          onclick="window.toggleQuickAdd()" 
          aria-label="${quickAddOpen ? 'Close Quick Add' : 'Open Quick Add'}"
          class="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary flex items-center justify-center scan-fab-glow hover:scale-105 active:scale-95 transition-transform border-4 border-surface dark:border-dark-surface shadow-xl"
        >
          <span class="material-symbols-outlined text-[30px] transition-transform duration-200 ${quickAddOpen ? 'rotate-45' : ''}">add</span>
        </button>
        <span class="text-[10px] font-bold text-primary dark:text-primary-container tracking-wider uppercase mt-1">Add</span>
      </div>

      <!-- 4. Insights Tab -->
      <button 
        type="button"
        id="nav-tab-insights"
        data-tab="insights"
        onclick="window.navigateApp('insights')" 
        aria-label="Insights"
        class="justify-self-center flex flex-col items-center gap-1 transition-all group ${isInsights ? 'text-primary dark:text-primary-container scale-105' : 'text-on-surface-variant hover:text-primary'}"
      >
        <div class="relative flex items-center justify-center">
          <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' ${isInsights ? 1 : 0};">insights</span>
          ${isInsights ? '<span class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary dark:bg-primary-container"></span>' : ''}
        </div>
        <span class="text-[11px] font-semibold tracking-tight">Insights</span>
      </button>

      <!-- 5. AI Coach Tab -->
      <button 
        type="button"
        id="nav-tab-coach"
        data-tab="coach"
        onclick="window.navigateApp('coach')" 
        aria-label="AI Coach"
        class="justify-self-center flex flex-col items-center gap-1 transition-all group ${isCoach ? 'text-primary dark:text-primary-container scale-105' : 'text-on-surface-variant hover:text-primary'}"
      >
        <div class="relative flex items-center justify-center">
          <span class="material-symbols-outlined text-[24px]" style="font-variation-settings: 'FILL' ${isCoach ? 1 : 0};">smart_toy</span>
          ${isCoach ? '<span class="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary dark:bg-primary-container"></span>' : ''}
        </div>
        <span class="text-[11px] font-semibold tracking-tight">AI Coach</span>
      </button>
      
    </nav>
  `;
}
