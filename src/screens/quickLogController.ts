import { store } from '../store/appState.ts';
import { isVaultUnlocked } from '../services/privateStorage.ts';
import { tr } from '../i18n/index.ts';
import { formatLocalDateKey, parseLocalDateKey } from '../utils/dateUtils.ts';
import { formatDisplayNumber } from '../utils/safeNumbers.ts';
import { getUnitDimension, convertMassUnit, convertVolumeUnit } from '../utils/portionCalculations.ts';
import type { FoodUnit, MealType, NutritionValues } from '../types/index.ts';

export const QUICK_LOG_UNITS = ['serving', 'g', 'ml', 'oz', 'cup', 'scoop', 'bowl', 'piece', 'slice', 'tbsp', 'tsp'] as const;
const MACROS = ['protein', 'carbs', 'fat'] as const;
type FieldError = { id: string; message: string };
let saving = false;
let privacyBlocked = false;
const input = (id: string) => document.getElementById(id) as HTMLInputElement | null;

function errors(): FieldError[] {
  const found: FieldError[] = [];
  if (!input('ql-food-name')?.value.trim()) found.push({ id: 'ql-food-name', message: tr('Please provide a food or recipe name.') });
  const calories = input('ql-calories')?.valueAsNumber;
  if (calories === undefined || !Number.isFinite(calories) || calories < 0)
    found.push({ id: 'ql-calories', message: tr('Please enter a valid non-negative calorie amount.') });
  for (const macro of MACROS) {
    const field = input(`ql-${macro}`);
    if (field && (field.validity.badInput || field.value !== '' && (!Number.isFinite(field.valueAsNumber) || field.valueAsNumber < 0)))
      found.push({ id: `ql-${macro}`, message: tr('Enter a non-negative value or leave this macro blank.') });
  }
  const quantity = input('ql-quantity')?.valueAsNumber;
  if (quantity === undefined || !Number.isFinite(quantity) || quantity <= 0)
    found.push({ id: 'ql-quantity', message: tr('Enter a quantity greater than zero.') });
  const unit = (document.getElementById('ql-unit') as HTMLSelectElement | null)?.value;
  if (!QUICK_LOG_UNITS.some(item => item === unit)) found.push({ id: 'ql-unit', message: tr('Choose a portion unit.') });
  const date = input('ql-date')?.value ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || formatLocalDateKey(parseLocalDateKey(date)) !== date)
    found.push({ id: 'ql-date', message: tr('Choose a valid log date.') });
  const time = input('ql-time')?.value ?? '';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) found.push({ id: 'ql-time', message: tr('Choose a valid log time.') });
  return found;
}

function showErrors(found: FieldError[], focus = false): void {
  const form = document.getElementById('quicklog-form');
  const banner = document.getElementById('quicklog-error-banner');
  const list = document.getElementById('quicklog-error-list');
  if (!form || !banner || !list) return;
  form.dataset.validated = 'true';
  for (const field of form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input[id], select[id]')) {
    const error = found.find(item => item.id === field.id);
    field.setAttribute('aria-invalid', String(!!error));
    const label = document.getElementById(`${field.id}-error`);
    if (label && label.textContent !== (error?.message ?? '')) label.textContent = error?.message ?? '';
  }
  banner.hidden = found.length === 0;
  list.replaceChildren(...found.map(error => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${error.id}`; link.textContent = error.message;
    link.onclick = event => {
      event.preventDefault();
      const field = document.getElementById(error.id);
      field?.focus({ preventScroll: true }); field?.scrollIntoView({ block: 'center', behavior: 'auto' });
    };
    item.append(link); return item;
  }));
  if (focus && found.length) { banner.focus({ preventScroll: true }); banner.scrollIntoView({ block: 'start', behavior: 'auto' }); }
}

function syncControls(): void {
  const form = document.getElementById('quicklog-form');
  form?.setAttribute('aria-busy', String(saving));
  for (const control of form?.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input, button, select') ?? [])
    control.disabled = saving || privacyBlocked;
  document.getElementById('quicklog-save')?.setAttribute('aria-busy', String(saving));
}

export function refreshQuickLogFeedback(): void {
  if (!isVaultUnlocked() || store.getState().currentScreen !== 'quickLog') return;
  const form = document.getElementById('quicklog-form');
  if (form?.dataset.validated === 'true' && !saving && !privacyBlocked) showErrors(errors());
  syncControls();
}

export function bindQuickLogFeedback(): void {
  document.addEventListener('nutriai:lock-start', () => { privacyBlocked = true; syncControls(); });
  document.addEventListener('nutriai:lock-end', () => { privacyBlocked = false; refreshQuickLogFeedback(); });
  document.addEventListener('input', event => {
    if (event.target instanceof HTMLElement && event.target.closest('#quicklog-form')) refreshQuickLogFeedback();
  });
}

/** Nutrition describes the entire entered portion, with unknown macros kept null. */
export function submitQuickLog(): void {
  if (!isVaultUnlocked() || saving || privacyBlocked || store.getState().currentScreen !== 'quickLog') return;
  const invalid = errors();
  if (invalid.length) { showErrors(invalid, true); return; }
  const name = input('ql-food-name')!.value.trim();
  const quantity = input('ql-quantity')!.valueAsNumber;
  const unit = (document.getElementById('ql-unit') as HTMLSelectElement).value as FoodUnit;
  const dimension = getUnitDimension(unit);
  const baseUnit = dimension === 'mass' ? 'g' : dimension === 'volume' ? 'ml' : 'serving';
  const baseAmount = baseUnit === 'g' ? convertMassUnit(quantity, unit, 'g')
    : baseUnit === 'ml' ? convertVolumeUnit(quantity, unit, 'ml') : quantity;
  if (baseAmount === null || !Number.isFinite(baseAmount) || baseAmount <= 0) {
    showErrors([{ id: 'ql-quantity', message: tr('Enter a quantity greater than zero.') }], true); return;
  }
  const servingDescription = input('ql-serving')!.value.trim() || `${formatDisplayNumber(quantity)} ${tr(unit)}`;
  const nutrition: NutritionValues = {
    calories: input('ql-calories')!.valueAsNumber,
    protein: input('ql-protein')!.value === '' ? null : input('ql-protein')!.valueAsNumber,
    carbs: input('ql-carbs')!.value === '' ? null : input('ql-carbs')!.valueAsNumber,
    fat: input('ql-fat')!.value === '' ? null : input('ql-fat')!.valueAsNumber,
    calorieSource: 'manual',
  };
  const date = input('ql-date')!.value;
  const time = input('ql-time')!.value;
  const mealType = (document.querySelector<HTMLInputElement>('input[name="ql-meal-type"]:checked')?.value ?? 'lunch') as MealType;
  const saveFood = input('ql-save-to-my-foods')!.checked;
  let foodId = `quick-${crypto.randomUUID()}`;
  saving = true; refreshQuickLogFeedback();
  try {
    if (saveFood) {
      const result = store.createCustomFood({ name, category: 'Custom Food',
        nutritionBasis: { amount: baseAmount, unit: baseUnit, servingDescription }, nutrition,
        portionOptions: [{ id: crypto.randomUUID(), label: servingDescription, unit, dimension, quantity,
          equivalentBaseAmount: baseAmount, equivalentBaseUnit: baseUnit === 'ml' ? 'ml' : 'g' }],
      }, { openPortion: false });
      if (!result.success || !result.food) {
        showErrors([{ id: 'ql-food-name', message: result.error ?? tr('Food name is required.') }], true); return;
      }
      foodId = result.food.id;
    }
    store.logMeal({ date, time, mealType, foodId, foodName: name, name,
      portion: { foodId, quantity, unit, baseAmount, baseUnit, servingDescription },
      nutritionSnapshot: nutrition, foodSource: saveFood ? 'custom' : 'quick_log',
      category: servingDescription, calories: nutrition.calories!, protein: nutrition.protein ?? 0,
      carbs: nutrition.carbs ?? 0, fat: nutrition.fat ?? 0, icon: 'edit_note',
    });
    store.selectDate(date);
    store.setScreen('diary');
  } catch {
    showErrors([{ id: 'ql-food-name', message: tr('Could not complete the log. Check your diary and My Foods before retrying.') }], true);
  } finally {
    saving = false;
    syncControls();
  }
}
