import { tr, trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState.ts';
import { htmlJsArg } from '../../utils/sanitize.ts';
import type { AppState, DashboardWidgetId } from '../../types/index.ts';

const DASHBOARD_WIDGETS: Record<DashboardWidgetId, { label: string; icon: string }> = {
  energy: { label: 'Daily Energy Budget', icon: 'bolt' },
  macros: { label: 'Macronutrients', icon: 'donut_large' },
  hydration: { label: 'Hydration', icon: 'water_drop' },
  coach: { label: 'AI Nutrition Coach', icon: 'auto_awesome' },
  meals: { label: 'Today’s Meals', icon: 'restaurant' },
};

export function renderDashboardWidgetDrawer(passedState?: AppState): string {
  const state = passedState || store.getState();
  if (!state.dashboardWidgetDrawerOpen) return '';
  return `<div id="dashboard-widget-drawer-backdrop" class="ui-dialog-layer bg-black/35 backdrop-blur-[2px]"
    data-dialog-close="window.toggleDashboardWidgetDrawer(false)" onclick="if(event.target === this) window.toggleDashboardWidgetDrawer(false)"
    role="dialog" aria-modal="true" aria-labelledby="dashboard-widget-drawer-title">
    <section class="ui-dialog-panel dashboard-widget-panel">
      <div class="ui-dialog-header dashboard-widget-header">
        <div><h2 id="dashboard-widget-drawer-title">${trHtml('Customize Home')}</h2>
          <p>${trHtml('Move widgets or add and remove them from Home.')}</p></div>
        <button id="dashboard-widget-close" type="button" onclick="window.toggleDashboardWidgetDrawer(false)" class="ui-icon-button" aria-label="${trHtml('Close widget drawer')}"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
      </div>
      <ol class="ui-dialog-body dashboard-widget-list">
        ${state.dashboardWidgetOrder.map((id, index) => {
          const widget = DASHBOARD_WIDGETS[id];
          const hidden = state.hiddenDashboardWidgets.includes(id);
          return `<li class="dashboard-widget-row ${hidden ? 'is-hidden' : ''}">
            <div class="dashboard-widget-heading"><span class="material-symbols-outlined" aria-hidden="true">${widget.icon}</span>
              <div><h3>${trHtml(widget.label)}</h3><p class="dashboard-note">${trHtml('Position {0} of {1}', index + 1, state.dashboardWidgetOrder.length)}</p></div></div>
            <div class="dashboard-widget-controls">
              <button id="dashboard-widget-${id}-up" type="button" onclick="window.moveDashboardWidget(${htmlJsArg(id)}, -1)" ${index === 0 ? 'disabled' : ''} class="ui-icon-button" aria-label="${trHtml('Move {0} up', tr(widget.label))}"><span class="material-symbols-outlined" aria-hidden="true">keyboard_arrow_up</span></button>
              <button id="dashboard-widget-${id}-down" type="button" onclick="window.moveDashboardWidget(${htmlJsArg(id)}, 1)" ${index === state.dashboardWidgetOrder.length - 1 ? 'disabled' : ''} class="ui-icon-button" aria-label="${trHtml('Move {0} down', tr(widget.label))}"><span class="material-symbols-outlined" aria-hidden="true">keyboard_arrow_down</span></button>
              <button id="dashboard-widget-${id}-visible" type="button" onclick="window.toggleDashboardWidget(${htmlJsArg(id)})"
                class="dashboard-widget-visibility" aria-pressed="${!hidden}" aria-label="${trHtml('Show {0} on Home', tr(widget.label))}">${trHtml(hidden ? 'Hidden' : 'Visible')}</button>
            </div>
          </li>`;
        }).join('')}
      </ol>
    </section>
  </div>`;
}
