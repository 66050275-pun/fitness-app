import { tr, trHtml } from '../../i18n/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
import { readReviewNumber, resolveCookingFatDraft, validateScanReview } from '../../services/foodScanService.ts';
import type { FoodScanReview, FoodScanReviewField } from '../../types/index.ts';

type FieldError = { field: FoodScanReviewField; message: string };

export function renderScanReviewField(review: FoodScanReview, key: FoodScanReviewField, label: string, numeric = false): string {
  const required = key === 'name' || key === 'servingDescription' || key === 'calories';
  return `<div class="nutrition-field-group"><label for="scan-review-${key}">${trHtml(label)}${required ? ` <span class="nutrition-required">${trHtml('(required)')}</span>` : ''}</label>
    <input id="scan-review-${key}" class="ui-field" type="text" ${required ? 'required' : ''}
      ${numeric ? 'inputmode="decimal" maxlength="24"' : `maxlength="${key === 'name' ? 200 : 300}"`}
      aria-describedby="scan-review-${key}-error${numeric ? ' scan-review-nutrition-help' : ''}"
      value="${escapeHtml(key === 'cookingFatGrams' ? review.cookingFatInput : review[key])}" ${key === 'cookingFatGrams' ? 'oninput="window.scanCookingDraft(this.value)" onchange' : 'oninput'}="window.scanReviewInput('${key}', this.value)"
      ${numeric ? `placeholder="${trHtml('Unknown')}"` : ''} />
    <p id="scan-review-${key}-error" class="nutrition-field-error" role="alert"></p></div>`;
}

export function renderScanReviewErrorSummary(): string {
  return `<section id="scan-review-error-summary" class="nutrition-error-summary" tabindex="-1" aria-labelledby="scan-review-error-title" hidden>
    <h2 id="scan-review-error-title">${trHtml('Check your details')}</h2><ul id="scan-review-error-list"></ul></section>`;
}

/** Presentation of the existing review contract; save validation remains in foodScanService. */
function fieldErrors(review: FoodScanReview): FieldError[] {
  const errors: FieldError[] = [];
  if (!review.name.trim()) errors.push({ field: 'name', message: tr('Enter a food name.') });
  if (!review.servingDescription.trim()) errors.push({ field: 'servingDescription', message: tr('Describe the portion you will log.') });
  for (const field of ['calories', 'protein', 'carbs', 'fat', 'cookingFatGrams'] as const) {
    const value = field === 'cookingFatGrams' ? review.cookingFatInput : review[field];
    try {
      if (readReviewNumber(value, field === 'calories' ? 20_000 : 2000) === null && field === 'calories')
        errors.push({ field, message: tr('Enter the calories before saving this meal.') });
    } catch {
      errors.push({ field, message: tr('Enter a value from 0 to {0}, or leave an optional field blank.', field === 'calories' ? '20,000' : '2,000') });
    }
  }
  if (!errors.length) {
    try {
      const resolved = resolveCookingFatDraft(review);
      const cooking = readReviewNumber(resolved.cookingFatGrams);
      const fat = readReviewNumber(resolved.fat);
      if (cooking !== null && (fat === null || cooking > fat))
        errors.push({ field: 'cookingFatGrams', message: tr('Cooking fat must be part of the total fat.') });
    } catch {
      errors.push({ field: 'cookingFatGrams', message: tr('Enter a cooking-fat estimate within the total fat allowance.') });
    }
  }
  // Keep any future service constraint visible even if it has no dedicated field yet.
  const fallback = validateScanReview(review);
  if (!errors.length && fallback) errors.push({ field: 'name', message: tr(fallback) });
  return errors.map(error => error.field === 'cookingFatGrams' && !document.getElementById('scan-review-cookingFatGrams')
    ? { ...error, field: 'fat' } : error);
}

export function showScanReviewErrors(review: FoodScanReview, focus = false): boolean {
  const errors = fieldErrors(review);
  const summary = document.getElementById('scan-review-error-summary');
  const list = document.getElementById('scan-review-error-list');
  if (!summary || !list) return errors.length > 0;
  for (const field of ['name', 'servingDescription', 'calories', 'protein', 'carbs', 'fat', 'cookingFatGrams'] as const) {
    const error = errors.find(item => item.field === field);
    document.getElementById(`scan-review-${field}`)?.setAttribute('aria-invalid', String(!!error));
    const hint = document.getElementById(`scan-review-${field}-error`);
    if (hint && hint.textContent !== (error?.message ?? '')) hint.textContent = error?.message ?? '';
  }
  summary.hidden = errors.length === 0;
  list.replaceChildren(...errors.map(error => {
    const item = document.createElement('li'); const link = document.createElement('a');
    link.href = `#scan-review-${error.field}`; link.textContent = error.message;
    link.onclick = event => {
      event.preventDefault(); const field = document.getElementById(`scan-review-${error.field}`);
      field?.focus({ preventScroll: true }); field?.scrollIntoView({ block: 'center', behavior: 'auto' });
    };
    item.append(link); return item;
  }));
  if (focus && errors.length) { summary.focus({ preventScroll: true }); summary.scrollIntoView({ block: 'start', behavior: 'auto' }); }
  return errors.length > 0;
}
