import { trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState';
import { QUICK_ADD_ACTIONS, type QuickAddAction } from './quickAddActions';

/** Icons and routes come exclusively from the app-owned action definitions. */
function renderAction(action: QuickAddAction): string {
  return `
    <button
      type="button"
      class="quick-add-action-tile"
      data-quick-add-action="${action.id}"
      onclick="window.selectQuickAddAction('${action.id}')"
      aria-describedby="quick-add-description-${action.id}"
    >
      <span class="quick-add-action-icon" aria-hidden="true">
        <span class="material-symbols-outlined">${action.icon}</span>
      </span>
      <span class="quick-add-action-label">${trHtml(action.label)}</span>
      ${action.badge ? `<span class="quick-add-action-badge">${trHtml(action.badge)}</span>` : ''}
      <span id="quick-add-description-${action.id}" class="sr-only">${trHtml(action.description)}</span>
    </button>
  `;
}

/**
 * The existing center FAB toggles store.quickAddOpen through window.toggleQuickAdd().
 * Shared dialog infrastructure handles focus, Escape/Back and viewport bounds;
 * the bottom-sheet classes provide this menu's entry and exit presentation.
 */
export function renderQuickAddBottomSheet(): string {
  if (!store.getState().quickAddOpen) return '';

  return `
    <div
      id="quick-add-backdrop"
      class="ui-dialog-layer ui-bottom-sheet-layer fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-xs"
      data-dialog-close="window.closeQuickAdd()"
      onclick="if(event.target === this) window.closeQuickAdd()"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-title"
      aria-describedby="quick-add-subtitle"
    >
      <div
        id="quick-add-sheet"
        class="ui-dialog-panel ui-bottom-sheet-panel w-full max-w-[430px] flex flex-col shadow-2xl"
        onclick="event.stopPropagation()"
      >
        <span class="quick-add-sheet-handle" aria-hidden="true"></span>
        <div class="ui-dialog-header quick-add-sheet-header flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 id="quick-add-title" class="font-heading text-lg font-bold leading-tight">${trHtml('Quick Add')}</h2>
            <p id="quick-add-subtitle" class="quick-add-sheet-subtitle">${trHtml('Log nutrition in the way that works for you')}</p>
          </div>
          <button
            type="button"
            class="quick-add-sheet-close shrink-0 flex items-center justify-center"
            onclick="window.closeQuickAdd()"
            aria-label="${trHtml('Close Quick Add')}"
          >
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <div class="ui-dialog-body quick-add-action-grid">
          ${QUICK_ADD_ACTIONS.map(renderAction).join('')}
        </div>
      </div>
    </div>
  `;
}
