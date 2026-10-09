/**
 * Personal Information Sub-Screen
 * 
 * Manages:
 * - Display name
 * - Date of birth (optional)
 * - Biological sex (optional with 'prefer not to say')
 * - Height & Height unit (cm or ft/in)
 * - Current weight & Weight unit (kg or lb)
 * - Timezone (device timezone default)
 * - Explanatory guidance & non-medical disclaimer
 */

import { store } from '../../store/appState';
import { cmToFtIn, kgToLb } from '../../utils/unitConversions';
import { escapeHtml } from '../../utils/sanitize';

export function renderPersonalInformationScreen(): string {
  const state = store.getState();
  const profile = state.userProfile;
  const prefs = state.userPreferences;

  const displayName = profile.displayName || '';
  const dob = profile.dateOfBirth || '';
  const sex = profile.biologicalSex || 'prefer_not_to_say';
  const heightUnit = prefs.heightUnit || 'cm';
  const weightUnit = prefs.weightUnit || 'kg';

  // Height display values
  let heightDisplayCm = profile.heightCm ? String(profile.heightCm) : '';
  let heightFeet = '';
  let heightInches = '';
  if (profile.heightCm) {
    const { feet, inches } = cmToFtIn(profile.heightCm);
    heightFeet = String(feet);
    heightInches = String(inches);
  }

  // Weight display values
  let weightDisplay = '';
  if (profile.currentWeightKg) {
    weightDisplay = weightUnit === 'lb'
      ? String(kgToLb(profile.currentWeightKg))
      : String(profile.currentWeightKg);
  }

  // Device timezone default
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {}

  return `
    <div class="flex flex-col min-h-screen pb-16 bg-surface dark:bg-dark-surface transition-colors animate-fade-in">
      
      <!-- Sticky Subpage App Bar -->
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
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">Personal Information</h1>
        </div>

        <button 
          type="submit" 
          form="personal-info-form"
          class="text-xs font-bold text-white px-4 py-1.5 rounded-full bg-primary hover:brightness-105 active:scale-95 transition-all shadow-xs"
        >
          Save
        </button>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">
        
        <!-- Explanatory Banner -->
        <div class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 flex items-start gap-3 shadow-ambient">
          <span class="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">info</span>
          <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
            Height, weight, and biological sex help NutriAI compute accurate daily metabolic targets. This information is stored only on your device and is not used for medical diagnosis.
          </p>
        </div>

        <!-- Form -->
        <form id="personal-info-form" onsubmit="event.preventDefault(); window.submitPersonalInfo();" class="flex flex-col gap-4">
          
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-4">
            
            <!-- Display Name -->
            <div>
              <label for="profile-name-input" class="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-1.5">
                Display Name
              </label>
              <input 
                type="text" 
                id="profile-name-input"
                value="${escapeHtml(displayName)}"
                placeholder="e.g. Alex"
                maxlength="50"
                required
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-sm font-semibold text-on-surface dark:text-white focus:border-primary focus:outline-none"
              />
            </div>

            <!-- Date of Birth -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="profile-dob-input" class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                  Date of Birth
                </label>
                <span class="text-[10px] text-on-surface-variant/70 dark:text-gray-500">Optional</span>
              </div>
              <input 
                type="date" 
                id="profile-dob-input"
                value="${escapeHtml(dob)}"
                max="${new Date().toISOString().split('T')[0]}"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-medium text-on-surface dark:text-white focus:border-primary focus:outline-none"
              />
            </div>

            <!-- Biological Sex -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                  Biological Sex
                </label>
                <span class="text-[10px] text-on-surface-variant/70 dark:text-gray-500">Optional</span>
              </div>
              <div class="grid grid-cols-2 gap-2">
                ${[
                  { value: 'female', label: 'Female' },
                  { value: 'male', label: 'Male' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
                ].map(opt => `
                  <label class="flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    sex === opt.value 
                      ? 'bg-primary/10 border-primary text-primary dark:text-primary-container font-bold' 
                      : 'bg-surface-container-low dark:bg-dark-surface-card-high border-outline-variant/30 text-on-surface dark:text-gray-300'
                  }">
                    <input 
                      type="radio" 
                      name="profile-sex" 
                      value="${escapeHtml(opt.value)}"
                      ${sex === opt.value ? 'checked' : ''}
                      class="accent-primary"
                    />
                    <span class="text-xs">${opt.label}</span>
                  </label>
                `).join('')}
              </div>
            </div>

          </div>

          <!-- Physical Measurements Card -->
          <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-4">
            
            <!-- Height -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                  Height
                </label>
                <div class="flex rounded-lg bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 p-0.5">
                  <button 
                    type="button"
                    onclick="window.setPersonalHeightUnit('cm')"
                    class="px-2 py-1 rounded-md text-[10px] font-bold transition-all ${heightUnit === 'cm' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
                  >
                    cm
                  </button>
                  <button 
                    type="button"
                    onclick="window.setPersonalHeightUnit('ft_in')"
                    class="px-2 py-1 rounded-md text-[10px] font-bold transition-all ${heightUnit === 'ft_in' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
                  >
                    ft / in
                  </button>
                </div>
              </div>

              ${heightUnit === 'cm' ? `
                <div class="relative">
                  <input 
                    type="number" 
                    id="profile-height-cm"
                    value="${escapeHtml(heightDisplayCm)}"
                    min="50" 
                    max="280"
                    placeholder="e.g. 175"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:border-primary focus:outline-none"
                  />
                  <span class="absolute right-3.5 top-2.5 text-xs text-on-surface-variant dark:text-gray-400 font-bold">cm</span>
                </div>
              ` : `
                <div class="grid grid-cols-2 gap-2">
                  <div class="relative">
                    <input 
                      type="number" 
                      id="profile-height-ft"
                      value="${escapeHtml(heightFeet)}"
                      min="2" 
                      max="8"
                      placeholder="5"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:border-primary focus:outline-none"
                    />
                    <span class="absolute right-3.5 top-2.5 text-xs text-on-surface-variant dark:text-gray-400 font-bold">ft</span>
                  </div>
                  <div class="relative">
                    <input 
                      type="number" 
                      id="profile-height-in"
                      value="${escapeHtml(heightInches)}"
                      min="0" 
                      max="11"
                      placeholder="9"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:border-primary focus:outline-none"
                    />
                    <span class="absolute right-3.5 top-2.5 text-xs text-on-surface-variant dark:text-gray-400 font-bold">in</span>
                  </div>
                </div>
              `}
            </div>

            <!-- Current Weight -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label for="profile-weight-input" class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                  Current Weight
                </label>
                <div class="flex rounded-lg bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 p-0.5">
                  <button 
                    type="button"
                    onclick="window.setPersonalWeightUnit('kg')"
                    class="px-2 py-1 rounded-md text-[10px] font-bold transition-all ${weightUnit === 'kg' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
                  >
                    kg
                  </button>
                  <button 
                    type="button"
                    onclick="window.setPersonalWeightUnit('lb')"
                    class="px-2 py-1 rounded-md text-[10px] font-bold transition-all ${weightUnit === 'lb' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant'}"
                  >
                    lb
                  </button>
                </div>
              </div>

              <div class="relative">
                <input 
                  type="number" 
                  step="0.1"
                  min="20"
                  max="500"
                  id="profile-weight-input"
                  value="${escapeHtml(weightDisplay)}"
                  placeholder="e.g. 70.0"
                  class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:border-primary focus:outline-none"
                />
                <span class="absolute right-3.5 top-2.5 text-xs text-on-surface-variant dark:text-gray-400 font-bold">${weightUnit}</span>
              </div>
            </div>

            <!-- Timezone -->
            <div class="pt-1 border-t border-outline-variant/20">
              <label class="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-1">
                Device Timezone
              </label>
              <div class="px-3.5 py-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs text-on-surface-variant dark:text-gray-400 font-mono flex items-center justify-between">
                <span>${escapeHtml(timezone)}</span>
                <span class="text-[10px] text-primary dark:text-primary-container font-semibold">Auto-detected</span>
              </div>
            </div>

          </div>

          <!-- Bottom Save Action Button -->
          <button 
            type="submit" 
            class="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all text-center mt-1"
          >
            Save Profile Information
          </button>

        </form>

      </main>

    </div>
  `;
}
