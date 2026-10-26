import { trHtml } from '../../i18n/index.ts';
import {
  SPECIAL_PROGRAM_ACTIONS,
  type SpecialProgramAction,
} from './specialProgramActions';

function renderToolAction(action: SpecialProgramAction): string {
  return `
    <button
      type="button"
      id="special-program-${action.id}"
      class="quick-add-action-tile special-program-action-tile"
      data-special-program-tool="${action.id}"
      onclick="window.selectSpecialProgramTool('${action.id}')"
      aria-describedby="special-program-description-${action.id}"
    >
      <span class="quick-add-action-icon" aria-hidden="true">
        <span class="material-symbols-outlined">${action.icon}</span>
      </span>
      <span class="quick-add-action-label">${trHtml(action.label)}</span>
      <span id="special-program-description-${action.id}" class="sr-only">${trHtml(action.description)}</span>
    </button>
  `;
}

/** Locked previews are plain list items: they cannot invoke tool callbacks. */
function renderLockedTool(action: SpecialProgramAction): string {
  return `
    <li class="quick-add-action-tile special-program-preview-tile">
      <span class="quick-add-action-icon" aria-hidden="true">
        <span class="material-symbols-outlined">${action.icon}</span>
      </span>
      <span class="quick-add-action-label">${trHtml(action.label)}</span>
      <span class="special-program-tile-lock">
        <span class="material-symbols-outlined" aria-hidden="true">lock</span>
        <span class="sr-only">${trHtml('Locked')}</span>
      </span>
    </li>
  `;
}

/** Render inside the existing sheet, so there is only one backdrop/focus trap. */
export function renderSpecialProgramMenu(isUnlocked: boolean): string {
  if (isUnlocked) {
    return `
      <div class="special-program-menu" data-program-state="unlocked">
        <div class="special-program-status">
          <span class="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
          <div>
            <p class="special-program-status-label">${trHtml('Your program tools')}</p>
            <p>${trHtml('Use today’s diary and your saved program targets.')}</p>
          </div>
        </div>
        <div class="quick-add-action-grid special-program-action-grid" role="group" aria-label="${trHtml('Your program tools')}">
          ${SPECIAL_PROGRAM_ACTIONS.map(renderToolAction).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="special-program-menu" data-program-state="locked">
      <div class="special-program-lock-card">
        <span class="special-program-lock-icon material-symbols-outlined" aria-hidden="true">lock</span>
        <h3>${trHtml('Built for Mini Cut / Lean Bulk')}</h3>
        <p>${trHtml('Select Special Program in Goal Settings to unlock this extension menu.')}</p>
      </div>
      <ul class="quick-add-action-grid special-program-preview-grid" aria-label="${trHtml('Special Program tool preview')}">
        ${SPECIAL_PROGRAM_ACTIONS.map(renderLockedTool).join('')}
      </ul>
      <p class="special-program-preview-note">${trHtml('Activate Mini Cut or Lean Bulk to use these tools.')}</p>
    </div>
  `;
}

/** Keep the primary CTA outside the scroll body on short screens. */
export function renderSpecialProgramActivationFooter(): string {
  return `
    <div class="ui-dialog-footer special-program-footer">
      <button type="button" class="ui-primary-button special-program-activate" onclick="window.openSpecialProgramGoalSettings()">
        <span class="material-symbols-outlined" aria-hidden="true">flag</span>
        ${trHtml('Activate in Goal Settings')}
      </button>
    </div>
  `;
}
