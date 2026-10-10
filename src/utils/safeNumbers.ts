import { tr, getLocale } from '../i18n/index.ts';
/**
 * Safe Number Utilities
 *
 * Central source-of-truth for safe numeric handling across the app.
 * Every calculation that touches UI display should go through these guards.
 *
 * Policies:
 * 1. User input: reject invalid values, show validation error
 * 2. Optional corrupted field: replace with null, not zero
 * 3. Required corrupted record: skip/quarantine the record
 * 4. Derived UI value: clamp only for visual display
 * 5. Meaningfully signed values: preserve and format contextually
 */

/**
 * Returns 0 if value is negative, NaN, or Infinity.
 * Use ONLY for values that are semantically non-negative (counts, durations, consumed amounts).
 * Do NOT use for values that can be meaningfully negative (weight change, calorie balance).
 */
export function clampNonNegative(value: number): number {
  if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) return 0;
  return Math.max(0, value);
}

/**
 * Returns a safe, finite number from an unknown value.
 * If value is null, undefined, NaN, or Infinity, returns the fallback.
 * If fallback is not provided, returns 0.
 */
export function safeFiniteNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  if (!isFinite(num) || isNaN(num)) return fallback;
  return num;
}

/**
 * Returns null if the value is not a valid finite number.
 * Use for optional fields where invalid data should become absent, not zero.
 */
export function safeFiniteOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  if (!isFinite(num) || isNaN(num)) return null;
  return num;
}

/**
 * Safe division: returns 0 when denominator is 0, NaN, or Infinity.
 * Prevents division-by-zero across all ratio calculations.
 */
export function safeRatio(numerator: number, denominator: number): number {
  if (typeof numerator !== 'number' || typeof denominator !== 'number') return 0;
  if (!isFinite(numerator) || !isFinite(denominator)) return 0;
  if (isNaN(numerator) || isNaN(denominator)) return 0;
  if (denominator === 0) return 0;
  const result = numerator / denominator;
  return isFinite(result) ? result : 0;
}

/**
 * Clamps a progress percentage to 0–100 range.
 * The actual value can exceed the target, but visual progress must not exceed 100%.
 */
export function clampProgress(value: number): number {
  if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/**
 * Clamps a progress ratio to 0–1 range for SVG stroke calculations.
 */
export function clampProgressRatio(value: number): number {
  if (typeof value !== 'number' || !isFinite(value) || isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Formats remaining calories for display.
 * When remaining is negative (consumed > target), shows "X kcal over" instead of "-X".
 * When remaining is positive, shows "X kcal left" (or just the number if label is handled separately).
 */
export function formatRemainingCalories(remaining: number): { value: number; text: string; isOver: boolean } {
  const safe = safeFiniteNumber(remaining, 0);
  if (safe < 0) {
    const overAmount = Math.abs(Math.round(safe));
    return {
      value: overAmount,
      text: tr("{0} kcal over", overAmount.toLocaleString(getLocale())),
      isOver: true
    };
  }
  const rounded = Math.round(safe);
  return {
    value: rounded,
    text: `${rounded.toLocaleString(getLocale())}`,
    isOver: false
  };
}

/**
 * Formats a signed weight change for friendly display.
 * Internal: -0.5 (lost weight) → "Lost 0.5 kg"
 * Internal: +0.3 (gained weight) → "Gained 0.3 kg"
 * Internal: 0 → "No change"
 */
export function formatWeightChange(deltaKg: number, unit: 'kg' | 'lb' = 'kg'): string {
  const safe = safeFiniteNumber(deltaKg, 0);
  if (Math.abs(safe) < 0.05) return 'No change';

  const abs = Math.abs(Math.round(safe * 10) / 10);
  const displayValue = unit === 'lb' ? Math.round(abs * 2.20462 * 10) / 10 : abs;
  const unitLabel = unit === 'lb' ? 'lb' : 'kg';

  if (safe < 0) return `Lost ${displayValue} ${unitLabel}`;
  return `Gained ${displayValue} ${unitLabel}`;
}

/**
 * Formats a weekly weight rate for display.
 * Internal signed value: -0.25 → "Lose 0.25 kg/week"
 * Internal signed value: +0.50 → "Gain 0.50 kg/week"
 * Internal signed value: 0 → "Maintain weight"
 */
export function formatWeeklyRate(rateKgPerWeek: number, unit: 'kg' | 'lb' = 'kg'): string {
  const safe = safeFiniteNumber(rateKgPerWeek, 0);
  if (Math.abs(safe) < 0.01) return tr('Maintain weight');

  const abs = Math.abs(safe);
  const displayValue = unit === 'lb'
    ? Math.round(abs * 2.20462 * 100) / 100
    : abs;
  const unitLabel = unit === 'lb' ? 'lb' : 'kg';
  const verb = safe < 0 ? 'Lose' : 'Gain';

  return tr('{0} approximately {1} {2} per week', tr(verb), displayValue, tr(unitLabel));
}

/**
 * Validates a numeric input field. Returns error message or null if valid.
 * For user-input validation — rejects invalid values rather than clamping.
 */
export function validatePositiveNumber(
  value: unknown,
  fieldName: string,
  options?: { min?: number; max?: number; required?: boolean }
): string | null {
  const { min, max, required = false } = options || {};

  if (value === null || value === undefined || value === '') {
    return required ? `${fieldName} is required` : null;
  }

  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (num < 0) {
    return `${fieldName} cannot be negative`;
  }
  if (num === 0 && required) {
    return `${fieldName} must be greater than zero`;
  }
  if (min !== undefined && num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (max !== undefined && num > max) {
    return `${fieldName} must be at most ${max}`;
  }
  return null;
}
