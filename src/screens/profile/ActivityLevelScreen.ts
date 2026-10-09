/**
 * Activity Level Sub-Screen
 * 
 * Manages:
 * - 5 Activity Tiers with descriptive explanations
 * - User selection without silent target overwrite
 * - Caloric suggestion preview with explicit opt-in confirmation
 */

import { store } from '../../store/appState';
import type { ActivityLevel } from '../../types/index.ts';

interface ActivityOption {
  level: ActivityLevel;
  title: string;
  description: string;
  multiplier: number;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    level: 'sedentary',
    title: 'Sedentary',
    description: 'Little or no regular exercise. Mostly sitting at desk or resting.',
    multiplier: 1.2
  },
  {
    level: 'light',
    title: 'Lightly Active',
    description: 'Light exercise or active hobbies 1 to 3 days per week.',
    multiplier: 1.375
  },
  {
    level: 'moderate',
    title: 'Moderately Active',
    description: 'Moderate physical training or cardio sports 3 to 5 days per week.',
    multiplier: 1.55
  },
  {
    level: 'very_active',
    title: 'Very Active',
    description: 'Hard exercise, heavy strength training, or sports 6 to 7 days per week.',
    multiplier: 1.725
  },
  {
    level: 'athlete',
    title: 'Athlete / Highly Active',
    description: 'Extremely rigorous training, professional sports, or intense physical manual labor.',
    multiplier: 1.9
  }
];

export function renderActivityLevelScreen(): string {
  const state = store.getState();
  const currentLevel = state.userProfile?.activityLevel || 'moderate';
  const weightKg = state.userProfile?.currentWeightKg || 70;
  const heightCm = state.userProfile?.heightCm || 175;
  const currentTarget = state.calorieTarget || 2100;

  // Simple Mifflin-St Jeor rough BMR baseline for preview
  const estimatedBmr = (10 * weightKg) + (6.25 * heightCm) - (5 * 30) + 5;

  return `
    <div class="flex flex-col min-h-screen pb-16 bg-surface dark:bg-dark-surface transition-colors animate-fade-in">
      
      <!-- App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <button 
            type="button" 
            onclick="window.goBackFromProfileSubpage()" 
            aria-label="Back to Profile"
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">Activity Level</h1>
        </div>

        <button 
          type="button" 
          onclick="window.saveActivityLevel()"
          class="text-xs font-bold text-white px-4 py-1.5 rounded-full bg-primary hover:brightness-105 active:scale-95 transition-all shadow-xs"
        >
          Save
        </button>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Explanation Banner -->
        <div class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 flex items-start gap-3 shadow-ambient">
          <span class="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">fitness_center</span>
          <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
            Choose the tier that best matches your typical weekly routine. Changing your activity level will calculate an estimated suggestion without altering your existing calorie target unless you choose to apply it.
          </p>
        </div>

        <!-- Activity Options List -->
        <div class="flex flex-col gap-2.5">
          ${ACTIVITY_OPTIONS.map(opt => {
            const isSelected = currentLevel === opt.level;
            const suggestedTdee = Math.round(estimatedBmr * opt.multiplier);

            return `
              <div 
                id="activity-card-${opt.level}"
                onclick="window.selectActivityTier('${opt.level}', ${suggestedTdee})"
                class="p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                  isSelected 
                    ? 'bg-primary/5 dark:bg-primary/10 border-primary ring-1 ring-primary/40 shadow-ambient' 
                    : 'bg-surface-container-lowest dark:bg-dark-surface-card border-outline-variant/30 hover:border-primary/40'
                }"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-primary text-white' : 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant'
                    }">
                      <span class="material-symbols-outlined text-[16px]">
                        ${isSelected ? 'check' : 'radio_button_unchecked'}
                      </span>
                    </div>
                    <span class="font-heading font-bold text-sm text-on-surface dark:text-white">
                      ${opt.title}
                    </span>
                  </div>

                  <span class="text-[11px] font-mono font-bold text-on-surface-variant dark:text-gray-400">
                    ~${suggestedTdee} kcal
                  </span>
                </div>

                <p class="text-xs text-on-surface-variant dark:text-gray-300 pl-9 leading-relaxed">
                  ${opt.description}
                </p>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Preview & Suggestion Dialog Card -->
        <div id="activity-suggestion-card" class="hidden p-4 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex flex-col gap-3">
          <div class="flex items-start gap-2.5">
            <span class="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">lightbulb</span>
            <div>
              <span class="font-heading font-bold text-xs text-on-surface dark:text-white block">
                Update Daily Calorie Target?
              </span>
              <p class="text-xs text-on-surface-variant dark:text-gray-300 mt-0.5 leading-relaxed" id="activity-suggestion-text">
                Your current daily goal is <strong>${currentTarget} kcal</strong>. Would you like to recalibrate it to the suggested amount?
              </p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-1 border-t border-outline-variant/20">
            <button 
              type="button"
              onclick="window.dismissActivitySuggestion()"
              class="px-3 py-1.5 rounded-xl border border-outline-variant/30 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              Keep Current (${currentTarget} kcal)
            </button>
            <button 
              type="button"
              id="apply-suggested-calorie-btn"
              onclick="window.applySuggestedCalorieTarget()"
              class="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              Apply Suggestion
            </button>
          </div>
        </div>

        <!-- Save Button -->
        <button 
          type="button" 
          onclick="window.saveActivityLevel()"
          class="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all text-center mt-1"
        >
          Confirm Activity Level
        </button>

      </main>

    </div>
  `;
}
