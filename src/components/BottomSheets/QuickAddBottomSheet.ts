import { trHtml } from '../../i18n/index.ts';
import { getFoodAnalysisBackend } from '../../services/foodAnalysisBackend.ts';
import { store } from '../../store/appState';
import { QUICK_ADD_ACTIONS, type QuickAddAction } from './quickAddActions';
import {
  renderSpecialProgramActivationFooter,
  renderSpecialProgramMenu,
} from './SpecialProgramMenu';
import { getSpecialProgramAction } from './specialProgramActions';
import { renderPhasicRecompTool } from '../PhasicTools/PhasicRecompTools';

/** Icons and routes come exclusively from the app-owned action definitions. */
function renderAction(action: QuickAddAction): string {
  const badge = action.id === 'scan-food' && getFoodAnalysisBackend() ? undefined : action.badge;
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
      ${badge ? `<span class="quick-add-action-badge">${trHtml(badge)}</span>` : ''}
      <span id="quick-add-description-${action.id}" class="sr-only">${trHtml(action.description)}</span>
    </button>
  `;
}

/** More is a separate row, keeping the standard actions in their existing 2×3 grid. */
function renderPrimaryMenu(): string {
  const more = QUICK_ADD_ACTIONS.find((action) => action.id === 'more')!;
  return `
    <div class="quick-add-action-grid">
      ${QUICK_ADD_ACTIONS.filter((action) => action.id !== 'more').map(renderAction).join('')}
    </div>
    <button
      type="button"
      class="quick-add-more-action"
      data-quick-add-action="more"
      onclick="window.selectQuickAddAction('more')"
      aria-describedby="quick-add-description-more"
    >
      <span class="quick-add-action-icon" aria-hidden="true">
        <span class="material-symbols-outlined">${more.icon}</span>
      </span>
      <span class="quick-add-more-label">
        <span>${trHtml(more.label)}</span>
        <span id="quick-add-description-more">${trHtml(more.description)}</span>
      </span>
      <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
    </button>
  `;
}

/**
 * The existing center FAB toggles store.quickAddOpen through window.toggleQuickAdd().
 * Shared dialog infrastructure handles focus, Escape/Back and viewport bounds;
 * the bottom-sheet classes provide this menu's entry and exit presentation.
 */
export function renderQuickAddBottomSheet(): string {
  const state = store.getState();
  if (!state.quickAddOpen) return '';

  const view = state.quickAddView;
  const isSpecialView = view === 'special' || view === 'tool';
  const isUnlocked = store.isSpecialProgramUnlocked();
  const tool = view === 'tool' && isUnlocked ? getSpecialProgramAction(state.selectedSpecialProgramTool) : undefined;
  const title = tool?.label ?? (isSpecialView ? 'Special Program: Phasic Recomp Tools' : 'Quick Add');
  const subtitle = tool
    ? 'Your diary and program targets'
    : isSpecialView
      ? 'Mini Cut / Lean Bulk extension menu'
      : 'Log nutrition in the way that works for you';
  const content = !isSpecialView
    ? renderPrimaryMenu()
    : tool
      ? renderPhasicRecompTool(tool.id, state.specialProgramToolError)
      : renderSpecialProgramMenu(isUnlocked);

  return `
    <div
      id="quick-add-backdrop"
      class="ui-dialog-layer ${tool ? 'phasic-tool-dialog-layer' : 'ui-bottom-sheet-layer'} fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-xs"
      data-dialog-close="${isSpecialView ? 'window.backQuickAddMenu()' : 'window.closeQuickAdd()'}"
      onclick="if(event.target === this) window.closeQuickAdd()"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-add-title"
      aria-describedby="quick-add-subtitle"
    >
      <div
        id="quick-add-sheet"
        data-quick-add-view="${view}"
        class="ui-dialog-panel ${tool ? 'phasic-tool-dialog-panel' : 'ui-bottom-sheet-panel'} w-full max-w-[430px] flex flex-col shadow-2xl"
        onclick="event.stopPropagation()"
      >
        ${tool ? '' : '<span class="quick-add-sheet-handle" aria-hidden="true"></span>'}
        <div class="ui-dialog-header quick-add-sheet-header flex items-start justify-between gap-3">
          ${isSpecialView ? `
            <button id="quick-add-sheet-back" type="button" class="ui-icon-button quick-add-sheet-back shrink-0" onclick="window.backQuickAddMenu()" aria-label="${trHtml(tool ? 'Back to Special Program tools' : 'Back to Quick Add')}">
              <span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>
            </button>
          ` : ''}
          <div class="min-w-0">
            <h2 id="quick-add-title" class="font-heading text-lg font-bold leading-tight">${trHtml(title)}</h2>
            <p id="quick-add-subtitle" class="quick-add-sheet-subtitle">${trHtml(subtitle)}</p>
          </div>
          <button
            type="button"
            id="quick-add-sheet-close"
            class="ui-icon-button quick-add-sheet-close"
            onclick="window.closeQuickAdd()"
            aria-label="${trHtml('Close Quick Add')}"
          >
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
        <div id="quick-add-menu-content" class="ui-dialog-body quick-add-menu-body">
          ${content}
        </div>
        ${isSpecialView && !isUnlocked ? renderSpecialProgramActivationFooter() : ''}
      </div>
    </div>
  `;
}
