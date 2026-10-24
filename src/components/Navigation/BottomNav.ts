import { trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState';
import type { ActiveScreen } from '../../types/index.ts';

const DESTINATIONS = [
  { screen: 'dashboard', label: 'Home', icon: 'home' },
  { screen: 'diary', label: 'Diary', icon: 'calendar_today' },
  { screen: 'insights', label: 'Insights', icon: 'insights' },
  { screen: 'coach', label: 'AI Coach', icon: 'smart_toy' },
] as const;

function renderDestination(item: typeof DESTINATIONS[number], currentScreen: ActiveScreen, menuOpen: boolean): string {
  const active = currentScreen === item.screen;
  return `
    <button type="button" id="nav-tab-${item.screen}" data-tab="${item.screen}"
      onclick="window.navigateApp('${item.screen}')"
      ${active ? 'aria-current="page"' : ''} ${menuOpen ? 'disabled' : ''}
      class="app-nav-destination ${active ? 'is-active' : ''}">
      <span class="app-nav-icon" aria-hidden="true">
        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${active ? 1 : 0};">${item.icon}</span>
      </span>
      <span class="app-nav-label">${trHtml(item.label)}</span>
    </button>`;
}

/** Keep destination IDs and the center toggle stable for the shared dialog lifecycle. */
export function renderBottomNav(): string {
  const { currentScreen, quickAddOpen } = store.getState();
  return `
    <nav class="app-bottom-nav" aria-label="${trHtml('Main navigation')}">
      ${DESTINATIONS.slice(0, 2).map(item => renderDestination(item, currentScreen, quickAddOpen)).join('')}
      <div class="app-nav-add">
        <button type="button" id="nav-fab-quick-add" data-action="quick-add"
          onclick="window.toggleQuickAdd()"
          aria-label="${trHtml(quickAddOpen ? 'Close Quick Add' : 'Open Quick Add')}"
          aria-haspopup="dialog" aria-expanded="${quickAddOpen}" aria-controls="quick-add-backdrop"
          class="app-nav-fab ${quickAddOpen ? 'is-open' : ''}">
          <span class="material-symbols-outlined" aria-hidden="true">add</span>
        </button>
        <span class="app-nav-label" aria-hidden="true">${trHtml(quickAddOpen ? 'Close' : 'Add')}</span>
      </div>
      ${DESTINATIONS.slice(2).map(item => renderDestination(item, currentScreen, quickAddOpen)).join('')}
    </nav>`;
}
