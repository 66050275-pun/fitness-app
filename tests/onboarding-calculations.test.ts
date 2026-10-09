import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAge, calculateFullGoals, estimateBasalEnergy, estimateGoalCalories, resolveCalculationSex } from '../src/utils/goalCalculations.ts';
import { clampProgress, formatRemainingCalories, safeRatio } from '../src/utils/safeNumbers.ts';
import {
  APP_STORAGE_KEY,
  loadPersistedAppData,
  sanitizeOnboardingDraft,
  sanitizeUserProfile
} from '../src/services/storagePersistence.ts';

test('legacy weekly rate migration preserves direction', () => {
  assert.equal(sanitizeUserProfile({ displayName: '', weightGoalType: 'lose', weeklyGoalRateKg: 0.5 }).weeklyGoalRateKg, -0.5);
  assert.equal(sanitizeUserProfile({ displayName: '', weightGoalType: 'maintain', weeklyGoalRateKg: 0.5 }).weeklyGoalRateKg, 0);
  assert.equal(sanitizeUserProfile({ displayName: '', weightGoalType: 'gain', weeklyGoalRateKg: 0.5 }).weeklyGoalRateKg, 0.5);
  assert.equal(sanitizeUserProfile({ displayName: '', weeklyGoalRateKg: 0.5 }).weeklyGoalRateKg, null);
});

test('Mifflin estimate refuses missing calculation profile', () => {
  assert.equal(resolveCalculationSex('prefer_not_to_say'), null);
  assert.equal(estimateBasalEnergy(70, 175, 30, null), null);
});

test('full goal calculation returns finite values with complete inputs', () => {
  const result = calculateFullGoals({ weightKg: 70, heightCm: 175, ageYears: 30, calculationSex: 'male', activityLevel: 'moderate', weeklyRateKg: -0.25 });
  assert.ok(result);
  assert.ok(Number.isFinite(result.rawEstimatedCalories));
  assert.ok(result.reviewedSuggestedCalories > 0);
});

test('goal calculation preserves raw invalid estimate separately from review value', () => {
  const result = estimateGoalCalories(300, -0.75);
  assert.ok(result.raw <= 0);
  assert.equal(result.reviewed, 800);
  assert.equal(result.needsReview, true);
});

test('safe number presentation handles over-target and invalid ratios', () => {
  assert.deepEqual(formatRemainingCalories(-200), { value: 200, text: '200 kcal over', isOver: true });
  assert.equal(safeRatio(10, 0), 0);
  assert.equal(clampProgress(Number.POSITIVE_INFINITY), 0);
  assert.equal(clampProgress(140), 100);
});

test('corrupt onboarding draft fields are removed, not converted to zero', () => {
  const draft = sanitizeOnboardingDraft({ weightDirection: 99, heightCm: -170, currentWeightKg: Number.NaN, activityLevel: 'unknown' });
  assert.equal(draft.weightDirection, null);
  assert.equal(draft.heightCm, null);
  assert.equal(draft.currentWeightKg, null);
  assert.equal(draft.activityLevel, null);
});

test('age calculation rejects future dates', () => {
  assert.equal(calculateAge('2999-01-01'), null);
});

test('an explicitly empty diary stays empty and daily values remain separated by date', () => {
  const previousLocalStorage = globalThis.localStorage;
  const values = new Map<string, string>();
  values.set(APP_STORAGE_KEY, JSON.stringify({
    schemaVersion: 4,
    meals: [],
    waterByDate: { '2026-09-10': 4, '2026-09-11': 2 },
    burnedByDate: { '2026-09-10': 180 },
    customFoods: [],
    recentFoods: []
  }));

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    }
  });

  try {
    const loaded = loadPersistedAppData([]);
    assert.deepEqual(loaded.meals, []);
    assert.deepEqual(loaded.waterByDate, { '2026-09-10': 4, '2026-09-11': 2 });
    assert.deepEqual(loaded.burnedByDate, { '2026-09-10': 180 });
    assert.equal(loaded.waterByDate?.['2026-09-12'] ?? 0, 0);
    assert.equal(loaded.burnedByDate?.['2026-09-12'] ?? 0, 0);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage
    });
  }
});

test('legacy sample meals are removed during migration', () => {
  const previousLocalStorage = globalThis.localStorage;
  const values = new Map<string, string>();
  values.set(APP_STORAGE_KEY, JSON.stringify({
    schemaVersion: 4,
    meals: [{
      id: 'meal-today-1',
      date: '2026-09-12',
      name: 'Sample meal',
      calories: 420,
      mealType: 'breakfast'
    }],
    customFoods: [],
    recentFoods: []
  }));

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    }
  });

  try {
    assert.deepEqual(loadPersistedAppData([]).meals, []);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: previousLocalStorage
    });
  }
});
