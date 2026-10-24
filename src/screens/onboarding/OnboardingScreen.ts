import { tr, trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState';
import { escapeHtml, htmlJsArg } from '../../utils/sanitize';
import { formatDisplayNumber } from '../../utils/safeNumbers';
import { ONBOARDING_ACTIVITIES, ONBOARDING_OBJECTIVES, getOnboardingEnergyEstimate, getOnboardingReviewMessage, getOnboardingTargets, getOnboardingWaterTarget } from '../../utils/onboardingGoals';
import type { OnboardingTargetPreview } from '../../utils/onboardingGoals';
import type { OnboardingDraft } from '../../types/index.ts';

const STEP_COUNT = 4;

/** Screen motion is owned by ScreenTransitions; edits never remount the wizard. */
function shell(content: string, step: number): string {
  const state = store.getState();
  const canExit = state.userProfile.profileSetupCompleted === true;
  const savePending = state.onboardingState.isCompleted;
  const backAction = step > 0 ? 'window.onboardingBack()' : 'window.cancelOnboarding()';
  const backLabel = step > 0 ? 'Back' : 'Exit setup';
  const progressLabel = step === 0 ? trHtml('Introduction') : trHtml('Step {0} of 4', step);
  return `
    <div class="onboarding-wizard mx-auto w-full max-w-[430px] flex flex-col font-sans">
      <header class="onboarding-header px-screen-gutter pt-5 pb-4">
        <div class="flex items-center justify-between gap-3">
          ${step > 0 || canExit ? `<button id="onboarding-back" type="button" onclick="${backAction}" ${savePending ? 'disabled' : ''} class="ui-icon-button onboarding-back" aria-label="${trHtml(backLabel)}"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span></button>` : '<span class="onboarding-brand-mark inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><span class="material-symbols-outlined" aria-hidden="true">nutrition</span></span>'}
          <div class="min-w-0 flex-1"><span class="onboarding-brand block font-heading text-lg font-extrabold">NutriAI</span><p class="onboarding-muted text-xs mt-0.5">${trHtml('Personalize your goals')}</p></div>
          <span class="onboarding-step text-xs font-bold shrink-0">${progressLabel}</span>
        </div>
        <div class="onboarding-progress grid grid-cols-4 gap-2 mt-5" role="progressbar" aria-valuemin="0" aria-valuemax="${STEP_COUNT}" aria-valuenow="${step}" aria-label="${progressLabel}">
          ${Array.from({ length: STEP_COUNT }, (_, index) => `<span class="h-1.5 rounded-full ${index < step ? 'onboarding-progress-filled' : 'onboarding-progress-empty'}"></span>`).join('')}
        </div>
      </header>
      <main class="onboarding-main flex-1 px-screen-gutter pb-3">${content}</main>
      <footer id="onboarding-actions" class="onboarding-footer px-screen-gutter pt-3 pb-5">
        <p id="onboarding-error" class="onboarding-error text-xs leading-relaxed empty:hidden mb-3" tabindex="-1" role="alert" aria-live="polite"></p>
        <button id="onboarding-next" type="button" onclick="window.onboardingNext()" class="ui-primary-button flex items-center justify-center gap-2">
          <span id="onboarding-next-label">${trHtml(savePending ? 'Retry setup save' : step === 0 ? 'Let’s set your goals' : step === STEP_COUNT ? 'Get Started' : 'Continue')}</span><span class="material-symbols-outlined text-xl" aria-hidden="true">${savePending ? 'sync' : step === STEP_COUNT ? 'check' : 'arrow_forward'}</span>
        </button>
        ${step === 0 && canExit ? `<button type="button" onclick="window.cancelOnboarding()" class="onboarding-secondary w-full min-h-11 mt-1 text-xs font-semibold rounded-xl">${trHtml('Keep my current goals')}</button>` : ''}
      </footer>
    </div>`;
}

function heading(title: string, description: string): string {
  return `<div class="mb-6 pt-2"><h1 class="font-heading text-[26px] leading-tight font-extrabold" tabindex="-1">${trHtml(title)}</h1><p class="onboarding-muted mt-2 text-sm leading-relaxed">${trHtml(description)}</p></div>`;
}

/** Original, bundled vector artwork; no external assets or requests on first launch. */
function renderIntroduction(): string {
  const features = [
    { icon: 'nutrition', title: 'Food that fits your goals', description: 'Track meals and understand your daily nutrition.' },
    { icon: 'fitness_center', title: 'Training with a clear direction', description: 'Build your routine and follow your workout progress.' },
    { icon: 'insights', title: 'See your progress', description: 'Keep nutrition and body metrics together over time.' },
  ];
  return shell(`
    <div class="onboarding-intro-art rounded-3xl mb-5" aria-hidden="true">
      <svg class="onboarding-intro-illustration" viewBox="0 0 350 194" fill="none" focusable="false">
        <circle cx="177" cy="97" r="80" class="onboarding-art-halo"/>
        <circle cx="177" cy="97" r="61" class="onboarding-art-ring" stroke-width="2" stroke-dasharray="4 7"/>
        <rect x="113" y="36" width="129" height="126" rx="24" class="onboarding-art-card" stroke-width="2"/>
        <path d="M133 128h87M134 64h45M134 77h29" class="onboarding-art-muted" stroke-width="6" stroke-linecap="round"/>
        <path d="m136 113 24-20 20 9 27-30" class="onboarding-art-primary" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="207" cy="72" r="6" class="onboarding-art-primary-fill"/>
        <circle cx="72" cy="106" r="38" class="onboarding-art-card" stroke-width="2"/>
        <circle cx="72" cy="106" r="24" class="onboarding-art-ring" stroke-width="2"/>
        <path d="M72 119c-14-3-16-21-8-28 5 5 12 4 15 8 6 8 2 18-7 20Z" class="onboarding-art-leaf"/>
        <path d="m67 98 7 14M74 93c0-7 5-11 10-11-1 8-6 12-10 11Z" class="onboarding-art-primary" stroke-width="2" stroke-linecap="round"/>
        <rect x="252" y="39" width="63" height="63" rx="20" class="onboarding-art-card" stroke-width="2"/>
        <g class="onboarding-art-primary" stroke-width="5" stroke-linecap="round"><path d="m271 81 25-25M265 73l13 13M289 50l13 13M261 77l13 13M293 46l13 13"/></g>
        <circle cx="264" cy="147" r="19" class="onboarding-art-primary-fill"/>
        <path d="m256 147 5 5 11-12" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M51 39v10M46 44h10M300 128v8M296 132h8" class="onboarding-art-primary" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    ${heading('Welcome to NutriAI', 'Your food, fitness and progress, in one place.')}
    <ul class="onboarding-intro-features space-y-4 mb-5">
      ${features.map(item => `<li class="flex items-start gap-3"><span class="onboarding-choice-icon inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><span class="material-symbols-outlined text-xl" aria-hidden="true">${item.icon}</span></span><div class="min-w-0 pt-0.5"><h2 class="text-sm font-bold leading-relaxed">${trHtml(item.title)}</h2><p class="onboarding-muted text-xs mt-0.5 leading-relaxed">${trHtml(item.description)}</p></div></li>`).join('')}
    </ul>
    <p class="onboarding-muted text-xs leading-relaxed mb-3">${trHtml('Four simple steps, one personal starting plan.')}</p>
    <div class="onboarding-info rounded-2xl p-3 flex items-start gap-2 mb-2"><span class="material-symbols-outlined text-lg shrink-0 mt-0.5" aria-hidden="true">encrypted</span><p class="text-xs leading-relaxed">${trHtml('Your setup stays encrypted in this browser.')}</p></div>`, 0);
}

function renderObjective(): string {
  const selected = store.getState().onboardingDraft.primaryObjective;
  return shell(`
    ${heading('Choose your fitness objective', 'A clear starting point for your nutrition and training.')}
    <div class="space-y-3" role="radiogroup" aria-label="${trHtml('Choose your fitness objective')}">
      ${ONBOARDING_OBJECTIVES.map(item => `
        <button type="button" role="radio" aria-checked="${selected === item.id}" onclick="window.selectOnboardingObjective(${htmlJsArg(item.id)})" class="onboarding-choice ${selected === item.id ? 'is-selected' : ''} flex w-full items-center gap-3 rounded-2xl p-4 text-left">
          <span class="onboarding-choice-icon inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"><span class="material-symbols-outlined text-[26px]" aria-hidden="true">${escapeHtml(item.icon)}</span></span>
          <span class="min-w-0 flex-1"><strong class="block font-heading text-sm leading-relaxed">${trHtml(item.title)}</strong>${item.id === 'mini_cut' || item.id === 'lean_bulk' ? `<span class="onboarding-program-badge inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold">${trHtml('Special Program')}</span>` : ''}<span class="onboarding-muted block mt-1 text-xs leading-relaxed">${trHtml(item.description)}</span></span>
          <span class="onboarding-choice-check material-symbols-outlined text-xl shrink-0" aria-hidden="true">${selected === item.id ? 'check_circle' : 'radio_button_unchecked'}</span>
        </button>`).join('')}
    </div>
    <p id="onboarding-error-primaryObjective" class="onboarding-field-error empty:hidden" role="alert"></p>`, 1);
}

interface NumericFieldOptions {
  id: string;
  field: string;
  label: string;
  value: number | null;
  min: number;
  max: number;
  step?: string;
  unit?: string;
  optional?: boolean;
  help?: string;
}

function numericField(options: NumericFieldOptions): string {
  const { id, field, label, value, min, max, step = '0.1', unit, optional = false, help } = options;
  const describedBy = `onboarding-error-${field}${help ? ` ${id}-help` : ''}`;
  return `
    <div class="min-w-0">
      <label for="${id}" class="block text-xs font-bold leading-relaxed">${trHtml(label)}${optional ? `<span class="onboarding-muted font-normal"> ${trHtml('(optional)')}</span>` : ''}</label>
      <div class="onboarding-input-wrap relative mt-2">
        <input id="${id}" type="number" inputmode="${step === '1' ? 'numeric' : 'decimal'}" min="${min}" max="${max}" step="${step}" value="${escapeHtml(value ?? '')}" oninput="window.captureOnboardingInput(this)" ${optional ? '' : 'required'} aria-describedby="${describedBy}" class="ui-field onboarding-input w-full px-4 py-3 ${unit ? 'pr-16' : ''}">
        ${unit ? `<span class="onboarding-input-unit absolute right-4 top-1/2 -translate-y-1/2 text-xs" aria-hidden="true">${trHtml(unit)}</span>` : ''}
      </div>
      ${help ? `<p id="${id}-help" class="onboarding-muted mt-2 text-xs leading-relaxed">${trHtml(help)}</p>` : ''}
      <p id="onboarding-error-${field}" class="onboarding-field-error empty:hidden" role="alert"></p>
    </div>`;
}

function weightDelta(draft: OnboardingDraft): string {
  if (draft.currentWeightKg === null || draft.targetWeightKg === null) {
    return trHtml('Enter your current and target weights to see the difference.');
  }
  const delta = draft.targetWeightKg - draft.currentWeightKg;
  return trHtml('Target change: {0} kg', `${delta > 0 ? '+' : ''}${formatDisplayNumber(delta, 1)}`);
}

function renderMetrics(): string {
  const draft = store.getState().onboardingDraft;
  const selectedSex = draft.biologicalSex === 'prefer_not_to_say' ? 'other' : draft.biologicalSex;
  return shell(`
    ${heading('Your body metrics', 'Small details make your starting targets more personal.')}
    <section class="onboarding-card rounded-2xl p-4 space-y-5">
      <div><label for="onboarding-name" class="block text-xs font-bold">${trHtml('Display name')} <span class="onboarding-muted font-normal">${trHtml('(optional)')}</span></label><input id="onboarding-name" autocomplete="nickname" maxlength="80" value="${escapeHtml(draft.displayName)}" oninput="window.captureOnboardingInput(this)" class="ui-field onboarding-input w-full mt-2 px-4 py-3"></div>
      <fieldset><legend class="text-xs font-bold mb-2">${trHtml('Gender')}</legend>
        <div class="grid grid-cols-3 gap-2">${(['male', 'female', 'other'] as const).map(sex => `<label data-onboarding-sex="${sex}" class="onboarding-sex-choice relative flex items-center justify-center rounded-xl px-2 py-3 text-xs font-semibold text-center ${selectedSex === sex ? 'is-selected' : ''}"><input class="sr-only" type="radio" name="onboarding-sex" value="${sex}" ${selectedSex === sex ? 'checked' : ''} onchange="window.captureOnboardingInput(this)" aria-describedby="onboarding-error-biologicalSex"><span>${trHtml(sex === 'male' ? 'Male' : sex === 'female' ? 'Female' : 'Other')}</span></label>`).join('')}</div>
        <p id="onboarding-error-biologicalSex" class="onboarding-field-error empty:hidden" role="alert"></p>
      </fieldset>
      <div class="onboarding-metrics-grid grid grid-cols-2 gap-3">
        ${numericField({ id: 'onboarding-age', field: 'ageYears', label: 'Age', value: draft.ageYears, min: 15, max: 100, step: '1', unit: 'years' })}
        ${numericField({ id: 'onboarding-height-cm', field: 'heightCm', label: 'Height (cm)', value: draft.heightCm, min: 100, max: 250, unit: 'cm' })}
      </div>
      ${numericField({ id: 'onboarding-current-weight', field: 'currentWeightKg', label: 'Current weight (kg)', value: draft.currentWeightKg, min: 30, max: 250, unit: 'kg' })}
      ${numericField({ id: 'onboarding-target-weight', field: 'targetWeightKg', label: 'Target weight (kg)', value: draft.targetWeightKg, min: 30, max: 250, unit: 'kg', optional: true, help: 'Choose a target or leave it blank for now.' })}
      <div class="onboarding-info flex items-start gap-2 rounded-xl p-3"><span class="material-symbols-outlined text-lg shrink-0 mt-0.5" aria-hidden="true">swap_vert</span><p id="onboarding-weight-delta" class="text-xs leading-relaxed" aria-live="polite">${weightDelta(draft)}</p></div>
    </section>`, 2);
}

function renderActivity(): string {
  const level = store.getState().onboardingDraft.activityLevel;
  const selected = level === 'athlete' ? 'very_active' : level;
  return shell(`
    ${heading('Your daily movement', 'Think about a typical week, including work and workouts.')}
    <div class="space-y-3" role="radiogroup" aria-label="${trHtml('Your daily movement')}">
      ${ONBOARDING_ACTIVITIES.map(item => `
        <button type="button" role="radio" aria-checked="${selected === item.id}" onclick="window.selectOnboardingActivity(${htmlJsArg(item.id)})" class="onboarding-choice ${selected === item.id ? 'is-selected' : ''} flex w-full items-center gap-3 rounded-2xl p-4 text-left">
          <span class="onboarding-choice-icon inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"><span class="material-symbols-outlined text-[26px]" aria-hidden="true">${escapeHtml(item.icon)}</span></span>
          <span class="min-w-0 flex-1"><strong class="block font-heading text-sm leading-relaxed">${trHtml(item.title)}</strong><span class="onboarding-muted block mt-1 text-xs leading-relaxed">${trHtml(item.description)}</span></span>
          <span class="onboarding-choice-check material-symbols-outlined text-xl shrink-0" aria-hidden="true">${selected === item.id ? 'check_circle' : 'radio_button_unchecked'}</span>
        </button>`).join('')}
    </div>
    <p id="onboarding-error-activityLevel" class="onboarding-field-error empty:hidden" role="alert"></p>`, 3);
}

/** Kept as an exported preview for callers that render the saved target review. */
export function getOnboardingGoalPreview() {
  return getOnboardingTargets(store.getState().onboardingDraft);
}

function renderProgramDetails(draft: OnboardingDraft, preview: OnboardingTargetPreview | null): string {
  if (draft.primaryObjective !== 'mini_cut' && draft.primaryObjective !== 'lean_bulk') return '';
  const details = preview?.programDetails;
  const isMiniCut = draft.primaryObjective === 'mini_cut';
  const currentWeight = draft.currentWeightKg;
  const minGain = details?.minWeeklyGainKg ?? (currentWeight === null ? null : currentWeight * 0.0025);
  const maxGain = details?.maxWeeklyGainKg ?? (currentWeight === null ? null : currentWeight * 0.005);
  return `<section class="onboarding-program-card rounded-2xl p-4 mt-3">
    <div class="flex items-center gap-2 mb-3"><span class="material-symbols-outlined onboarding-program-icon text-xl shrink-0" aria-hidden="true">${isMiniCut ? 'local_fire_department' : 'trending_up'}</span><h2 class="text-sm font-bold leading-relaxed">${trHtml(isMiniCut ? 'Your Mini Cut plan' : 'Your Lean Bulk plan')}</h2></div>
    ${isMiniCut ? `<div class="grid grid-cols-2 gap-2"><p class="onboarding-program-fact rounded-xl px-3 py-2 text-xs font-semibold leading-relaxed">${trHtml('Recommended phase: {0} weeks', details?.recommendedDurationWeeks ?? 4)}</p><p class="onboarding-program-fact rounded-xl px-3 py-2 text-xs font-semibold leading-relaxed">${trHtml('Maximum phase: {0} weeks', details?.maxDurationWeeks ?? 6)}</p></div><p class="onboarding-muted text-xs leading-relaxed mt-3">${trHtml('Optional refeed every {0} days at maintenance calories.', details?.refeedFrequencyDays ?? 7)}</p><p class="text-xs leading-relaxed mt-2">${trHtml('Review your phase before continuing beyond the recommended duration.')}</p>` : `<p class="onboarding-program-fact rounded-xl px-3 py-2 text-sm font-bold leading-relaxed tabular-nums">${trHtml('Target weekly gain: {0}–{1} kg', formatDisplayNumber(minGain, 2), formatDisplayNumber(maxGain, 2))}</p><p class="onboarding-muted text-xs leading-relaxed mt-3">${trHtml('Aim for 0.25–0.5% of body weight per week.')}</p><p class="text-xs leading-relaxed mt-2">${trHtml('Reassess calories using your weekly weight trend.')}</p>`}
  </section>`;
}

function renderReview(): string {
  const draft = store.getState().onboardingDraft;
  const result = getOnboardingTargets(draft);
  const energy = getOnboardingEnergyEstimate(draft);
  const goals = result?.goals;
  const objective = ONBOARDING_OBJECTIVES.find(item => item.id === draft.primaryObjective);
  const isManualProfile = draft.biologicalSex === 'other' || draft.biologicalSex === 'prefer_not_to_say';
  const waterTarget = goals?.waterTarget ?? getOnboardingWaterTarget(draft.currentWeightKg, draft.primaryObjective);
  const waterRate = draft.primaryObjective === 'mini_cut' ? 38 : draft.primaryObjective === 'lean_bulk' ? 35 : 32.5;
  const inputCalories = draft.calorieOverride ?? energy?.suggestedCalories ?? null;
  const estimateNote = getOnboardingReviewMessage(draft) ?? (isManualProfile
    ? tr(result ? 'Your calorie target is entered manually; no BMR or TDEE has been inferred.'
      : 'Automatic energy estimates need a female or male calculation profile. Enter your daily calorie target to continue.')
    : result?.needsReview && result.reviewReason
      ? result.reviewReason
      : tr('Estimated locally from your body metrics and activity.'));
  return shell(`
    ${heading('Your personalized targets', 'A starting plan you can adjust as your progress changes.')}
    <section class="onboarding-target-card rounded-3xl p-5">
      ${objective ? `<span class="onboarding-objective-pill inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mb-4"><span class="material-symbols-outlined text-base" aria-hidden="true">${escapeHtml(objective.icon)}</span>${trHtml(objective.title)}</span>` : ''}
      <p class="onboarding-muted text-sm font-medium">${trHtml('Daily calorie target')}</p>
      <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1 mt-1"><strong id="onboarding-summary-calories" class="onboarding-calories font-heading text-[42px] leading-tight font-extrabold tabular-nums">${formatDisplayNumber(goals?.calorieTarget, 0)}</strong><span class="onboarding-muted text-sm">${trHtml('kcal/day')}</span></div>
      <div class="onboarding-macros grid grid-cols-3 gap-2 mt-5 pt-4">
        ${([{ id: 'protein', label: 'Protein', value: goals?.proteinTarget }, { id: 'carbs', label: 'Carbs', value: goals?.carbsTarget }, { id: 'fat', label: 'Fat', value: goals?.fatTarget }]).map(item => `<div class="min-w-0"><p class="onboarding-muted text-xs">${trHtml(item.label)}</p><p class="font-heading mt-1 text-lg font-extrabold tabular-nums"><span id="onboarding-summary-${item.id}">${formatDisplayNumber(item.value, 0)}</span> <span class="text-xs font-medium">${trHtml('g')}</span></p></div>`).join('')}
      </div>
    </section>
    ${renderProgramDetails(draft, result)}
    <section class="onboarding-card mt-3 p-4 rounded-2xl flex items-center gap-3">
      <span class="onboarding-choice-icon inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"><span class="material-symbols-outlined text-2xl" aria-hidden="true">water_drop</span></span>
      <div class="min-w-0 flex-1"><h2 class="text-sm font-bold">${trHtml('Daily hydration')}</h2><p class="onboarding-muted text-[11px] mt-0.5 leading-relaxed">${trHtml('{0} ml per kg of body weight', formatDisplayNumber(waterRate, 1))}</p></div>
      <p class="shrink-0 text-right"><strong id="onboarding-summary-water" class="block font-heading text-lg font-extrabold tabular-nums">${formatDisplayNumber(waterTarget, 0)}</strong><span class="onboarding-muted text-xs">${trHtml('ml/day')}</span></p>
    </section>
    <section class="onboarding-card mt-3 p-4 rounded-2xl">
      ${numericField({ id: 'onboarding-calories', field: 'calorieOverride', label: 'Edit daily calories', value: inputCalories, min: 800, max: 10000, step: '1', unit: 'kcal' })}
      <button id="onboarding-reset-calories" type="button" onclick="window.resetOnboardingCalories()" class="onboarding-secondary text-xs font-bold min-h-11 text-left mt-1 ${isManualProfile ? 'hidden' : ''}">${trHtml('Reset to recommended')}</button>
      <div class="onboarding-estimate mt-3 pt-3">
        <p class="onboarding-muted text-xs font-bold">${trHtml(isManualProfile ? 'Manual target' : 'Mifflin–St Jeor estimate')}</p>
        <p id="onboarding-summary-energy" class="text-xs mt-1 leading-relaxed">${energy?.bmr != null && energy.tdee !== null ? trHtml('BMR {0} kcal · TDEE {1} kcal', formatDisplayNumber(energy.bmr, 0), formatDisplayNumber(energy.tdee, 0)) : trHtml(result ? 'Macros are based on your manual calorie target.' : 'Choose daily calories to preview your macros.')}</p>
        <p id="onboarding-estimate-note" class="onboarding-muted text-xs leading-relaxed mt-2" aria-live="polite">${escapeHtml(estimateNote)}</p>
      </div>
    </section>
    <p class="onboarding-muted text-[11px] leading-relaxed mt-4 mb-1">${trHtml('Targets are general estimates based on your inputs. Adjust them in Profile anytime.')}</p>`, 4);
}

export function renderOnboardingScreen(): string {
  switch (store.getState().onboardingState.currentStep) {
    case 0: return renderIntroduction();
    case 2: return renderMetrics();
    case 3: return renderActivity();
    case 4: return renderReview();
    default: return renderObjective();
  }
}
