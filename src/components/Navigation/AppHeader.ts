import { formatFriendlyDate, getTodayKey } from '../../utils/dateUtils.ts';
import { htmlJsArg, escapeHtml } from '../../utils/sanitize.ts';

export interface AppHeaderState {
  userProfile?: { displayName?: string | null } | null;
  profileImageUrl?: string | null;
  streakDays?: number;
  theme?: string;
  selectedDate?: string;
}

export interface AppHeaderOptions {
  /** Application state subset required by AppHeader */
  state: AppHeaderState;

  /**
   * Subtitle display variant:
   * - 'dashboard': friendly date + "(Show Today)" button when selectedDate != todayKey
   * - 'diary': friendly date button with chevron down that triggers window.openDiaryCalendar()
   * - 'default': friendly date text (used by Fitness and Insights)
   * - 'custom': custom subtitle HTML string passed via customSubtitleHtml
   */
  subtitleType?: 'default' | 'dashboard' | 'diary' | 'custom';

  /** Custom subtitle HTML if subtitleType is 'custom' */
  customSubtitleHtml?: string;

  /**
   * Whether to display the Quick Add (+) action button.
   * Defaults to true, set to false for Fitness screen.
   */
  showQuickAdd?: boolean;

  /**
   * Override date key (defaults to state.selectedDate)
   */
  selectedDate?: string;

  /**
   * Custom aria-label for the Quick Add button
   */
  quickAddAriaLabel?: string;
}

/**
 * Shared Top App Bar Header Component for Dashboard, Fitness, Diary, and Insights.
 * 
 * Includes:
 * - User Avatar with flame streak badge (clicking navigates to Profile)
 * - Greeting title ("Good morning, {name}")
 * - Contextual date / subtitle controls
 * - Theme toggle button (Dark / Light)
 * - Quick Add action button (optional, hidden on Fitness)
 */
export function renderAppHeader(options: AppHeaderOptions): string {
  const { state } = options;
  const selectedDate = options.selectedDate || state.selectedDate || getTodayKey();
  const showQuickAdd = options.showQuickAdd ?? true;
  const quickAddAriaLabel = options.quickAddAriaLabel || 'Add meal or exercise';
  const streakDays = state.streakDays ?? 0;

  // User Display Info & Initials
  const displayName = state.userProfile?.displayName?.trim() || '';
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
    : (nameParts[0]?.slice(0, 2).toUpperCase() || 'NA');
  const greeting = displayName ? `Good morning, ${escapeHtml(displayName)}` : 'Good morning';

  // Subtitle markup
  let subtitleHtml = '';
  switch (options.subtitleType) {
    case 'dashboard': {
      const todayKey = getTodayKey();
      const isToday = selectedDate === todayKey;
      subtitleHtml = `
        <p class="text-xs text-on-surface-variant dark:text-gray-400 flex items-center gap-1.5">
          <span>${formatFriendlyDate(selectedDate)}</span>
          ${!isToday ? `
            <button onclick="window.selectDate(${htmlJsArg(todayKey)})" class="text-primary font-bold hover:underline">
              (Show Today)
            </button>
          ` : ''}
        </p>
      `.trim();
      break;
    }
    case 'diary': {
      subtitleHtml = `
        <button type="button" onclick="window.openDiaryCalendar()" class="flex items-center gap-1 text-xs text-on-surface-variant dark:text-gray-400 hover:text-primary text-left group transition-colors focus:outline-none" aria-label="Choose diary date">
          <span>${formatFriendlyDate(selectedDate)}</span>
          <span class="material-symbols-outlined text-[14px] text-primary">expand_more</span>
        </button>
      `.trim();
      break;
    }
    case 'custom': {
      subtitleHtml = options.customSubtitleHtml || '';
      break;
    }
    case 'default':
    default: {
      subtitleHtml = `<p class="text-xs text-on-surface-variant dark:text-gray-400">${formatFriendlyDate(selectedDate)}</p>`;
      break;
    }
  }

  return `
      <!-- Top App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex justify-between items-center border-b border-outline-variant/20">
        <div class="flex items-center gap-3">
          <!-- Leading Avatar with Streak Badge -->
          <div class="relative cursor-pointer" onclick="window.navigateApp('profile')" aria-label="Open Profile">
            <div class="w-11 h-11 overflow-hidden rounded-full border-2 border-primary/40 shadow-sm bg-gradient-to-tr from-primary to-primary-container text-on-primary flex items-center justify-center font-heading font-extrabold text-xs">
              ${state.profileImageUrl ? `<img src="${escapeHtml(state.profileImageUrl)}" class="w-full h-full object-cover" alt="Profile photo">` : `<span>${escapeHtml(initials)}</span>`}
            </div>
            <!-- Streak Flame Badge -->
            <div class="absolute -bottom-1 -right-1 bg-surface-container-lowest dark:bg-dark-surface-card px-1.5 py-0.5 rounded-full border border-outline-variant/30 shadow-sm flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[#FF6B00] text-[12px]" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
              <span class="text-[10px] font-bold text-[#FF6B00] leading-none">${streakDays}d</span>
            </div>
          </div>
          <div>
            <h1 class="font-heading font-bold text-base text-on-surface dark:text-white leading-snug">${greeting}</h1>
            ${subtitleHtml}
          </div>
        </div>

        <!-- Trailing Actions -->
        <div class="flex items-center gap-2">
          <!-- Dark Mode Toggle -->
          <button onclick="window.toggleTheme()" class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary transition-all" aria-label="Toggle theme">
            <span class="material-symbols-outlined text-[18px]">${state.theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
          </button>
          
          ${showQuickAdd ? `
          <!-- Quick Add Modal -->
          <button onclick="window.toggleQuickActions(true)" class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary transition-all relative" aria-label="${escapeHtml(quickAddAriaLabel)}">
            <span class="material-symbols-outlined text-[18px]">add</span>
          </button>
          ` : ''}
        </div>
      </header>
  `.trim();
}
