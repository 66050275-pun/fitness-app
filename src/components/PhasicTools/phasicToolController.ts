import { store } from '../../store/appState.ts';
import { isVaultUnlocked } from '../../services/privateStorage.ts';
import { estimateHiddenFat, getFatGauge, getPhaseCycleProgress, isValidCalendarKey } from '../../services/phasicRecompService.ts';
import { tr } from '../../i18n/index.ts';
import { getTodayKey } from '../../utils/dateUtils.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';
import type { HiddenFatEstimateCounts, MealType, PhasicCycle, SpecialProgramToolId } from '../../types/index.ts';

declare global {
  interface Window {
    phasicRefreshHiddenFat: () => void;
    phasicAddFatPreset: (preset: keyof HiddenFatEstimateCounts) => void;
    phasicSaveHiddenFat: () => void;
    phasicRemoveHiddenFat: (id: string) => void;
    phasicSetProteinMeals: (count: 4 | 5) => void;
    phasicSaveCycle: () => void;
    phasicValidateCycle: () => void;
    phasicStopCycle: () => void;
  }
}

let blocked = false;
let mutating = false;
let dayWatcher: number | null = null;
let lastDay = '';
let cycleValidationVisible = false;

function inTool(id: SpecialProgramToolId): boolean {
  if (!isVaultUnlocked() || blocked || mutating) return false;
  const state = store.getState();
  return store.isSpecialProgramUnlocked() && state.quickAddOpen && state.quickAddView === 'tool'
    && state.selectedSpecialProgramTool === id;
}
function input(id: string): HTMLInputElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element : null;
}
function setText(id: string, value: string): void {
  const element = document.getElementById(id);
  if (element && element.textContent !== value) element.textContent = value;
}
function feedback(id: string, message: string, error = true): void {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('phasic-tool-error', error);
  element.classList.toggle('phasic-tool-success', !error);
}
function readFatCounts(): HiddenFatEstimateCounts {
  const counts = {
    oil: input('phasic-fat-oil')?.valueAsNumber ?? NaN,
    coconut: input('phasic-fat-coconut')?.valueAsNumber ?? NaN,
    dressing: input('phasic-fat-dressing')?.valueAsNumber ?? NaN,
  };
  estimateHiddenFat(counts);
  return counts;
}

/** Update the estimate without remounting a focused field or storing unsaved form values. */
export function refreshPhasicToolFeedback(): void {
  if (inTool('phase-cycle') && cycleValidationVisible) showCycleValidation();
  else if (!mutating && !inTool('phase-cycle')) cycleValidationVisible = false;
  if (!inTool('hidden-fat-scanner') || !input('phasic-fat-oil')) return;
  try {
    const estimate = estimateHiddenFat(readFatCounts());
    const state = store.getState();
    const today = getTodayKey();
    const gauge = getFatGauge(store.getMealsForDate(today), today, store.getEffectiveNutritionGoals(today).fatTarget,
      state.userProfile.dietProgram ?? 'standard', state.userProfile.currentWeightKg);
    const balance = gauge.ceilingGrams - gauge.consumedKnownGrams - estimate.fatGrams;
    setText('phasic-fat-estimate', tr('{0} g', formatDisplayNumber(estimate.fatGrams)));
    setText('phasic-fat-calories', tr('{0} kcal', formatDisplayNumber(estimate.calories, 0)));
    setText('phasic-fat-remaining', tr(balance < 0 ? '{0} g over the ceiling' : '{0} g remaining', formatDisplayNumber(Math.abs(balance))));
  } catch {
    setText('phasic-fat-estimate', '—'); setText('phasic-fat-calories', '—'); setText('phasic-fat-remaining', '—');
    feedback('phasic-fat-feedback', tr('Enter whole preset counts between 0 and 20.'));
  }
}

/** Mirror the saved-cycle constraints in the form; the service validates again before saving. */
function showCycleValidation(focus = false): boolean {
  const program = store.getState().userProfile.dietProgram;
  const form = document.getElementById('phasic-cycle-form');
  const summary = document.getElementById('phasic-cycle-errors');
  const list = document.getElementById('phasic-cycle-errors-list');
  if (!form || !summary || !list || (program !== 'mini_cut' && program !== 'lean_bulk')) return false;
  const start = input('phasic-cycle-start')?.value ?? '';
  const weeks = input('phasic-cycle-weeks')?.valueAsNumber ?? NaN;
  const refeed = input('phasic-cycle-refeed')?.valueAsNumber ?? NaN;
  const errors: { id: string; message: string }[] = [];
  if (!isValidCalendarKey(start)) errors.push({ id: 'phasic-cycle-start', message: tr('Choose a valid cycle start date.') });
  if (!Number.isInteger(weeks) || weeks < 3 || weeks > (program === 'mini_cut' ? 6 : 24))
    errors.push({ id: 'phasic-cycle-weeks', message: tr(program === 'mini_cut' ? 'Enter 3–6 whole weeks.' : 'Enter 3–24 whole weeks.') });
  if (program === 'mini_cut' && (!Number.isInteger(refeed) || refeed < 300 || refeed > 500))
    errors.push({ id: 'phasic-cycle-refeed', message: tr('Enter 300–500 whole extra calories.') });
  for (const id of ['phasic-cycle-start', 'phasic-cycle-weeks', 'phasic-cycle-refeed']) {
    const error = errors.find(item => item.id === id);
    input(id)?.setAttribute('aria-invalid', String(!!error));
    setText(`${id}-error`, error?.message ?? '');
  }
  summary.hidden = !errors.length;
  list.replaceChildren(...errors.map(error => {
    const item = document.createElement('li'); const link = document.createElement('a');
    link.href = `#${error.id}`; link.textContent = error.message;
    link.onclick = event => { event.preventDefault(); input(error.id)?.focus({ preventScroll: true }); input(error.id)?.scrollIntoView({ block: 'nearest' }); };
    item.append(link); return item;
  }));
  if (focus && errors.length) { summary.focus({ preventScroll: true }); summary.scrollIntoView({ block: 'nearest' }); }
  return errors.length === 0;
}

export function bindPhasicToolHandlers(): void {
  document.addEventListener('nutriai:lock-start', () => { blocked = true; cycleValidationVisible = false; });
  document.addEventListener('nutriai:lock-end', () => { blocked = false; });
  window.phasicRefreshHiddenFat = () => {
    if (!inTool('hidden-fat-scanner')) return;
    feedback('phasic-fat-feedback', ''); refreshPhasicToolFeedback();
  };
  window.phasicAddFatPreset = preset => {
    if (!inTool('hidden-fat-scanner') || !['oil', 'coconut', 'dressing'].includes(preset)) return;
    const field = input(`phasic-fat-${preset}`);
    if (!field) return;
    const count = field.valueAsNumber;
    if (!Number.isInteger(count) || count < 0 || count >= 20) {
      feedback('phasic-fat-feedback', tr('Enter whole preset counts between 0 and 20.')); return;
    }
    field.value = String(count + 1); window.phasicRefreshHiddenFat();
  };
  window.phasicSaveHiddenFat = () => {
    if (!inTool('hidden-fat-scanner')) return;
    let counts: HiddenFatEstimateCounts;
    try { counts = readFatCounts(); }
    catch { feedback('phasic-fat-feedback', tr('Enter whole preset counts between 0 and 20.')); return; }
    if (estimateHiddenFat(counts).fatGrams === 0) {
      feedback('phasic-fat-feedback', tr('Choose at least one cooking-fat addition.')); return;
    }
    const selection = document.getElementById('phasic-fat-meal');
    const meal = selection instanceof HTMLSelectElement ? selection.value : '';
    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal)) return;
    mutating = true;
    let accepted = false;
    try { accepted = store.logHiddenFatEstimate(counts, meal as MealType); }
    finally { mutating = false; }
    if (!accepted) {
      feedback('phasic-fat-feedback', tr('The change could not be queued. Keep this tab open and retry.')); return;
    }
    // Dialog preservation retains drafts during notification. An accepted log intentionally consumes this draft.
    for (const preset of ['oil', 'coconut', 'dressing']) {
      const field = input(`phasic-fat-${preset}`); if (field) field.value = '0';
    }
    refreshPhasicToolFeedback();
    feedback('phasic-fat-feedback', tr('Estimate added to today’s diary. Use the save indicator to confirm storage.'), false);
  };
  window.phasicRemoveHiddenFat = id => {
    if (!inTool('hidden-fat-scanner')) return;
    const entry = store.getMealsForDate(getTodayKey()).find(meal => meal.id === id && meal.hiddenFatEstimate);
    if (!entry) return;
    store.deleteMeal(id); refreshPhasicToolFeedback();
    feedback('phasic-fat-feedback', tr('Cooking-fat estimate removed from today’s diary.'), false);
  };
  window.phasicSetProteinMeals = count => {
    if (!inTool('protein-splitter') || (count !== 4 && count !== 5)) return;
    if (!store.setProteinMealCount(count)) alert(tr('The change could not be queued. Keep this tab open and retry.'));
  };
  window.phasicValidateCycle = () => { if (inTool('phase-cycle') && cycleValidationVisible) showCycleValidation(); };
  window.phasicSaveCycle = () => {
    if (!inTool('phase-cycle')) return;
    const program = store.getState().userProfile.dietProgram;
    if (program !== 'mini_cut' && program !== 'lean_bulk') return;
    cycleValidationVisible = true;
    if (!showCycleValidation(true)) return;
    const cycle: PhasicCycle = { program, startDate: input('phasic-cycle-start')?.value ?? '',
      lengthWeeks: input('phasic-cycle-weeks')?.valueAsNumber ?? NaN,
      refeedExtraCalories: program === 'mini_cut' ? input('phasic-cycle-refeed')?.valueAsNumber ?? NaN : 400 };
    try { getPhaseCycleProgress(cycle, getTodayKey()); }
    catch {
      feedback('phasic-cycle-feedback', tr(program === 'mini_cut'
        ? 'Enter a valid start date, 3–6 whole weeks and 300–500 extra refeed calories.'
        : 'Enter a valid start date and 3–24 whole weeks.'));
      document.getElementById('phasic-cycle-feedback')?.focus(); return;
    }
    mutating = true;
    let accepted = false;
    try { accepted = store.savePhasicCycle(cycle); }
    finally { mutating = false; }
    feedback('phasic-cycle-feedback', tr(accepted ? 'Cycle updated. Scheduled days adjust your daily allowance automatically.'
      : 'The change could not be queued. Keep this tab open and retry.'), !accepted);
  };
  window.phasicStopCycle = () => {
    if (!inTool('phase-cycle')) return;
    const accepted = store.clearPhasicCycle();
    if (accepted) {
      cycleValidationVisible = false;
      const start = input('phasic-cycle-start'); if (start) start.value = getTodayKey();
      const weeks = input('phasic-cycle-weeks'); if (weeks) weeks.value = '4';
      const refeed = input('phasic-cycle-refeed'); if (refeed) refeed.value = '400';
      showCycleValidation();
    }
    feedback('phasic-cycle-feedback', tr(accepted ? 'Cycle cleared. Your baseline targets are unchanged.'
      : 'The change could not be queued. Keep this tab open and retry.'), !accepted);
  };
}

/** Local midnight refresh; no background request or recurring persistence write. */
export function activatePhasicTools(): void {
  deactivatePhasicTools(); blocked = false; lastDay = getTodayKey();
  const refreshDay = () => {
    if (!isVaultUnlocked() || blocked || document.hidden) return;
    const next = getTodayKey();
    if (next !== lastDay) { const previous = lastDay; lastDay = next; store.refreshPhasicDay(previous); }
  };
  dayWatcher = window.setInterval(refreshDay, 60_000);
}
export function deactivatePhasicTools(): void {
  if (dayWatcher !== null) window.clearInterval(dayWatcher);
  dayWatcher = null; lastDay = ''; mutating = false; blocked = true; cycleValidationVisible = false;
}
