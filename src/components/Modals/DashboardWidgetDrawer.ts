import { tr, trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState.ts';
import { htmlJsArg } from '../../utils/sanitize.ts';
import type { AppState, DashboardWidgetId } from '../../types/index.ts';

const DASHBOARD_WIDGETS: Record<DashboardWidgetId, { label: string; icon: string }> = {
  energy: { label: 'Daily Energy Budget', icon: 'bolt' },
  macros: { label: 'Macronutrients', icon: 'donut_large' },
  hydration: { label: 'Hydration', icon: 'water_drop' },
  coach: { label: 'AI Nutrition Coach', icon: 'auto_awesome' },
  meals: { label: 'Today’s Meals', icon: 'restaurant' }
};

export function renderDashboardWidgetDrawer(passedState?: AppState): string {
  const state = passedState || store.getState();
  if (!state.dashboardWidgetDrawerOpen) return '';
  return `
    <div id="dashboard-widget-drawer-backdrop" class="ui-dialog-layer bg-black/35 backdrop-blur-[2px]" data-dialog-close="window.toggleDashboardWidgetDrawer(false)" onclick="if(event.target === this) window.toggleDashboardWidgetDrawer(false)" role="dialog" aria-modal="true" aria-labelledby="dashboard-widget-drawer-title">
      <section class="ui-dialog-panel bg-surface dark:bg-dark-surface border border-outline-variant/30 shadow-2xl">
        <div class="ui-dialog-header flex items-start justify-between gap-3 px-5 py-4 border-b border-outline-variant/20">
          <div>
            <h2 id="dashboard-widget-drawer-title" class="font-heading text-base font-extrabold text-on-surface dark:text-white">${trHtml("Customize Home")}</h2>
            <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Move widgets or add and remove them from Home.")}</p>
          </div>
          <button type="button" onclick="window.toggleDashboardWidgetDrawer(false)" class="w-8 h-8 shrink-0 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant" aria-label="${trHtml("Close widget drawer")}">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div class="ui-dialog-body flex flex-col gap-2 px-5 py-4">
          ${state.dashboardWidgetOrder.map((id, index) => {
            const widget = DASHBOARD_WIDGETS[id];
            const hidden = state.hiddenDashboardWidgets.includes(id);
            return `
              <div class="min-w-0 flex items-center gap-2 p-3 rounded-2xl border ${hidden ? 'border-dashed border-outline-variant/50 bg-surface-container-low/60 opacity-75' : 'border-outline-variant/30 bg-surface-container-lowest dark:bg-dark-surface-card'}">
                <span class="material-symbols-outlined shrink-0 text-[19px] text-primary dark:text-primary-container">${widget.icon}</span>
                <span class="min-w-0 flex-1 break-words font-heading text-xs font-bold text-on-surface dark:text-white">${trHtml(widget.label)}</span>
                <div class="shrink-0 flex items-center gap-1">
                  <button type="button" onclick="window.moveDashboardWidget(${htmlJsArg(id)}, -1)" ${index === 0 ? 'disabled' : ''} class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant disabled:opacity-25" aria-label="${trHtml("Move {0} up", tr(widget.label))}">
                    <span class="material-symbols-outlined text-[17px]">keyboard_arrow_up</span>
                  </button>
                  <button type="button" onclick="window.moveDashboardWidget(${htmlJsArg(id)}, 1)" ${index === state.dashboardWidgetOrder.length - 1 ? 'disabled' : ''} class="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant disabled:opacity-25" aria-label="${trHtml("Move {0} down", tr(widget.label))}">
                    <span class="material-symbols-outlined text-[17px]">keyboard_arrow_down</span>
                  </button>
                  <button type="button" onclick="window.toggleDashboardWidget(${htmlJsArg(id)})" class="h-8 min-w-[64px] px-2 rounded-lg text-[10px] font-bold ${hidden ? 'bg-primary text-white' : 'bg-error/10 text-error'}">
                    ${hidden ? tr("Add") : tr("Remove")}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    </div>
  `;
}
