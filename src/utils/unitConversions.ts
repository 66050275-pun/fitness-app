import { tr } from '../i18n/index.ts';
/**
 * Unit Conversion & Formatting Utilities
 * 
 * Rules:
 * 1. Base storage for weight is ALWAYS Kilograms (kg).
 * 2. Base storage for height is ALWAYS Centimeters (cm).
 * 3. Conversions preserve numerical integrity and round cleanly for UI display.
 * 4. 1 kg = 2.20462 lb
 * 5. 1 inch = 2.54 cm, 1 ft = 12 inches = 30.48 cm
 */

import type { WeightUnit, HeightUnit } from '../types/index.ts';

export const KG_TO_LB_RATIO = 2.20462262;
export const CM_PER_INCH = 2.54;
export const INCHES_PER_FOOT = 12;

/**
 * Converts kilograms to pounds.
 */
export function kgToLb(kg: number): number {
  if (typeof kg !== 'number' || isNaN(kg) || !isFinite(kg)) return 0;
  return Math.round(kg * KG_TO_LB_RATIO * 10) / 10;
}

/**
 * Converts pounds to kilograms.
 */
export function lbToKg(lb: number): number {
  if (typeof lb !== 'number' || isNaN(lb) || !isFinite(lb)) return 0;
  return Math.round((lb / KG_TO_LB_RATIO) * 10) / 10;
}

/**
 * Converts centimeters to feet and inches.
 */
export function cmToFtIn(cm: number): { feet: number; inches: number } {
  if (typeof cm !== 'number' || isNaN(cm) || !isFinite(cm) || cm <= 0) {
    return { feet: 0, inches: 0 };
  }
  const totalInches = cm / CM_PER_INCH;
  const feet = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = Math.round(totalInches % INCHES_PER_FOOT);
  
  if (inches === 12) {
    return { feet: feet + 1, inches: 0 };
  }
  return { feet, inches };
}

/**
 * Converts feet and inches to centimeters.
 */
export function ftInToCm(feet: number, inches: number): number {
  const safeFeet = Math.max(0, Number(feet) || 0);
  const safeInches = Math.max(0, Number(inches) || 0);
  const totalInches = (safeFeet * INCHES_PER_FOOT) + safeInches;
  return Math.round(totalInches * CM_PER_INCH);
}

/**
 * Formats a weight value for display according to user preference.
 */
export function formatWeight(weightKg: number | null | undefined, unit: WeightUnit = 'kg'): string {
  if (typeof weightKg !== 'number' || isNaN(weightKg) || !isFinite(weightKg) || weightKg <= 0) {
    return '--';
  }
  if (unit === 'lb') {
    const lb = kgToLb(weightKg);
    return `${lb} ${tr('lb')}`;
  }
  return `${Math.round(weightKg * 10) / 10} ${tr('kg')}`;
}

/**
 * Formats a height value for display according to user preference.
 */
export function formatHeight(heightCm: number | null | undefined, unit: HeightUnit = 'cm'): string {
  if (typeof heightCm !== 'number' || isNaN(heightCm) || !isFinite(heightCm) || heightCm <= 0) {
    return '--';
  }
  if (unit === 'ft_in') {
    const { feet, inches } = cmToFtIn(heightCm);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(heightCm)} ${tr('cm')}`;
}
