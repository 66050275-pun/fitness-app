/**
 * Main Profile & Settings Screen
 * 
 * Replaces old hard-coded layout with a modular menu-based Information Architecture:
 * - Profile Header with NutriAI placeholder avatar & display name
 * - SECTION A: YOUR PROFILE (Personal Info, Goals, History, Schedule, Health Apps, Settings)
 * - SECTION B: NUTRIAI (What's New, Feedback, Rate, Share, Suggest Feature)
 * - SECTION C: HELP & LEGAL (Help Center, Terms, Privacy, Marketing Consent, Disclaimer)
 * - SECTION D: DATA & ACCOUNT (Data & Privacy, Local Account Status)
 */

import { store } from '../store/appState';
import { renderProfileMenuSection } from '../components/Profile/ProfileMenuSection';
import { renderProfileMenuRow } from '../components/Profile/ProfileMenuRow';
import { APP_METADATA } from '../data/appConfig';
import { formatWeight } from '../utils/unitConversions';
import { escapeHtml } from '../utils/sanitize';

export function renderProfileScreen(): string {
  const state = store.getState();
  const profile = state.userProfile;
  const prefs = state.userPreferences;
  const unit = prefs?.weightUnit || 'kg';

  const hasName = !!(profile?.displayName && profile.displayName.trim());
  const displayName = hasName ? profile.displayName.trim() : 'Set up your profile';
  
  let goalLabel = 'No goal set';
  if (profile?.weightGoalType === 'lose') goalLabel = 'Lose Weight';
  else if (profile?.weightGoalType === 'maintain') goalLabel = 'Maintain Weight';
  else if (profile?.weightGoalType === 'gain') goalLabel = 'Gain Weight';

  const calorieTarget = state.calorieTarget || 2100;
  const weightCount = state.weightHistory?.length || 0;
  const scheduleActive = state.eatingSchedule?.enabled || false;
  const currentWeightFormatted = formatWeight(profile?.currentWeightKg, unit);
  const themeLabel = (prefs?.theme ? prefs.theme.charAt(0).toUpperCase() + prefs.theme.slice(1) : 'System');
  const activityLabel = profile?.activityLevel ? (profile.activityLevel.charAt(0).toUpperCase() + profile.activityLevel.slice(1).replace('_', ' ')) : 'Moderate';
  const profileImageUrl = state.profileImageUrl;

  // Initials for avatar placeholder
  let initials = 'NA';
  if (hasName) {
    const parts = displayName.split(/\s+/);
    initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  }

  // Section A Rows
  const sectionARows = [
    renderProfileMenuRow({
      id: 'personal-info',
      label: 'Personal Information',
      description: currentWeightFormatted !== '--' ? `Weight: ${currentWeightFormatted}` : 'Profile & biometric details',
      icon: 'person',
      action: "window.openProfileSubpage('personal_info')"
    }),
    renderProfileMenuRow({
      id: 'weight-goal',
      label: 'Weight Goal',
      description: goalLabel,
      icon: 'flag',
      status: goalLabel,
      action: "window.openProfileSubpage('weight_goal')"
    }),
    renderProfileMenuRow({
      id: 'nutrition-goals',
      label: 'Nutrition Goals',
      description: `${calorieTarget.toLocaleString()} kcal target`,
      icon: 'ads_click',
      status: `${calorieTarget} kcal`,
      action: "window.openProfileSubpage('nutrition_goals')"
    }),
    renderProfileMenuRow({
      id: 'activity-level',
      label: 'Activity Level',
      description: 'Daily expenditure multiplier',
      icon: 'fitness_center',
      status: activityLabel,
      action: "window.openProfileSubpage('activity_level')"
    }),
    renderProfileMenuRow({
      id: 'weight-history',
      label: 'Weight History',
      description: `${weightCount} recorded measurement${weightCount !== 1 ? 's' : ''}`,
      icon: 'monitoring',
      status: `${weightCount}`,
      action: "window.openProfileSubpage('weight_history')"
    }),
    renderProfileMenuRow({
      id: 'eating-schedule',
      label: 'Eating Schedule',
      description: 'Intermittent eating & fasting window',
      icon: 'hourglass_empty',
      status: scheduleActive ? 'Active' : 'Off',
      action: "window.openProfileSubpage('eating_schedule')"
    }),
    renderProfileMenuRow({
      id: 'health-connections',
      label: 'Connected Health Apps',
      description: 'Google Health Connect integration',
      icon: 'health_and_safety',
      status: 'Coming soon',
      action: "window.openProfileSubpage('health_connections')"
    }),
    renderProfileMenuRow({
      id: 'app-settings',
      label: 'App Settings',
      description: 'Theme, units, week start & accessibility',
      icon: 'settings',
      status: themeLabel,
      action: "window.openProfileSubpage('app_settings')"
    })
  ].join('');

  // Section B Rows
  const sectionBRows = [
    renderProfileMenuRow({
      id: 'whats-new',
      label: "What's New",
      description: `Release highlights for v${APP_METADATA.version}`,
      icon: 'new_releases',
      status: `v${APP_METADATA.version}`,
      action: "window.openProfileSubpage('whats_new')"
    }),
    renderProfileMenuRow({
      id: 'send-feedback',
      label: 'Send Feedback',
      description: 'Report an issue or send suggestions',
      icon: 'feedback',
      action: "window.openProfileSubpage('feedback')"
    }),
    renderProfileMenuRow({
      id: 'suggest-feature',
      label: 'Suggest a Feature',
      description: 'Request new nutritional tools',
      icon: 'lightbulb',
      action: "window.openProfileSubpage('feedback', 'Feature Request')"
    }),
    renderProfileMenuRow({
      id: 'rate-app',
      label: 'Rate NutriAI',
      description: 'Review on Google Play Store',
      icon: 'star',
      status: 'Available after release',
      disabled: true,
      action: ''
    }),
    renderProfileMenuRow({
      id: 'share-app',
      label: 'Share NutriAI',
      description: 'Invite friends to track nutrition',
      icon: 'share',
      action: 'window.shareNutriAI()'
    })
  ].join('');

  // Section C Rows
  const sectionCRows = [
    renderProfileMenuRow({
      id: 'help-center',
      label: 'Help Center',
      description: 'Frequently asked questions & guides',
      icon: 'help',
      action: "window.openProfileSubpage('help_center')"
    }),
    renderProfileMenuRow({
      id: 'terms-of-use',
      label: 'Terms of Use',
      description: 'Provisional draft terms',
      icon: 'description',
      status: 'Draft',
      action: "window.openProfileSubpage('terms_of_use')"
    }),
    renderProfileMenuRow({
      id: 'privacy-policy',
      label: 'Privacy Policy',
      description: 'On-device data storage policy',
      icon: 'shield',
      status: 'Draft',
      action: "window.openProfileSubpage('privacy_policy')"
    }),
    renderProfileMenuRow({
      id: 'marketing-consent',
      label: 'Marketing Consent',
      description: 'Promotional communications preference',
      icon: 'check_box',
      status: prefs?.marketingConsent ? 'Opted In' : 'Off',
      action: "window.openProfileSubpage('marketing_consent')"
    }),
    renderProfileMenuRow({
      id: 'health-disclaimer',
      label: 'Health Disclaimer',
      description: 'Important medical advisory notice',
      icon: 'health_and_safety',
      action: "window.openProfileSubpage('health_disclaimer')"
    })
  ].join('');

  // Section D Rows
  const sectionDRows = [
    renderProfileMenuRow({
      id: 'data-privacy',
      label: 'Data & Privacy',
      description: 'Export backup archive or delete records',
      icon: 'privacy_tip',
      action: "window.openProfileSubpage('data_privacy')"
    })
  ].join('');

  return `
    <div class="flex flex-col min-h-screen pb-32 bg-surface dark:bg-dark-surface transition-colors">
      
      <!-- Top App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <button 
            type="button"
            onclick="window.navigateApp('dashboard')" 
            aria-label="Back to Home"
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 class="font-heading font-bold text-lg text-on-surface dark:text-white">Profile</h1>
        </div>

        <button 
          type="button"
          onclick="window.openProfileSubpage('personal_info')" 
          class="text-xs font-bold text-primary dark:text-primary-container px-3 py-1.5 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 hover:bg-surface-container active:scale-95 transition-all"
        >
          Edit Profile
        </button>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-5 pt-4">
        
        <!-- 1. Profile Header / Identity Card -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex items-center justify-between gap-3">
          <div class="flex items-center gap-3.5 min-w-0">
            <button type="button" onclick="document.getElementById('profile-photo-input')?.click()" aria-label="Change profile photo" class="relative w-14 h-14 overflow-hidden rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary flex items-center justify-center shadow-md border-2 border-surface dark:border-dark-surface shrink-0 cursor-pointer hover:scale-105 transition-transform">
              ${profileImageUrl ? `<img src="${profileImageUrl}" class="w-full h-full object-cover" alt="Profile photo">` : `<span class="font-heading font-extrabold text-base tracking-wider select-none">${initials}</span>`}
              <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-primary ring-2 ring-surface dark:ring-dark-surface flex items-center justify-center">
                <span class="material-symbols-outlined text-[10px] text-white">edit</span>
              </span>
            </button>
            <input id="profile-photo-input" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" onchange="window.handleProfilePhotoSelected(this)">

            <!-- Identity Info -->
            <div class="flex flex-col min-w-0">
              <h2 class="font-heading font-extrabold text-base text-on-surface dark:text-white leading-tight truncate">
                ${escapeHtml(displayName)}
              </h2>
              <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-container text-[10px] font-bold">
                  ${goalLabel}
                </span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">
                  &bull; Local Profile
                </span>
              </div>
              ${profileImageUrl ? `<button type="button" onclick="window.removeProfilePhoto()" class="mt-1.5 text-[10px] font-bold text-error text-left">Remove photo</button>` : ''}
            </div>
          </div>

          <button 
            type="button" 
            onclick="window.openProfileSubpage('personal_info')"
            aria-label="Edit Profile"
            class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary shrink-0 transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </section>

        <!-- 2. SECTION A — YOUR PROFILE -->
        ${renderProfileMenuSection({
          id: 'section-your-profile',
          title: 'Your Profile',
          description: 'Personal biometrics, nutrition targets, and schedules',
          rowsHtml: sectionARows
        })}

        <!-- 3. SECTION B — NUTRIAI -->
        ${renderProfileMenuSection({
          id: 'section-nutriai',
          title: 'NutriAI',
          description: 'App updates, community feedback, and sharing',
          rowsHtml: sectionBRows
        })}

        <!-- 4. SECTION C — HELP & LEGAL -->
        ${renderProfileMenuSection({
          id: 'section-help-legal',
          title: 'Help & Legal',
          description: 'Guides, policies, consent, and disclaimers',
          rowsHtml: sectionCRows
        })}

        <!-- 5. SECTION D — DATA & ACCOUNT -->
        ${renderProfileMenuSection({
          id: 'section-data-account',
          title: 'Data & Account',
          description: 'Device storage and cloud readiness',
          rowsHtml: sectionDRows
        })}

        <!-- Account Status Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="material-symbols-outlined text-[20px] text-primary">cloud_off</span>
              <div>
                <span class="font-heading font-bold text-xs text-on-surface dark:text-white block">
                  Account Status: Local Profile
                </span>
                <span class="text-[11px] text-on-surface-variant dark:text-gray-400 block mt-0.5">
                  Stored exclusively on this physical device
                </span>
              </div>
            </div>

            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant border border-outline-variant/30">
              Offline
            </span>
          </div>

          <button 
            type="button" 
            disabled 
            class="w-full py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant/40 dark:text-gray-500 border border-outline-variant/30 text-xs font-bold cursor-not-allowed text-center"
          >
            Cloud Account Sync &bull; Coming Soon
          </button>
        </div>

        <!-- App Metadata Footer -->
        <footer class="text-center py-4 flex flex-col gap-0.5 select-none">
          <p class="text-[11px] font-semibold text-on-surface-variant dark:text-gray-500">
            NutriAI for Android &bull; Version ${APP_METADATA.version} (Build ${APP_METADATA.build})
          </p>
          <p class="text-[10px] text-on-surface-variant/70 dark:text-gray-600">
            Vital Intelligence &bull; On-Device Engine
          </p>
        </footer>

      </main>

    </div>
  `;
}
