import { tr, trHtml } from '../../i18n/index.ts';
import { formatFriendlyDate, getTodayKey } from '../../utils/dateUtils.ts';
import { htmlJsArg, escapeHtml } from '../../utils/sanitize.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';

export interface AppHeaderState {
  userProfile?: { displayName?: string | null } | null;
  profileImageUrl?: string | null;
  streakDays?: number;
  theme?: string;
  selectedDate?: string;
}

export interface AppHeaderOptions {
  state: AppHeaderState;
  /** The diary variant opens its calendar; dashboard can return to today. */
  subtitleType?: 'default' | 'dashboard' | 'diary' | 'custom';
  /** Trusted, app-owned markup only. */
  customSubtitleHtml?: string;
  showQuickAdd?: boolean;
  selectedDate?: string;
  quickAddAriaLabel?: string;
}

function renderSubtitle(options: AppHeaderOptions, selectedDate: string): string {
  const date = escapeHtml(formatFriendlyDate(selectedDate));
  switch (options.subtitleType) {
    case 'dashboard': {
      const todayKey = getTodayKey();
      return `<div class="app-header-date-row">
        <p class="app-header-date-text">${date}</p>
        ${selectedDate !== todayKey ? `<button id="app-header-today" type="button"
          onclick="window.selectDate(${htmlJsArg(todayKey)})" class="app-header-date-action">${trHtml('Show today')}</button>` : ''}
      </div>`;
    }
    case 'diary':
      return `<button id="app-header-date" type="button" onclick="window.openDiaryCalendar()"
        class="app-header-date-action app-header-calendar" aria-label="${trHtml('Choose diary date')}">
        <span class="material-symbols-outlined" aria-hidden="true">calendar_today</span>
        <span>${date}</span>
        <span class="material-symbols-outlined" aria-hidden="true">expand_more</span>
      </button>`;
    case 'custom':
      return options.customSubtitleHtml || '';
    default:
      return `<p class="app-header-date-text">${date}</p>`;
  }
}

/** Shared, wrapping header for Dashboard, Diary, Fitness and Insights. */
export function renderAppHeader(options: AppHeaderOptions): string {
  const { state } = options;
  const selectedDate = options.selectedDate || state.selectedDate || getTodayKey();
  const displayName = state.userProfile?.displayName?.trim() || '';
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const initials = nameParts.length > 1
    ? `${Array.from(nameParts[0])[0]}${Array.from(nameParts[1])[0]}`.toUpperCase()
    : (Array.from(nameParts[0] || '').slice(0, 2).join('').toUpperCase() || 'NA');
  const rawStreak = state.streakDays ?? 0;
  const streakDays = Number.isFinite(rawStreak) ? Math.max(0, Math.floor(rawStreak)) : 0;
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greeting = displayName ? trHtml(`${greetingKey}, {0}`, displayName) : trHtml(greetingKey);
  const themeAction = state.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const addLabel = options.quickAddAriaLabel || tr('Add meal or exercise');

  return `
    <header class="app-header sticky top-0">
      <div class="app-header-top">
        <button id="app-header-profile" type="button" class="app-header-profile"
          onclick="window.navigateApp('profile')" aria-label="${trHtml('Open Profile')}">
          <span class="app-header-avatar" aria-hidden="true">
            ${state.profileImageUrl
              ? `<img src="${escapeHtml(state.profileImageUrl)}" width="48" height="48" alt="">`
              : escapeHtml(initials)}
          </span>
        </button>
        <div class="app-header-identity">
          <h1 class="app-header-title">${greeting}</h1>
          ${streakDays > 0 ? `<p class="app-header-streak">
            <span class="material-symbols-outlined" aria-hidden="true">local_fire_department</span>
            <span>${trHtml('{0} day streak', formatDisplayNumber(streakDays, 0))}</span>
          </p>` : ''}
        </div>
        <div class="app-header-actions">
          <button id="app-header-theme" type="button" onclick="window.toggleTheme()"
            class="ui-icon-button" aria-label="${trHtml(themeAction)}" title="${trHtml(themeAction)}">
            <span class="material-symbols-outlined" aria-hidden="true">${state.theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          </button>
          ${(options.showQuickAdd ?? true) ? `<button id="app-header-add" type="button"
            onclick="window.toggleQuickActions(true)" class="ui-icon-button" aria-haspopup="dialog"
            aria-label="${escapeHtml(addLabel)}">
            <span class="material-symbols-outlined" aria-hidden="true">add</span>
          </button>` : ''}
        </div>
      </div>
      <div class="app-header-subtitle">${renderSubtitle(options, selectedDate)}</div>
    </header>`;
}
