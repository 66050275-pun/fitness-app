import { privateStorage } from './privateStorage.ts';
/**
 * Storage Persistence & Data Migration Service
 * 
 * Rules:
 * 1. Schema versioning in privateStorage ('nutriai_app_data_v2').
 * 2. Automatic migration of legacy MealItems without portion to legacy '1 serving'.
 * 3. Migration of legacy calories/macros into nutritionSnapshot while preserving micronutrients.
 * 4. Item-by-item sanitization so partial corruption never wipes the entire database.
 * 5. Strict safety against exceptions and JSON parsing failures.
 * 6. Schema v4: OnboardingState, OnboardingDraft, signed weeklyGoalRateKg, profileSetupCompleted.
 */

import type { 
  PersistedAppData, 
  MealItem, 
  FoodDefinition, 
  RecentFoodEntry, 
  LoggedFoodPortion, 
  NutritionValues,
  CalorieValueSource,
  UserProfile,
  UserPreferences,
  WeightEntry,
  EatingSchedule,
  NutritionGoals,
  WorkoutHistoryEntry,
  OnboardingState,
  OnboardingDraft,
  WeeklyWeightRate,
  WeeklyProgramTemplate,
  ScheduledWorkout,
  PlannedWorkoutType,
  WeekdayNumber
} from '../types/index.ts';

export const APP_STORAGE_KEY = 'nutriai_app_data_v2';
export const LEGACY_MEALS_KEY = 'nutriai_meals';
export const CURRENT_SCHEMA_VERSION = 5;

const DEMO_MEAL_IDS = new Set([
  'meal-today-1',
  'meal-today-2',
  'meal-yest-1',
  'meal-yest-2'
]);

function sanitizeDailyNumberMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const result: Record<string, number> = {};
  for (const [dateKey, value] of Object.entries(raw)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey) && typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      result[dateKey] = value;
    }
  }
  return result;
}

/**
 * Migrates a legacy meal item into the portion-aware MealItem format.
 */
export function migrateLegacyMealItem(raw: any): MealItem | null {
  if (!raw || typeof raw !== 'object') return null;

  try {
    const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : `meal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const date = typeof raw.date === 'string' ? raw.date : new Date().toISOString().split('T')[0];
    const time = typeof raw.time === 'string' ? raw.time : '12:00';
    const mealType = ['breakfast', 'lunch', 'dinner', 'snack'].includes(raw.mealType) ? raw.mealType : 'lunch';
    const foodName = typeof raw.name === 'string' && raw.name.trim() 
      ? raw.name 
      : (typeof raw.foodName === 'string' ? raw.foodName : 'Logged Food');

    const calNum = typeof raw.calories === 'number' && !isNaN(raw.calories) ? Math.max(0, Math.round(raw.calories)) : null;
    const proNum = typeof raw.protein === 'number' && !isNaN(raw.protein) ? Math.max(0, Math.round(raw.protein * 10) / 10) : null;
    const carbNum = typeof raw.carbs === 'number' && !isNaN(raw.carbs) ? Math.max(0, Math.round(raw.carbs * 10) / 10) : null;
    const fatNum = typeof raw.fat === 'number' && !isNaN(raw.fat) ? Math.max(0, Math.round(raw.fat * 10) / 10) : null;

    // Existing portion or legacy fallback
    let portion: LoggedFoodPortion;
    if (raw.portion && typeof raw.portion === 'object' && raw.portion.unit) {
      portion = {
        foodId: raw.portion.foodId || raw.foodId || id,
        quantity: typeof raw.portion.quantity === 'number' && raw.portion.quantity > 0 ? raw.portion.quantity : 1,
        unit: raw.portion.unit,
        baseAmount: typeof raw.portion.baseAmount === 'number' ? raw.portion.baseAmount : 1,
        baseUnit: raw.portion.baseUnit || 'serving',
        servingDescription: typeof raw.portion.servingDescription === 'string' ? raw.portion.servingDescription : '1 serving'
      };
    } else {
      portion = {
        foodId: raw.foodId || id,
        quantity: 1,
        unit: 'serving',
        baseAmount: 1,
        baseUnit: 'serving',
        servingDescription: typeof raw.category === 'string' && raw.category ? raw.category : '1 serving'
      };
    }

    // Existing nutritionSnapshot or legacy copy
    let nutritionSnapshot: NutritionValues;
    if (raw.nutritionSnapshot && typeof raw.nutritionSnapshot === 'object') {
      nutritionSnapshot = {
        calories: typeof raw.nutritionSnapshot.calories === 'number' ? raw.nutritionSnapshot.calories : calNum,
        protein: typeof raw.nutritionSnapshot.protein === 'number' ? raw.nutritionSnapshot.protein : proNum,
        carbs: typeof raw.nutritionSnapshot.carbs === 'number' ? raw.nutritionSnapshot.carbs : carbNum,
        fat: typeof raw.nutritionSnapshot.fat === 'number' ? raw.nutritionSnapshot.fat : fatNum,
        fiber: typeof raw.nutritionSnapshot.fiber === 'number' ? raw.nutritionSnapshot.fiber : null,
        sugar: typeof raw.nutritionSnapshot.sugar === 'number' ? raw.nutritionSnapshot.sugar : null,
        sodium: typeof raw.nutritionSnapshot.sodium === 'number' ? raw.nutritionSnapshot.sodium : null,
        micronutrients: raw.nutritionSnapshot.micronutrients || raw.micronutrients || undefined
      };
    } else {
      nutritionSnapshot = {
        calories: calNum,
        protein: proNum,
        carbs: carbNum,
        fat: fatNum,
        fiber: null,
        sugar: null,
        sodium: null,
        micronutrients: raw.micronutrients || undefined
      };
    }

    return {
      id,
      date,
      time,
      mealType,
      foodId: raw.foodId || portion.foodId,
      foodName,
      portion,
      nutritionSnapshot,
      foodSource: raw.foodSource || (raw.foodId ? 'built_in' : 'quick_log'),
      loggedAt: typeof raw.loggedAt === 'string' ? raw.loggedAt : new Date().toISOString(),

      // Backward-compatible properties
      name: foodName,
      category: typeof raw.category === 'string' ? raw.category : portion.servingDescription,
      calories: calNum !== null ? calNum : (nutritionSnapshot.calories || 0),
      protein: proNum !== null ? proNum : (nutritionSnapshot.protein || 0),
      carbs: carbNum !== null ? carbNum : (nutritionSnapshot.carbs || 0),
      fat: fatNum !== null ? fatNum : (nutritionSnapshot.fat || 0),
      icon: typeof raw.icon === 'string' ? raw.icon : 'restaurant',
      confidence: typeof raw.confidence === 'number' ? raw.confidence : undefined,
      ingredients: Array.isArray(raw.ingredients) ? raw.ingredients.filter((i: any) => typeof i === 'string') : [],
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
      micronutrients: nutritionSnapshot.micronutrients
    };
  } catch {
    console.warn('Invalid meal record was skipped.');
    return null;
  }
}

/**
 * Validates a FoodDefinition item from storage.
 */
export function sanitizeCustomFood(raw: any): FoodDefinition | null {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.name) return null;
  try {
    const validSources: CalorieValueSource[] = ['manual', 'calculated_from_macros', 'nutrition_label', 'database', 'ai_estimate', 'demo'];
    const rawCalorieSource = raw.calorieSource || raw.nutrition?.calorieSource;
    const calorieSource: CalorieValueSource = validSources.includes(rawCalorieSource) ? rawCalorieSource : 'manual';

    const nonNegativeOrNull = (value: unknown): number | null => typeof value === 'number' && isFinite(value) && value >= 0 ? value : null;
    return {
      id: String(raw.id),
      name: String(raw.name),
      brand: raw.brand ? String(raw.brand) : undefined,
      category: raw.category ? String(raw.category) : 'Custom Food',
      barcode: raw.barcode ? String(raw.barcode).trim() : undefined,
      source: 'custom',
      calorieSource,
      nutritionBasis: {
        amount: typeof raw.nutritionBasis?.amount === 'number' && raw.nutritionBasis.amount > 0 ? raw.nutritionBasis.amount : 100,
        unit: ['g', 'ml', 'serving'].includes(raw.nutritionBasis?.unit) ? raw.nutritionBasis.unit : 'g',
        servingDescription: raw.nutritionBasis?.servingDescription ? String(raw.nutritionBasis.servingDescription) : undefined
      },
      nutrition: {
        calories: nonNegativeOrNull(raw.nutrition?.calories),
        protein: nonNegativeOrNull(raw.nutrition?.protein),
        carbs: nonNegativeOrNull(raw.nutrition?.carbs),
        fat: nonNegativeOrNull(raw.nutrition?.fat),
        fiber: nonNegativeOrNull(raw.nutrition?.fiber),
        sugar: nonNegativeOrNull(raw.nutrition?.sugar),
        sodium: nonNegativeOrNull(raw.nutrition?.sodium),
        micronutrients: raw.nutrition?.micronutrients || undefined,
        calorieSource
      },
      portionOptions: Array.isArray(raw.portionOptions) 
        ? raw.portionOptions.filter((opt: any) => opt && opt.id && opt.unit && opt.quantity > 0)
        : [],
      densityGramsPerMl: typeof raw.densityGramsPerMl === 'number' && raw.densityGramsPerMl > 0 ? raw.densityGramsPerMl : null,
      icon: raw.icon ? String(raw.icon) : 'restaurant',
      createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
      updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

/**
 * Validates a RecentFoodEntry item from storage.
 */
export function sanitizeRecentFood(raw: any): RecentFoodEntry | null {
  if (!raw || typeof raw !== 'object' || !raw.foodId || !raw.lastPortion) return null;
  try {
    if (typeof raw.lastPortion.quantity !== 'number' || !isFinite(raw.lastPortion.quantity) || raw.lastPortion.quantity <= 0) return null;
    if (typeof raw.lastPortion.baseAmount !== 'number' || !isFinite(raw.lastPortion.baseAmount) || raw.lastPortion.baseAmount <= 0) return null;
    return {
      foodId: String(raw.foodId),
      lastUsedAt: typeof raw.lastUsedAt === 'string' ? raw.lastUsedAt : new Date().toISOString(),
      useCount: typeof raw.useCount === 'number' && raw.useCount > 0 ? raw.useCount : 1,
      lastPortion: {
        foodId: String(raw.foodId),
        quantity: raw.lastPortion.quantity,
        unit: raw.lastPortion.unit,
        baseAmount: raw.lastPortion.baseAmount,
        baseUnit: raw.lastPortion.baseUnit || 'serving',
        servingDescription: raw.lastPortion.servingDescription || '1 serving'
      },
      lastMealType: ['breakfast', 'lunch', 'dinner', 'snack'].includes(raw.lastMealType) ? raw.lastMealType : 'lunch'
    };
  } catch {
    return null;
  }
}

/**
 * Loads all persisted app data, performing migrations and item sanitization.
 */
/**
 * Sanitizes UserProfile data from storage.
 * v4 migration: converts legacy unsigned weeklyGoalRateKg to signed based on weightGoalType.
 */
export function sanitizeUserProfile(raw: any): UserProfile {
  if (!raw || typeof raw !== 'object') {
    return { displayName: '' };
  }
  const validSexes = ['female', 'male', 'other', 'prefer_not_to_say', null];
  const validGoals = ['lose', 'maintain', 'gain', null];
  const validActivities = ['sedentary', 'light', 'moderate', 'very_active', 'athlete', null];

  const weightGoalType = validGoals.includes(raw.weightGoalType) ? raw.weightGoalType : null;

  // --- weeklyGoalRateKg migration (v3→v4) ---
  // Legacy: stored as positive magnitude (e.g., 0.5 for both lose and gain)
  // v4: stored as signed (negative for lose, positive for gain, 0 for maintain)
  let weeklyGoalRateKg: number | null = null;
  if (typeof raw.weeklyGoalRateKg === 'number' && isFinite(raw.weeklyGoalRateKg) && !isNaN(raw.weeklyGoalRateKg)) {
    const absRate = Math.abs(raw.weeklyGoalRateKg);
    // Snap to nearest valid discrete rate
    const validRates: WeeklyWeightRate[] = [-0.75, -0.50, -0.25, 0, 0.25, 0.50, 0.75];
    
    if (weightGoalType === 'lose') {
      // Legacy positive rate for lose → make negative
      const targetRate = -absRate;
      const closest = validRates.reduce((a, b) => Math.abs(b - targetRate) < Math.abs(a - targetRate) ? b : a);
      weeklyGoalRateKg = closest;
    } else if (weightGoalType === 'gain') {
      // Legacy positive rate for gain → keep positive
      const closest = validRates.reduce((a, b) => Math.abs(b - absRate) < Math.abs(a - absRate) ? b : a);
      weeklyGoalRateKg = closest;
    } else if (weightGoalType === 'maintain') {
      weeklyGoalRateKg = 0;
    } else {
      // Direction unavailable or ambiguous → keep null, request review
      weeklyGoalRateKg = null;
    }
  }

  return {
    displayName: typeof raw.displayName === 'string' ? raw.displayName.trim() : '',
    dateOfBirth: typeof raw.dateOfBirth === 'string' && raw.dateOfBirth.trim() ? raw.dateOfBirth : null,
    biologicalSex: validSexes.includes(raw.biologicalSex) ? raw.biologicalSex : null,
    heightCm: typeof raw.heightCm === 'number' && raw.heightCm > 0 ? Math.round(raw.heightCm) : null,
    currentWeightKg: typeof raw.currentWeightKg === 'number' && raw.currentWeightKg > 0 ? Math.round(raw.currentWeightKg * 10) / 10 : null,
    weightGoalType,
    targetWeightKg: typeof raw.targetWeightKg === 'number' && raw.targetWeightKg > 0 ? Math.round(raw.targetWeightKg * 10) / 10 : null,
    targetDate: typeof raw.targetDate === 'string' && raw.targetDate.trim() ? raw.targetDate : null,
    weeklyGoalRateKg,
    activityLevel: validActivities.includes(raw.activityLevel) ? raw.activityLevel : null,
    profileSetupCompleted: typeof raw.profileSetupCompleted === 'boolean' ? raw.profileSetupCompleted : false
  };
}

/**
 * Sanitizes UserPreferences from storage.
 */
export function sanitizeUserPreferences(raw: any): UserPreferences {
  const defaultPrefs: UserPreferences = {
    theme: 'system',
    weightUnit: 'kg',
    heightUnit: 'cm',
    preferredMassUnit: 'g',
    preferredVolumeUnit: 'ml',
    weekStart: 'monday',
    language: 'en',
    reduceMotion: false,
    hapticFeedback: true,
    marketingConsent: false,
    marketingConsentUpdatedAt: null
  };

  if (!raw || typeof raw !== 'object') return defaultPrefs;

  return {
    theme: ['system', 'light', 'dark'].includes(raw.theme) ? raw.theme : 'system',
    weightUnit: ['kg', 'lb'].includes(raw.weightUnit) ? raw.weightUnit : 'kg',
    heightUnit: ['cm', 'ft_in'].includes(raw.heightUnit) ? raw.heightUnit : 'cm',
    preferredMassUnit: ['g', 'oz'].includes(raw.preferredMassUnit) ? raw.preferredMassUnit : 'g',
    preferredVolumeUnit: ['ml', 'cup'].includes(raw.preferredVolumeUnit) ? raw.preferredVolumeUnit : 'ml',
    weekStart: ['monday', 'sunday'].includes(raw.weekStart) ? raw.weekStart : 'monday',
    language: typeof raw.language === 'string' ? raw.language : 'en',
    reduceMotion: typeof raw.reduceMotion === 'boolean' ? raw.reduceMotion : false,
    hapticFeedback: typeof raw.hapticFeedback === 'boolean' ? raw.hapticFeedback : true,
    marketingConsent: typeof raw.marketingConsent === 'boolean' ? raw.marketingConsent : false,
    marketingConsentUpdatedAt: typeof raw.marketingConsentUpdatedAt === 'string' ? raw.marketingConsentUpdatedAt : null
  };
}

/**
 * Sanitizes a single WeightEntry item from storage.
 */
export function sanitizeWeightEntry(raw: any): WeightEntry | null {
  if (!raw || typeof raw !== 'object' || typeof raw.weightKg !== 'number' || isNaN(raw.weightKg) || raw.weightKg <= 0) {
    return null;
  }
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `weight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const date = typeof raw.date === 'string' ? raw.date : new Date().toISOString().split('T')[0];
  const time = typeof raw.time === 'string' ? raw.time : '08:00';
  const recordedAt = typeof raw.recordedAt === 'string' ? raw.recordedAt : new Date().toISOString();
  const note = typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim() : undefined;

  return {
    id,
    weightKg: Math.round(raw.weightKg * 10) / 10,
    date,
    time,
    recordedAt,
    note
  };
}

/**
 * Sanitizes EatingSchedule settings from storage.
 */
export function sanitizeEatingSchedule(raw: any): EatingSchedule {
  const defaultSchedule: EatingSchedule = {
    enabled: false,
    startTime: '12:00',
    endTime: '20:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    remindersEnabled: false
  };
  if (!raw || typeof raw !== 'object') return defaultSchedule;

  return {
    enabled: typeof raw.enabled === 'boolean' ? raw.enabled : false,
    startTime: typeof raw.startTime === 'string' && raw.startTime.includes(':') ? raw.startTime : '12:00',
    endTime: typeof raw.endTime === 'string' && raw.endTime.includes(':') ? raw.endTime : '20:00',
    daysOfWeek: Array.isArray(raw.daysOfWeek) ? raw.daysOfWeek.filter((d: any) => typeof d === 'number' && d >= 1 && d <= 7) : [1, 2, 3, 4, 5, 6, 7],
    remindersEnabled: typeof raw.remindersEnabled === 'boolean' ? raw.remindersEnabled : false
  };
}

/**
 * Sanitizes NutritionGoals from storage.
 */
export function sanitizeNutritionGoals(raw: any): NutritionGoals {
  const defaultGoals: NutritionGoals = {
    calorieTarget: 2100,
    proteinTarget: 145,
    carbsTarget: 220,
    fatTarget: 70,
    waterTarget: 2000
  };
  if (!raw || typeof raw !== 'object') return defaultGoals;

  return {
    calorieTarget: typeof raw.calorieTarget === 'number' && raw.calorieTarget > 0 ? Math.round(raw.calorieTarget) : 2100,
    proteinTarget: typeof raw.proteinTarget === 'number' && raw.proteinTarget > 0 ? Math.round(raw.proteinTarget) : 145,
    carbsTarget: typeof raw.carbsTarget === 'number' && raw.carbsTarget > 0 ? Math.round(raw.carbsTarget) : 220,
    fatTarget: typeof raw.fatTarget === 'number' && raw.fatTarget > 0 ? Math.round(raw.fatTarget) : 70,
    waterTarget: typeof raw.waterTarget === 'number' && raw.waterTarget > 0 ? Math.round(raw.waterTarget) : 2000
  };
}

/**
 * Creates a default onboarding draft.
 */
export function createDefaultOnboardingDraft(prefs?: UserPreferences): OnboardingDraft {
  return {
    weightDirection: null,
    biologicalSex: null,
    heightCm: null,
    currentWeightKg: null,
    targetWeightKg: null,
    dateOfBirth: null,
    displayName: '',
    activityLevel: null,
    profileImageRef: null,
    heightUnit: prefs?.heightUnit || 'cm',
    weightUnit: prefs?.weightUnit || 'kg'
  };
}

/**
 * Sanitizes OnboardingDraft from storage.
 * Each field is individually validated; corrupt optional fields become null.
 */
export function sanitizeOnboardingDraft(raw: any, prefs?: UserPreferences): OnboardingDraft {
  const defaults = createDefaultOnboardingDraft(prefs);
  if (!raw || typeof raw !== 'object') return defaults;

  const validRates: number[] = [-0.75, -0.50, -0.25, 0, 0.25, 0.50, 0.75];
  const validSexes = ['female', 'male', 'prefer_not_to_say'];
  const validActivities = ['sedentary', 'light', 'moderate', 'very_active', 'athlete'];

  return {
    weightDirection: typeof raw.weightDirection === 'number' && validRates.includes(raw.weightDirection)
      ? raw.weightDirection as WeeklyWeightRate
      : null,
    biologicalSex: typeof raw.biologicalSex === 'string' && validSexes.includes(raw.biologicalSex)
      ? raw.biologicalSex as 'female' | 'male' | 'prefer_not_to_say'
      : null,
    heightCm: typeof raw.heightCm === 'number' && isFinite(raw.heightCm) && raw.heightCm > 0
      ? Math.round(raw.heightCm)
      : null,
    currentWeightKg: typeof raw.currentWeightKg === 'number' && isFinite(raw.currentWeightKg) && raw.currentWeightKg > 0
      ? Math.round(raw.currentWeightKg * 10) / 10
      : null,
    targetWeightKg: typeof raw.targetWeightKg === 'number' && isFinite(raw.targetWeightKg) && raw.targetWeightKg > 0
      ? Math.round(raw.targetWeightKg * 10) / 10
      : null,
    dateOfBirth: typeof raw.dateOfBirth === 'string' && raw.dateOfBirth.trim() ? raw.dateOfBirth.trim() : null,
    displayName: typeof raw.displayName === 'string' ? raw.displayName.trim() : '',
    activityLevel: typeof raw.activityLevel === 'string' && validActivities.includes(raw.activityLevel)
      ? raw.activityLevel as any
      : null,
    profileImageRef: typeof raw.profileImageRef === 'string' ? raw.profileImageRef : null,
    heightUnit: raw.heightUnit === 'ft_in' ? 'ft_in' : (prefs?.heightUnit || 'cm'),
    weightUnit: raw.weightUnit === 'lb' ? 'lb' : (prefs?.weightUnit || 'kg')
  };
}

/**
 * Sanitizes OnboardingState from storage.
 *
 * Migration logic for existing users (v3→v4):
 * - If profileSetupCompleted === true → 'completed' (user explicitly set up profile)
 * - If profileSetupCompleted is false/missing but profile has data → show review flow (not_started)
 * - Fresh install → 'not_started'
 *
 * IMPORTANT: Demo/default profile data (e.g., "Alex", placeholder values) does NOT
 * automatically qualify as 'completed'. Only the explicit profileSetupCompleted marker
 * set during onboarding or profile editing confirms real user data.
 */
export function sanitizeOnboardingState(raw: any, userProfile?: UserProfile): OnboardingState {
  if (raw && typeof raw === 'object') {
    const validStatuses = ['not_started', 'in_progress', 'completed'];
    const status = validStatuses.includes(raw.status) ? raw.status : 'not_started';
    const currentStep = typeof raw.currentStep === 'number' && raw.currentStep >= 1 && raw.currentStep <= 6
      ? Math.floor(raw.currentStep)
      : 1;
    const completedAt = typeof raw.completedAt === 'string' ? raw.completedAt : null;
    const completionId = typeof raw.completionId === 'string' ? raw.completionId : null;

    return { status, currentStep, completedAt, completionId };
  }

  // No persisted onboarding state — this is a v3→v4 migration or fresh install
  // Only skip onboarding if the user explicitly completed profile setup
  if (userProfile?.profileSetupCompleted === true) {
    return {
      status: 'completed',
      currentStep: 6,
      completedAt: null, // Unknown when they completed (before onboarding existed)
      completionId: null
    };
  }

  // All other cases (including demo data with profile fields populated): not_started
  return { status: 'not_started', currentStep: 1 };
}

/**
 * Sanitizes a WeeklyProgramTemplate from persistence.
 */
export function sanitizeWeeklyProgramTemplate(raw: unknown): WeeklyProgramTemplate | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as any;
  if (typeof t.id !== 'string' || !t.id) return null;
  const name = typeof t.name === 'string' && t.name.trim() ? t.name.trim() : 'My Weekly Routine';
  const createdAt = typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString();
  const updatedAt = typeof t.updatedAt === 'string' ? t.updatedAt : new Date().toISOString();

  const days: Partial<Record<WeekdayNumber, PlannedWorkoutType>> = {};
  if (t.days && typeof t.days === 'object') {
    for (let i = 1; i <= 7; i++) {
      const d = t.days[i];
      if (d && typeof d === 'object') {
        if (d.type === 'rest') {
          days[i as WeekdayNumber] = { type: 'rest' };
        } else if (d.type === 'preset' && typeof d.presetId === 'string' && d.presetId.trim()) {
          days[i as WeekdayNumber] = { type: 'preset', presetId: d.presetId.trim() };
        }
      }
    }
  }

  return {
    id: t.id,
    name,
    days,
    createdAt,
    updatedAt
  };
}

/**
 * Sanitizes the ScheduledWorkout map from persistence.
 */
export function sanitizeScheduledWorkoutsMap(raw: unknown): Record<string, ScheduledWorkout> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, ScheduledWorkout> = {};

  for (const [dateKey, item] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    if (!item || typeof item !== 'object') continue;

    const i = item as any;
    let workout: PlannedWorkoutType | null = null;
    if (i.workout && typeof i.workout === 'object') {
      if (i.workout.type === 'rest') {
        workout = { type: 'rest' };
      } else if (i.workout.type === 'preset' && typeof i.workout.presetId === 'string' && i.workout.presetId.trim()) {
        workout = { type: 'preset', presetId: i.workout.presetId.trim() };
      }
    }

    if (workout) {
      result[dateKey] = {
        dateKey,
        workout,
        source: i.source === 'manual_override' ? 'manual_override' : 'weekly_repeat',
        templateId: typeof i.templateId === 'string' ? i.templateId : undefined,
        notes: typeof i.notes === 'string' ? i.notes : undefined
      };
    }
  }

  return result;
}

/**
 * Loads all persisted app data, performing migrations and item sanitization.
 */
export function loadPersistedAppData(_initialDefaultMeals: MealItem[] = []): PersistedAppData {
  try {
    if (typeof privateStorage === 'undefined') {
      return {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        customFoods: [],
        recentFoods: [],
        meals: [],
        waterByDate: {},
        burnedByDate: {},
        userProfile: { displayName: '' },
        userPreferences: sanitizeUserPreferences(null),
        weightHistory: [],
        eatingSchedule: sanitizeEatingSchedule(null),
        nutritionGoals: sanitizeNutritionGoals(null),
        onboardingState: { status: 'not_started', currentStep: 1 },
        onboardingDraft: createDefaultOnboardingDraft(sanitizeUserPreferences(null))
      };
    }

    const raw = privateStorage.getItem(APP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const customFoods: FoodDefinition[] = Array.isArray(parsed.customFoods)
          ? parsed.customFoods.map(sanitizeCustomFood).filter((f: any): f is FoodDefinition => f !== null)
          : [];

        const recentFoods: RecentFoodEntry[] = Array.isArray(parsed.recentFoods)
          ? parsed.recentFoods.map(sanitizeRecentFood).filter((r: any): r is RecentFoodEntry => r !== null)
          : [];

        const meals: MealItem[] = Array.isArray(parsed.meals)
          ? parsed.meals
              .map(migrateLegacyMealItem)
              .filter((m: any): m is MealItem => m !== null && !DEMO_MEAL_IDS.has(m.id))
          : [];

        const userProfile = sanitizeUserProfile(parsed.userProfile);
        const userPreferences = sanitizeUserPreferences(parsed.userPreferences);
        const weightHistory: WeightEntry[] = Array.isArray(parsed.weightHistory)
          ? parsed.weightHistory.map(sanitizeWeightEntry).filter((w: any): w is WeightEntry => w !== null)
          : [];
        const eatingSchedule = sanitizeEatingSchedule(parsed.eatingSchedule);
        const nutritionGoals = sanitizeNutritionGoals(parsed.nutritionGoals);

        // Migrate workout history from separate key if present
        let workoutHistory: WorkoutHistoryEntry[] | undefined = Array.isArray(parsed.workoutHistory) ? parsed.workoutHistory : undefined;
        if (!workoutHistory) {
          try {
            const rawWorkouts = privateStorage.getItem('nutriai_workout_history');
            if (rawWorkouts) {
              const parsedWorkouts = JSON.parse(rawWorkouts);
              if (Array.isArray(parsedWorkouts)) {
                workoutHistory = parsedWorkouts;
              }
            }
          } catch {}
        }

        return {
          schemaVersion: CURRENT_SCHEMA_VERSION,
          customFoods,
          recentFoods,
          meals,
          waterByDate: sanitizeDailyNumberMap(parsed.waterByDate),
          burnedByDate: sanitizeDailyNumberMap(parsed.burnedByDate),
          userProfile,
          userPreferences,
          weightHistory,
          eatingSchedule,
          nutritionGoals,
          workoutHistory,
          onboardingState: sanitizeOnboardingState(parsed.onboardingState, userProfile),
          onboardingDraft: sanitizeOnboardingDraft(parsed.onboardingDraft, userPreferences),
          weeklyFitnessTemplate: sanitizeWeeklyProgramTemplate(parsed.weeklyFitnessTemplate),
          scheduledWorkouts: sanitizeScheduledWorkoutsMap(parsed.scheduledWorkouts)
        };
      }
    }

    // Fallback: Check for legacy meals key
    const rawLegacy = privateStorage.getItem(LEGACY_MEALS_KEY);
    let legacyMeals: MealItem[] = [];
    if (rawLegacy) {
      try {
        const parsedLegacy = JSON.parse(rawLegacy);
        if (Array.isArray(parsedLegacy)) {
          legacyMeals = parsedLegacy.map(migrateLegacyMealItem).filter((m): m is MealItem => m !== null);
        }
      } catch {}
    }

    const finalMeals = legacyMeals.filter(meal => !DEMO_MEAL_IDS.has(meal.id));

    const initialData: PersistedAppData = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      customFoods: [],
      recentFoods: [],
      meals: finalMeals,
      waterByDate: {},
      burnedByDate: {},
      userProfile: { displayName: '' },
      userPreferences: sanitizeUserPreferences(null),
      weightHistory: [],
      eatingSchedule: sanitizeEatingSchedule(null),
      nutritionGoals: sanitizeNutritionGoals(null),
      onboardingState: { status: 'not_started', currentStep: 1 },
      onboardingDraft: createDefaultOnboardingDraft(sanitizeUserPreferences(null)),
      weeklyFitnessTemplate: null,
      scheduledWorkouts: {}
    };

    savePersistedAppData(initialData);
    return initialData;

  } catch {
    console.warn('App data could not be loaded.');
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      customFoods: [],
      recentFoods: [],
      meals: [],
      waterByDate: {},
      burnedByDate: {},
      userProfile: { displayName: '' },
      userPreferences: sanitizeUserPreferences(null),
      weightHistory: [],
      eatingSchedule: sanitizeEatingSchedule(null),
      nutritionGoals: sanitizeNutritionGoals(null),
      onboardingState: { status: 'not_started', currentStep: 1 },
      onboardingDraft: createDefaultOnboardingDraft(sanitizeUserPreferences(null)),
      weeklyFitnessTemplate: null,
      scheduledWorkouts: {}
    };
  }
}

/**
 * Saves persisted app data safely to privateStorage.
 */
export function savePersistedAppData(data: PersistedAppData): void {
  try {
    if (typeof privateStorage === 'undefined') return;
    privateStorage.setItem(APP_STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('Private app data could not be saved.');
  }
}

/**
 * Granularly deletes specific NutriAI data without clearing other application storage.
 */
export function deleteNutriAILocalData(target: 'meals' | 'workouts' | 'weights' | 'all'): void {
  try {
    if (typeof privateStorage === 'undefined') return;

    if (target === 'all') {
      privateStorage.removeItem(APP_STORAGE_KEY);
      privateStorage.removeItem(LEGACY_MEALS_KEY);
      privateStorage.removeItem('nutriai_workout_history');
      privateStorage.removeItem('nutriai_recent_food_searches');
      privateStorage.removeItem('nutriai_insight_range');
      privateStorage.removeItem('nutriai_dashboard_layout');
      privateStorage.removeItem('nutriai_feedback_draft');
      // Note: IndexedDB profile image deletion is handled by the caller (Store)
      return;
    }

    const raw = privateStorage.getItem(APP_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;

    if (target === 'meals') {
      parsed.meals = [];
      parsed.recentFoods = [];
      privateStorage.setItem(APP_STORAGE_KEY, JSON.stringify(parsed));
      privateStorage.removeItem(LEGACY_MEALS_KEY);
      privateStorage.removeItem('nutriai_recent_food_searches');
    } else if (target === 'workouts') {
      parsed.workoutHistory = [];
      parsed.scheduledWorkouts = {};
      parsed.weeklyFitnessTemplate = null;
      privateStorage.setItem(APP_STORAGE_KEY, JSON.stringify(parsed));
      privateStorage.removeItem('nutriai_workout_history');
    } else if (target === 'weights') {
      parsed.weightHistory = [];
      privateStorage.setItem(APP_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch {
    console.warn('Private app data could not be deleted.');
  }
}
