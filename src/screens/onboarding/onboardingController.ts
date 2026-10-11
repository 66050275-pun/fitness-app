import { store } from '../../store/appState.ts';
import { isVaultUnlocked } from '../../services/privateStorage.ts';
import { tr } from '../../i18n/index.ts';
import { calculateAge } from '../../utils/goalCalculations.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';
import { getObjective, getOnboardingTargets, getOnboardingWaterTarget, ONBOARDING_ACTIVITIES, validateOnboardingDraft } from '../../utils/onboardingGoals.ts';

let completing = false;
let privacyBlocked = false;
let operation = 0;
const FIELD_IDS: Record<string, string> = {
  ageYears: 'onboarding-age', heightCm: 'onboarding-height-cm', currentWeightKg: 'onboarding-current-weight',
  targetWeightKg: 'onboarding-target-weight', calorieOverride: 'onboarding-calories',
};
function pendingConfirmation(): boolean {
  const state = store.getState();
  return state.currentScreen === 'onboarding' && state.onboardingState.isCompleted;
}
function canEdit(): boolean {
  return isVaultUnlocked() && !privacyBlocked && !completing && !pendingConfirmation() && store.getState().currentScreen === 'onboarding';
}
function readNumber(id: string): number | null {
  const input = document.getElementById(id) as HTMLInputElement | null;
  return input && input.value.trim() && Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : null;
}
/** Input changes update the encrypted draft without replacing focused form controls. */
function captureMetrics(): void {
  if (store.getState().onboardingState.currentStep !== 2 || !document.getElementById('onboarding-age')) return;
  const ageYears = readNumber('onboarding-age');
  const current = store.getState();
  const originalDob = current.onboardingDraft.dateOfBirth ?? current.userProfile.dateOfBirth ?? null;
  const sex = document.querySelector<HTMLInputElement>('input[name="onboarding-sex"]:checked')?.value;
  store.updateOnboardingDraft({
    displayName: (document.getElementById('onboarding-name') as HTMLInputElement | null)?.value.trim() ?? current.onboardingDraft.displayName,
    biologicalSex: sex === 'male' || sex === 'female' || sex === 'other' ? sex : null,
    ageYears, dateOfBirth: ageYears !== null && calculateAge(originalDob) === ageYears ? originalDob : null,
    heightCm: readNumber('onboarding-height-cm'), currentWeightKg: readNumber('onboarding-current-weight'), targetWeightKg: readNumber('onboarding-target-weight'),
  }, false);
}
function captureCalories(): void {
  if (store.getState().onboardingState.currentStep === 4 && document.getElementById('onboarding-calories'))
    store.updateOnboardingDraft({ calorieOverride: readNumber('onboarding-calories') }, false);
}
function setText(id: string, text: string): void { const element = document.getElementById(id); if (element) element.textContent = text; }
function setBusyControls(): void {
  const root = document.querySelector<HTMLElement>('.onboarding-wizard');
  if (!root) return;
  root.setAttribute('aria-busy', String(completing));
  for (const control of root.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input, button, select'))
    control.disabled = completing || privacyBlocked || (pendingConfirmation() && control.id !== 'onboarding-next');
}
export function refreshOnboardingFeedback(): void {
  if (!isVaultUnlocked() || store.getState().currentScreen !== 'onboarding') return;
  const draft = store.getState().onboardingDraft;
  const delta = document.getElementById('onboarding-weight-delta');
  if (delta) {
    const difference = draft.currentWeightKg !== null && draft.targetWeightKg !== null ? draft.targetWeightKg - draft.currentWeightKg : null;
    delta.textContent = difference === null ? tr('Add an optional target to see your weight change.')
      : tr('Target change: {0} kg', `${difference > 0 ? '+' : ''}${formatDisplayNumber(difference, 1)}`);
  }
  document.querySelectorAll<HTMLElement>('[data-onboarding-sex]').forEach(choice => {
    choice.dataset.selected = String(choice.dataset.onboardingSex === draft.biologicalSex);
  });
  const preview = getOnboardingTargets(draft);
  for (const [name, value] of Object.entries({
    calories: preview?.goals.calorieTarget, protein: preview?.goals.proteinTarget, carbs: preview?.goals.carbsTarget,
    fat: preview?.goals.fatTarget, water: preview?.goals.waterTarget ?? getOnboardingWaterTarget(draft.currentWeightKg),
  })) setText(`onboarding-summary-${name}`, value == null ? '—' : formatDisplayNumber(value, 0));
  setText('onboarding-estimate-note', draft.biologicalSex === 'other'
    ? tr('Automatic energy estimates need a female or male calculation profile. Enter your daily calorie target to continue.')
    : preview?.reviewReason ?? tr('Estimated locally from your body metrics and activity.'));
  setText('onboarding-summary-energy', preview?.bmr != null && preview.tdee != null
    ? tr('BMR {0} kcal · TDEE {1} kcal', formatDisplayNumber(preview.bmr, 0), formatDisplayNumber(preview.tdee, 0))
    : preview ? tr('Macros are based on your manual calorie target.') : tr('Choose daily calories to preview your macros.'));
  if (!completing) setText('onboarding-next-label', tr(pendingConfirmation() ? 'Retry setup save'
    : store.getState().onboardingState.currentStep === 4 ? 'Get Started' : 'Continue'));
  setBusyControls();
}
function showErrors(step: number): boolean {
  const errors = validateOnboardingDraft(store.getState().onboardingDraft, step);
  document.querySelectorAll<HTMLElement>('[id^="onboarding-error-"]').forEach(element => { element.textContent = ''; });
  for (const [field, id] of Object.entries(FIELD_IDS)) document.getElementById(id)?.setAttribute('aria-invalid', String(errors.some(error => error.field === field)));
  for (const error of errors) setText(`onboarding-error-${error.field}`, error.message);
  setText('onboarding-error', errors[0]?.message ?? '');
  if (errors[0]) {
    const input = document.getElementById(FIELD_IDS[errors[0].field]);
    (input ?? document.getElementById('onboarding-error'))?.focus({ preventScroll: false });
  }
  return errors.length > 0;
}

/** Main binds these globals once; rendered buttons use the existing application event convention. */
export function bindOnboardingHandlers(): void {
  document.addEventListener('nutriai:lock-start', () => { privacyBlocked = true; operation++; setBusyControls(); });
  document.addEventListener('nutriai:lock-end', () => {
    privacyBlocked = false;
    if (isVaultUnlocked()) refreshOnboardingFeedback();
  });
  window.selectOnboardingObjective = objective => {
    if (!canEdit()) return;
    const selected = getObjective(objective);
    if (!selected) return;
    store.updateOnboardingDraft({ primaryObjective: selected.id, weightDirection: selected.weightDirection, calorieOverride: null });
  };
  window.selectOnboardingActivity = level => {
    if (canEdit() && ONBOARDING_ACTIVITIES.some(activity => activity.id === level)) store.updateOnboardingDraft({ activityLevel: level, calorieOverride: null });
  };
  window.captureOnboardingInput = input => {
    if (!canEdit()) return;
    captureMetrics(); captureCalories(); refreshOnboardingFeedback();
    const field = Object.keys(FIELD_IDS).find(name => FIELD_IDS[name] === input.id);
    if (field) {
      const error = validateOnboardingDraft(store.getState().onboardingDraft, store.getState().onboardingState.currentStep).find(item => item.field === field);
      input.setAttribute('aria-invalid', String(!!error));
      setText(`onboarding-error-${field}`, error?.message ?? '');
    }
  };
  window.resetOnboardingCalories = () => { if (canEdit()) store.updateOnboardingDraft({ calorieOverride: null }); };
  window.onboardingBack = () => {
    if (!canEdit()) return;
    captureMetrics(); captureCalories();
    const state = store.getState();
    if (state.onboardingState.currentStep > 1) store.setOnboardingStep(state.onboardingState.currentStep - 1);
    else if (state.userProfile.profileSetupCompleted) store.cancelGoalSetup();
  };
  window.cancelOnboarding = () => { if (canEdit()) store.cancelGoalSetup(); };
  window.onboardingNext = () => { void advance(); };
}
async function advance(): Promise<void> {
  if (!isVaultUnlocked() || privacyBlocked || completing || store.getState().currentScreen !== 'onboarding') return;
  const current = store.getState();
  const retrying = pendingConfirmation();
  if (!retrying) {
    captureMetrics(); captureCalories();
    const step = current.onboardingState.currentStep;
    if (showErrors(step)) return;
    if (step < 4) { store.setOnboardingStep(step + 1); return; }
  }
  completing = true;
  const openingStore = store;
  const token = ++operation;
  setText('onboarding-error', ''); setText('onboarding-next-label', tr('Saving your setup…')); setBusyControls();
  try { await openingStore.completeOnboarding(); }
  catch {
    if (token === operation && isVaultUnlocked() && openingStore === store && store.getState().currentScreen === 'onboarding')
      setText('onboarding-error', tr('Your setup could not be saved. Keep this tab open and retry.'));
  } finally {
    completing = false;
    if (isVaultUnlocked() && store.getState().currentScreen === 'onboarding') refreshOnboardingFeedback();
  }
}
