import { store } from '../../store/appState';
import { ACTIVITY_MULTIPLIERS, calculateAge, calculateFullGoals, resolveCalculationSex } from '../../utils/goalCalculations';
import { cmToFtIn, kgToLb } from '../../utils/unitConversions';
import { htmlJsArg, escapeHtml } from '../../utils/sanitize';
import { formatWeeklyRate } from '../../utils/safeNumbers';
import type { ActivityLevel, WeeklyWeightRate } from '../../types/index.ts';

const RATES: WeeklyWeightRate[] = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75];

function shell(content: string, step: number): string {
  const progress = Math.round((step / 6) * 100);
  return `
    <div class="min-h-screen bg-surface dark:bg-dark-surface text-on-surface dark:text-white flex flex-col" style="padding-top: max(1rem, env(safe-area-inset-top)); padding-bottom: max(1rem, env(safe-area-inset-bottom));">
      <header class="px-screen-gutter pt-2 pb-4">
        <div class="flex items-center justify-between mb-3">
          <span class="font-heading font-extrabold text-primary dark:text-primary-container">NutriAI</span>
          <span class="text-xs font-bold text-on-surface-variant dark:text-gray-400">Step ${step} of 6</span>
        </div>
        <div class="h-1.5 rounded-full bg-surface-container-highest dark:bg-dark-border overflow-hidden" role="progressbar" aria-valuemin="1" aria-valuemax="6" aria-valuenow="${step}" aria-label="Onboarding step ${step} of 6">
          <div class="h-full bg-primary rounded-full transition-all" style="width:${progress}%"></div>
        </div>
      </header>
      <main class="flex-1 px-screen-gutter overflow-y-auto">${content}</main>
    </div>`;
}

function actions(step: number, continueLabel = 'Continue', optional = false): string {
  return `
    <div class="sticky bottom-0 pt-4 pb-3 bg-gradient-to-t from-surface via-surface dark:from-dark-surface dark:via-dark-surface to-transparent flex gap-2">
      ${step > 1 ? `<button type="button" onclick="window.onboardingBack()" class="min-h-12 px-5 rounded-2xl border border-outline-variant/40 font-bold">Back</button>` : ''}
      ${optional ? `<button type="button" onclick="window.onboardingSkip()" class="min-h-12 px-4 rounded-2xl text-on-surface-variant font-bold">Skip</button>` : ''}
      <button type="button" onclick="window.onboardingNext()" class="min-h-12 flex-1 rounded-2xl bg-primary text-white font-bold shadow-glow-primary">${continueLabel}</button>
    </div>`;
}

function renderWelcome(): string {
  return shell(`
    <section class="min-h-[72vh] flex flex-col justify-center text-center">
      <div class="w-24 h-24 mx-auto rounded-[2rem] bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center shadow-glow-primary mb-7">
        <span class="material-symbols-outlined text-[48px]">nutrition</span>
      </div>
      <h1 class="font-heading text-3xl font-extrabold">Let’s personalize NutriAI</h1>
      <p class="mt-3 text-sm leading-relaxed text-on-surface-variant dark:text-gray-300">Answer a few questions to set up your nutrition and weight goals. You can change these settings later in Profile.</p>
      <p class="mt-5 text-xs text-on-surface-variant dark:text-gray-400">NutriAI provides general estimates, not medical advice.</p>
      <button type="button" onclick="window.onboardingNext()" class="mt-10 min-h-14 rounded-2xl bg-primary text-white font-heading font-bold shadow-glow-primary">Get Started</button>
    </section>`, 1);
}

function renderWeightGoal(): string {
  const state = store.getState();
  const selected = state.onboardingDraft.weightDirection;
  const unit = state.onboardingDraft.weightUnit;
  const labels = ['Lose faster', 'Lose moderately', 'Lose gradually', 'Maintain', 'Gain gradually', 'Gain moderately', 'Gain faster'];
  return shell(`
    <section class="pt-6">
      <p class="text-xs font-extrabold uppercase tracking-wider text-primary">Your goal</p>
      <h1 class="font-heading text-2xl font-extrabold mt-1">What would you like to do?</h1>
      <p class="text-sm text-on-surface-variant dark:text-gray-400 mt-2">Choose a starting pace. Maintain sits in the center.</p>
      <div class="mt-7 grid gap-2" role="radiogroup" aria-label="Weekly weight goal">
        ${RATES.map((rate, index) => `
          <button type="button" role="radio" aria-checked="${selected === rate}" onclick="window.selectOnboardingRate(${rate})" class="min-h-13 px-4 rounded-2xl border flex items-center justify-between text-left ${selected === rate ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-outline-variant/30 bg-surface-container-lowest dark:bg-dark-surface-card'}">
            <span class="font-bold text-sm">${labels[index]}</span>
            <span class="text-xs ${selected === rate ? 'text-primary dark:text-primary-container font-bold' : 'text-on-surface-variant'}">${rate === 0 ? '0' : `${Math.round(Math.abs(rate) * (unit === 'lb' ? 2.20462 : 1) * 100) / 100} ${unit}/wk`}</span>
          </button>`).join('')}
      </div>
      ${selected !== null ? `<div class="mt-4 p-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card text-xs"><strong>${formatWeeklyRate(selected, unit)}</strong>${Math.abs(selected) === 0.75 ? '<p class="mt-1 text-on-surface-variant dark:text-gray-400">Faster weight changes may not be appropriate for everyone. Consider a gradual rate or speak with a qualified professional.</p>' : ''}</div>` : ''}
      <p id="onboarding-error" class="min-h-5 mt-2 text-xs text-error" role="alert"></p>
      ${actions(2)}
    </section>`, 2);
}

function renderPersonalDetails(): string {
  const d = store.getState().onboardingDraft;
  const feet = d.heightCm ? cmToFtIn(d.heightCm) : { feet: 0, inches: 0 };
  const displayWeight = d.currentWeightKg ? (d.weightUnit === 'lb' ? kgToLb(d.currentWeightKg) : d.currentWeightKg) : '';
  const targetWeight = d.targetWeightKg ? (d.weightUnit === 'lb' ? kgToLb(d.targetWeightKg) : d.targetWeightKg) : '';
  return shell(`
    <section class="pt-6">
      <p class="text-xs font-extrabold uppercase tracking-wider text-primary">Personal details</p>
      <h1 class="font-heading text-2xl font-extrabold mt-1">Tell us about yourself</h1>
      <p class="text-sm text-on-surface-variant dark:text-gray-400 mt-2">These details are used only to estimate energy needs on this device.</p>
      <div class="mt-6 space-y-4">
        <label class="block"><span class="text-xs font-bold">Display name <span class="font-normal text-on-surface-variant">(optional)</span></span><input id="onboarding-name" value="${escapeHtml(d.displayName)}" class="mt-1.5 w-full rounded-xl border border-outline-variant/40 bg-white dark:bg-dark-surface-card px-4 py-3" /></label>
        <fieldset><legend class="text-xs font-bold mb-2">Biological sex</legend><div class="grid grid-cols-3 gap-2">${(['female','male','prefer_not_to_say'] as const).map(v => `<label class="rounded-xl border p-3 text-center text-xs cursor-pointer ${d.biologicalSex === v ? 'border-primary bg-primary/10' : 'border-outline-variant/30'}"><input class="sr-only" type="radio" name="onboarding-sex" value="${escapeHtml(v)}" ${d.biologicalSex === v ? 'checked' : ''}><span>${v === 'prefer_not_to_say' ? 'Prefer not to say' : v[0].toUpperCase()+v.slice(1)}</span></label>`).join('')}</div></fieldset>
        <label class="block"><span class="text-xs font-bold">Date of birth <span class="font-normal text-on-surface-variant">(needed for automatic estimate)</span></span><input id="onboarding-dob" type="date" value="${escapeHtml(d.dateOfBirth || '')}" class="mt-1.5 w-full rounded-xl border border-outline-variant/40 bg-white dark:bg-dark-surface-card px-4 py-3" /></label>
        <div><div class="flex justify-between"><span class="text-xs font-bold">Height</span><button type="button" onclick="window.toggleOnboardingHeightUnit()" class="text-xs font-bold text-primary">${d.heightUnit === 'cm' ? 'Use ft/in' : 'Use cm'}</button></div>${d.heightUnit === 'cm' ? `<input id="onboarding-height-cm" type="number" inputmode="decimal" value="${escapeHtml(d.heightCm || '')}" placeholder="Height in cm" class="mt-1.5 w-full rounded-xl border border-outline-variant/40 bg-white dark:bg-dark-surface-card px-4 py-3" />` : `<div class="grid grid-cols-2 gap-2 mt-1.5"><input id="onboarding-height-ft" type="number" inputmode="numeric" value="${escapeHtml(feet.feet || '')}" placeholder="Feet" class="rounded-xl border border-outline-variant/40 bg-white dark:bg-dark-surface-card px-4 py-3"><input id="onboarding-height-in" type="number" inputmode="decimal" value="${escapeHtml(feet.inches || '')}" placeholder="Inches" class="rounded-xl border border-outline-variant/40 bg-white dark:bg-dark-surface-card px-4 py-3"></div>`}</div>
        <div><div class="flex justify-between"><span class="text-xs font-bold">Current weight</span><button type="button" onclick="window.toggleOnboardingWeightUnit()" class="text-xs font-bold text-primary">Use ${d.weightUnit === 'kg' ? 'lb' : 'kg'}</button></div><div class="relative mt-1.5"><input id="onboarding-current-weight" type="number" inputmode="decimal" value="${escapeHtml(displayWeight)}" class="w-full rounded-xl border border-outline-variant/40 bg-white dark:bg-dark-surface-card px-4 py-3 pr-14"><span class="absolute right-4 top-3 text-sm text-on-surface-variant">${d.weightUnit}</span></div></div>
        <label class="block"><span class="text-xs font-bold">Target weight <span class="font-normal text-on-surface-variant">(optional)</span></span><div class="relative mt-1.5"><input id="onboarding-target-weight" type="number" inputmode="decimal" value="${escapeHtml(targetWeight)}" class="w-full rounded-xl border border-outline-variant/40 bg-white dark:bg-dark-surface-card px-4 py-3 pr-14"><span class="absolute right-4 top-3 text-sm text-on-surface-variant">${d.weightUnit}</span></div></label>
      </div>
      <p id="onboarding-error" class="min-h-5 mt-3 text-xs text-error" role="alert"></p>
      ${actions(3)}
    </section>`, 3);
}

function renderActivity(): string {
  const selected = store.getState().onboardingDraft.activityLevel;
  return shell(`
    <section class="pt-6">
      <p class="text-xs font-extrabold uppercase tracking-wider text-primary">Activity</p>
      <h1 class="font-heading text-2xl font-extrabold mt-1">What is your usual activity level?</h1>
      <div class="mt-6 space-y-2" role="radiogroup">
        ${(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map(level => { const item = ACTIVITY_MULTIPLIERS[level]; return `<button type="button" role="radio" aria-checked="${selected === level}" onclick="window.selectOnboardingActivity(${htmlJsArg(level)})" class="w-full min-h-16 rounded-2xl border p-4 text-left ${selected === level ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-outline-variant/30 bg-surface-container-lowest dark:bg-dark-surface-card'}"><span class="font-bold text-sm block">${item.label}</span><span class="text-xs text-on-surface-variant dark:text-gray-400">${item.description}</span></button>`; }).join('')}
      </div>
      <p id="onboarding-error" class="min-h-5 mt-2 text-xs text-error" role="alert"></p>
      ${actions(4)}
    </section>`, 4);
}

export function getOnboardingGoalPreview() {
  const state = store.getState();
  const d = state.onboardingDraft;
  const age = calculateAge(d.dateOfBirth);
  const sex = resolveCalculationSex(d.biologicalSex);
  const result = d.currentWeightKg && d.heightCm && age !== null && d.activityLevel && d.weightDirection !== null
    ? calculateFullGoals({ weightKg: d.currentWeightKg, heightCm: d.heightCm, ageYears: age, calculationSex: sex, activityLevel: d.activityLevel, weeklyRateKg: d.weightDirection })
    : null;
  return result;
}

function renderReview(): string {
  const state = store.getState();
  const d = state.onboardingDraft;
  const result = getOnboardingGoalPreview();
  const goals = result ? { calories: result.reviewedSuggestedCalories, protein: result.protein, carbs: result.carbs, fat: result.fat } : { calories: state.nutritionGoals.calorieTarget, protein: state.nutritionGoals.proteinTarget, carbs: state.nutritionGoals.carbsTarget, fat: state.nutritionGoals.fatTarget };
  return shell(`
    <section class="pt-6">
      <p class="text-xs font-extrabold uppercase tracking-wider text-primary">Review</p>
      <h1 class="font-heading text-2xl font-extrabold mt-1">Your starting goals</h1>
      <p class="text-sm text-on-surface-variant dark:text-gray-400 mt-2">These are starting estimates. You can adjust them anytime in Profile.</p>
      ${!result ? `<div class="mt-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300/50 text-xs"><strong>Automatic estimate unavailable.</strong><p class="mt-1">Age and a female/male calculation profile are required for Mifflin–St Jeor. Your current nutrition targets will be kept and can be edited manually.</p></div>` : result.needsReview ? `<div class="mt-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300/50 text-xs">${escapeHtml(result.reviewReason || 'Please review this estimate.')}</div>` : ''}
      <div class="mt-5 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 divide-y divide-outline-variant/20">
        <div class="p-4 flex justify-between"><span class="text-sm text-on-surface-variant">Goal</span><strong class="text-sm">${d.weightDirection === null ? 'Not selected' : formatWeeklyRate(d.weightDirection, d.weightUnit)}</strong></div>
        <div class="p-4 flex justify-between"><span class="text-sm text-on-surface-variant">Activity</span><strong class="text-sm">${d.activityLevel ? ACTIVITY_MULTIPLIERS[d.activityLevel].label : 'Not selected'}</strong></div>
        <div class="p-4 flex justify-between"><span class="text-sm text-on-surface-variant">Daily calories</span><strong class="text-lg text-primary">${goals.calories.toLocaleString()} kcal</strong></div>
        <div class="p-4 grid grid-cols-3 text-center gap-2"><div><span class="text-xs text-on-surface-variant block">Protein</span><strong>${goals.protein}g</strong></div><div><span class="text-xs text-on-surface-variant block">Carbs</span><strong>${goals.carbs}g</strong></div><div><span class="text-xs text-on-surface-variant block">Fat</span><strong>${goals.fat}g</strong></div></div>
      </div>
      <p id="onboarding-error" class="min-h-5 mt-3 text-xs text-error" role="alert"></p>
      ${actions(5, 'Use These Goals')}
    </section>`, 5);
}

function renderPhoto(): string {
  const state = store.getState();
  const image = state.profileImageUrl;
  return shell(`
    <section class="pt-8 text-center">
      <p class="text-xs font-extrabold uppercase tracking-wider text-primary">Profile photo</p>
      <h1 class="font-heading text-2xl font-extrabold mt-1">Make it yours</h1>
      <p class="text-sm text-on-surface-variant dark:text-gray-400 mt-2">Your profile photo is stored on this device unless cloud sync is added in the future.</p>
      <button type="button" onclick="document.getElementById('onboarding-photo-input')?.click()" class="mt-8 mx-auto w-40 h-40 rounded-full overflow-hidden bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center border-4 border-white dark:border-dark-border shadow-glow-primary" aria-label="Choose profile photo">
        ${image ? `<img src="${escapeHtml(image)}" class="w-full h-full object-cover" alt="Selected profile photo">` : `<span class="material-symbols-outlined text-[64px]">person</span>`}
      </button>
      <input id="onboarding-photo-input" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" onchange="window.handleProfilePhotoSelected(this)">
      <div class="mt-5 flex justify-center gap-2"><button type="button" onclick="document.getElementById('onboarding-photo-input')?.click()" class="min-h-11 px-4 rounded-xl bg-primary/10 text-primary font-bold">${image ? 'Replace Photo' : 'Choose from device'}</button>${image ? `<button type="button" onclick="window.removeProfilePhoto()" class="min-h-11 px-4 rounded-xl border border-outline-variant/40 font-bold">Remove</button>` : ''}</div>
      <p id="profile-photo-error" class="min-h-5 mt-3 text-xs text-error" role="alert"></p>
      ${actions(6, 'Finish Setup', true)}
    </section>`, 6);
}

export function renderOnboardingScreen(): string {
  switch (store.getState().onboardingState.currentStep) {
    case 1: return renderWelcome();
    case 2: return renderWeightGoal();
    case 3: return renderPersonalDetails();
    case 4: return renderActivity();
    case 5: return renderReview();
    case 6: return renderPhoto();
    default: return renderWelcome();
  }
}
