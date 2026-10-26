import { tr } from '../../i18n/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
/**
 * Profile Menu Row Component
 * 
 * Reusable accessible row button for settings, navigation, and actions.
 * Rules:
 * - Uses semantic <button> element.
 * - Touch target >= 48px.
 * - Icon on left, label + optional description.
 * - Status / value on right, chevron_right for internal navigation, north_east for external.
 * - Proper aria-label and disabled styling.
 */

import type { ProfileMenuItem } from '../../types/index.ts';

export function renderProfileMenuRow(item: ProfileMenuItem): string {
  const {
    id,
    label,
    description,
    icon,
    action,
    status,
    external = false,
    disabled = false
  } = item;

  const chevronIcon = external ? 'north_east' : 'chevron_right';
  const ariaLabel = [label, description, status && status !== description ? status : '', disabled ? tr('(Disabled)') : '', external ? tr('(Opens external link)') : ''].filter(Boolean).join(' · ');

  return `
    <button
      type="button"
      id="profile-row-${escapeHtml(id)}"
      ${disabled ? 'disabled' : `onclick="${action}"`}
      aria-label="${escapeHtml(ariaLabel)}"
      class="profile-menu-row w-full min-h-[52px] px-4 py-3 flex items-center justify-between text-left transition-colors group ${
        disabled 
          ? 'opacity-40 cursor-not-allowed bg-transparent' 
          : 'hover:bg-surface-container/50 dark:hover:bg-dark-surface-card-high/50 active:bg-surface-container dark:active:bg-dark-surface-card-high cursor-pointer'
      }"
    >
      <!-- Leading Icon & Label Info -->
      <div class="profile-menu-main flex items-center gap-3.5 flex-1 min-w-0 pr-2">
        <div class="w-9 h-9 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex items-center justify-center text-primary dark:text-primary-container shrink-0 group-hover:scale-105 transition-transform">
          <span class="material-symbols-outlined text-[20px]" aria-hidden="true">${icon}</span>
        </div>
        
        <div class="flex flex-col min-w-0">
          <span class="profile-menu-label font-heading font-bold text-xs text-on-surface dark:text-white leading-snug">
            ${escapeHtml(label)}
          </span>
          ${description ? `
            <span class="profile-menu-description text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5 leading-tight">
              ${escapeHtml(description)}
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Trailing Status / Value & Chevron -->
      <div class="profile-menu-tail flex items-center gap-1.5">
        ${status ? `
          <span class="text-[11px] font-semibold text-on-surface-variant dark:text-gray-400 px-2 py-0.5 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20">
            ${escapeHtml(status)}
          </span>
        ` : ''}
        <span class="material-symbols-outlined text-[18px] text-on-surface-variant/70 dark:text-gray-500 group-hover:translate-x-0.5 transition-transform" aria-hidden="true">
          ${chevronIcon}
        </span>
      </div>
    </button>
  `;
}
