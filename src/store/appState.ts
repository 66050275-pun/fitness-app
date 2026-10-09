import { privateStorage } from '../services/privateStorage.ts';
import type { 
  AppState, 
  MealItem, 
  ScannedFood, 
  ChatMessage, 
  ActiveScreen, 
  WorkoutExercise, 
  WorkoutHistoryEntry,
  CompletedExercise,
  PersonalRecord,
  ExerciseHistoryOccurrence,
  FitnessSubView,
  CatalogFoodItem,
  MealType,
  ActiveNutrientModalSource,
  MicronutrientProfile,
  NutrientValue,
  MeasurementDimension,
  FoodDefinition,
  FoodUnit,
  LoggedFoodPortion,
  RecentFoodEntry, 
  NutritionValues,
  CustomFoodDraft,
  FoodPortionOption,
  UserProfile,
  UserPreferences,
  WeightEntry,
  EatingSchedule,
  NutritionGoals,
  ProfileSubpage,
  ProfileConfirmModalState,
  ThemePreference,
  WeightUnit,
  ActivityLevel,
  OnboardingDraft,
  WeeklyWeightRate,
  FitnessPlannerMode,
  WeeklyProgramTemplate,
  PlannedWorkoutType,
  WeekdayNumber
} from '../types/index.ts';
import type { DashboardWidgetId } from '../types/index.ts';
import { expandWeeklyTemplateToMonth, expandWeeklyTemplateToWeek, resetFitnessPlannerState } from '../utils/fitnessPlannerCalculations.ts';
import { FOOD_CATEGORIES } from '../data/foodCategories';
import { 
  getTodayKey, 
  formatLocalDateKey, 
  parseLocalDateKey, 
  getStartOfWeek, 
  addWeeks 
} from '../utils/dateUtils';
import { WORKOUT_PRESETS, createWorkoutExercisesFromPreset } from '../data/workoutPresets';
import { scaleMicronutrientProfile } from '../utils/nutrientCalculations';
import { LOCAL_FOOD_CATALOG } from '../data/foodCatalog';
import { BUILT_IN_FOOD_DEFINITIONS, findBuiltInFood } from '../data/foodDefinitions';
import { 
  calculatePortionMultiplier, 
  scaleNutritionForPortion, 
  formatPortionLabel,
  resolvePortionToBaseAmount 
} from '../utils/portionCalculations';
import {
  areMacrosCompleteAndValid,
  calculateCaloriesFromMacros,
  checkCalorieConsistency
} from '../utils/calorieCalculations';
import { 
  loadPersistedAppData, 
  savePersistedAppData, 
  CURRENT_SCHEMA_VERSION,
  deleteNutriAILocalData,
  sanitizeUserPreferences,
  sanitizeEatingSchedule,
  sanitizeNutritionGoals,
  createDefaultOnboardingDraft
} from '../services/storagePersistence';
import { lbToKg } from '../utils/unitConversions';
import { loadProfileImageBlob, deleteProfileImageDB } from '../utils/profileImageStorage';
import { clampNonNegative, safeFiniteNumber } from '../utils/safeNumbers';

const today = getTodayKey();
const WORKOUT_HISTORY_STORAGE_KEY = 'nutriai_workout_history';
const RECENT_SEARCHES_STORAGE_KEY = 'nutriai_recent_food_searches';
const INSIGHT_RANGE_STORAGE_KEY = 'nutriai_insight_range';
const DASHBOARD_LAYOUT_STORAGE_KEY = 'nutriai_dashboard_layout';
const DEFAULT_DASHBOARD_WIDGET_ORDER: DashboardWidgetId[] = ['energy', 'macros', 'hydration', 'coach', 'meals'];

function loadDashboardWidgetLayout(): { order: DashboardWidgetId[]; hidden: DashboardWidgetId[] } {
  try {
    const raw = privateStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const valid = new Set<DashboardWidgetId>(DEFAULT_DASHBOARD_WIDGET_ORDER);
      const savedOrder: DashboardWidgetId[] = Array.isArray(parsed.order)
        ? (parsed.order as unknown[]).filter((id: unknown): id is DashboardWidgetId => typeof id === 'string' && valid.has(id as DashboardWidgetId))
        : [];
      const order: DashboardWidgetId[] = [...new Set<DashboardWidgetId>(savedOrder)];
      for (const id of DEFAULT_DASHBOARD_WIDGET_ORDER) {
        if (!order.includes(id)) order.push(id);
      }
      const hidden: DashboardWidgetId[] = Array.isArray(parsed.hidden)
        ? [...new Set<DashboardWidgetId>((parsed.hidden as unknown[]).filter((id: unknown): id is DashboardWidgetId => typeof id === 'string' && valid.has(id as DashboardWidgetId)))]
        : [];
      return { order, hidden };
    }
  } catch {}
  return { order: [...DEFAULT_DASHBOARD_WIDGET_ORDER], hidden: [] };
}

function loadRecentFoodSearches(): string[] {
  try {
    const raw = privateStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 10);
    }
  } catch {}
  return [];
}

function loadSavedInsightRange(): 7 | 30 | 90 {
  try {
    const raw = privateStorage.getItem(INSIGHT_RANGE_STORAGE_KEY);
    if (raw === '7' || raw === '30' || raw === '90') {
      return parseInt(raw, 10) as 7 | 30 | 90;
    }
  } catch {}
  return 7;
}

function getDefaultWorkoutHistory(): WorkoutHistoryEntry[] {
  // A fresh account must not receive sample activity as real user history.
  return [];
  /*
  const d1 = new Date();
  d1.setDate(d1.getDate() - 2);
  const d1Str = d1.toISOString();

  const d2 = new Date();
  d2.setDate(d2.getDate() - 1);
  const d2Str = d2.toISOString();

  return [
    {
      id: 'history-push-yesterday',
      name: 'Push Day Hypertrophy',
      workoutType: 'Push Day',
      status: 'completed',
      startedAt: d2Str,
      finishedAt: new Date(d2.getTime() + 52 * 60 * 1000).toISOString(),
      durationSeconds: 3120, // 52 min
      completedSetCount: 17,
      totalVolume: 5120,
      estimatedCalories: 310,
      exercises: [
        {
          exerciseId: 'push-bench',
          exerciseName: 'Barbell Bench Press',
          muscleGroups: 'Chest & Triceps',
          sets: [
            { setNumber: 1, weightKg: 85, reps: 8, completed: true, restSeconds: 90 },
            { setNumber: 2, weightKg: 95, reps: 8, completed: true, restSeconds: 90 },
            { setNumber: 3, weightKg: 100, reps: 6, completed: true, restSeconds: 90 },
            { setNumber: 4, weightKg: 105, reps: 5, completed: true, restSeconds: 90, isPersonalRecord: true }
          ]
        },
        {
          exerciseId: 'push-incline',
          exerciseName: 'Incline Dumbbell Press',
          muscleGroups: 'Upper Chest',
          sets: [
            { setNumber: 1, weightKg: 28, reps: 10, completed: true, restSeconds: 75 },
            { setNumber: 2, weightKg: 30, reps: 10, completed: true, restSeconds: 75 },
            { setNumber: 3, weightKg: 32, reps: 8, completed: true, restSeconds: 75 }
          ]
        },
        {
          exerciseId: 'push-ohp',
          exerciseName: 'Overhead Press',
          muscleGroups: 'Shoulders',
          sets: [
            { setNumber: 1, weightKg: 50, reps: 8, completed: true, restSeconds: 75 },
            { setNumber: 2, weightKg: 55, reps: 8, completed: true, restSeconds: 75 },
            { setNumber: 3, weightKg: 55, reps: 7, completed: true, restSeconds: 75 }
          ]
        },
        {
          exerciseId: 'push-latraise',
          exerciseName: 'Lateral Raise',
          muscleGroups: 'Lateral Deltoids',
          sets: [
            { setNumber: 1, weightKg: 12, reps: 12, completed: true, restSeconds: 60 },
            { setNumber: 2, weightKg: 14, reps: 12, completed: true, restSeconds: 60 },
            { setNumber: 3, weightKg: 14, reps: 10, completed: true, restSeconds: 60 }
          ]
        },
        {
          exerciseId: 'push-triceps',
          exerciseName: 'Triceps Pushdown',
          muscleGroups: 'Triceps',
          sets: [
            { setNumber: 1, weightKg: 30, reps: 12, completed: true, restSeconds: 60 },
            { setNumber: 2, weightKg: 35, reps: 12, completed: true, restSeconds: 60 },
            { setNumber: 3, weightKg: 35, reps: 11, completed: true, restSeconds: 60 },
            { setNumber: 4, weightKg: 40, reps: 10, completed: true, restSeconds: 60 }
          ]
        }
      ]
    },
    {
      id: 'history-leg-baseline',
      name: 'Leg Day Strength',
      workoutType: 'Leg Day',
      status: 'completed',
      startedAt: d1Str,
      finishedAt: new Date(d1.getTime() + 55 * 60 * 1000).toISOString(),
      durationSeconds: 3300, // 55 min
      completedSetCount: 16,
      totalVolume: 6250,
      estimatedCalories: 345,
      exercises: [
        {
          exerciseId: 'leg-squat',
          exerciseName: 'Barbell Squat',
          muscleGroups: 'Quads & Glutes',
          sets: [
            { setNumber: 1, weightKg: 100, reps: 8, completed: true, restSeconds: 90 },
            { setNumber: 2, weightKg: 115, reps: 8, completed: true, restSeconds: 90 },
            { setNumber: 3, weightKg: 120, reps: 6, completed: true, restSeconds: 90 },
            { setNumber: 4, weightKg: 125, reps: 5, completed: true, restSeconds: 90, isPersonalRecord: true }
          ]
        },
        {
          exerciseId: 'leg-rdl',
          exerciseName: 'Romanian Deadlift',
          muscleGroups: 'Hamstrings & Glutes',
          sets: [
            { setNumber: 1, weightKg: 90, reps: 10, completed: true, restSeconds: 90 },
            { setNumber: 2, weightKg: 100, reps: 10, completed: true, restSeconds: 90 },
            { setNumber: 3, weightKg: 100, reps: 8, completed: true, restSeconds: 90 }
          ]
        },
        {
          exerciseId: 'leg-press',
          exerciseName: 'Leg Press',
          muscleGroups: 'Quads',
          sets: [
            { setNumber: 1, weightKg: 180, reps: 12, completed: true, restSeconds: 75 },
            { setNumber: 2, weightKg: 200, reps: 12, completed: true, restSeconds: 75 },
            { setNumber: 3, weightKg: 220, reps: 10, completed: true, restSeconds: 75 }
          ]
        },
        {
          exerciseId: 'leg-curl',
          exerciseName: 'Leg Curl',
          muscleGroups: 'Hamstrings',
          sets: [
            { setNumber: 1, weightKg: 45, reps: 12, completed: true, restSeconds: 60 },
            { setNumber: 2, weightKg: 50, reps: 12, completed: true, restSeconds: 60 },
            { setNumber: 3, weightKg: 50, reps: 10, completed: true, restSeconds: 60 }
          ]
        },
        {
          exerciseId: 'leg-calf',
          exerciseName: 'Standing Calf Raise',
          muscleGroups: 'Calves',
          sets: [
            { setNumber: 1, weightKg: 60, reps: 15, completed: true, restSeconds: 45 },
            { setNumber: 2, weightKg: 70, reps: 15, completed: true, restSeconds: 45 },
            { setNumber: 3, weightKg: 70, reps: 14, completed: true, restSeconds: 45 }
          ]
        }
      ]
    }
  ];
  */
}

function loadSavedWorkoutHistory(): WorkoutHistoryEntry[] {
  try {
    const raw = privateStorage.getItem(WORKOUT_HISTORY_STORAGE_KEY);
  if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Migrate or clean up entries
      return parsed.filter((entry: any) => !['history-push-yesterday', 'history-leg-baseline'].includes(entry?.id)).map((entry: any) => {
        const completedCount = entry.completedSetCount ?? (entry.totalSetsCompleted || 0);
        const volume = clampNonNegative(safeFiniteNumber(entry.totalVolume ?? entry.totalVolumeKg));
        const dur = clampNonNegative(safeFiniteNumber(entry.durationSeconds));
        const status = entry.status || (completedCount > 0 ? 'completed' : 'incomplete');
        
        return {
          id: entry.id || `workout-${Date.now()}`,
          name: entry.name || entry.title || 'Workout Session',
          workoutType: entry.workoutType || 'Strength',
          status,
          startedAt: entry.startedAt || new Date().toISOString(),
          finishedAt: entry.finishedAt || entry.startedAt || new Date().toISOString(),
          durationSeconds: dur,
          exercises: Array.isArray(entry.exercises) ? entry.exercises : (entry.exerciseLogs || []).map((l: any, idx: number) => ({
            exerciseId: `ex-${idx}`,
            exerciseName: l.name || 'Exercise',
            muscleGroups: l.muscleGroup || 'Full Body',
            sets: Array.isArray(l.sets) ? l.sets.map((s: any) => ({
              setNumber: s.setNumber || 1,
              weightKg: clampNonNegative(safeFiniteNumber(s.weightKg)),
              reps: Math.floor(clampNonNegative(safeFiniteNumber(s.actualReps ?? s.reps))),
              completed: !!s.completed,
              restSeconds: s.restSeconds || 60,
              isPersonalRecord: !!s.isPersonalRecord
            })) : []
          })),
          completedSetCount: completedCount,
          totalVolume: volume,
          estimatedCalories: completedCount > 0 && volume > 0 ? (entry.estimatedCalories ?? Math.round((dur / 60) * 5.5 + volume * 0.02)) : null
        };
      });
    }
    return getDefaultWorkoutHistory();
  } catch {
  return [];
}
}

const INITIAL_MEALS: MealItem[] = [];

const INITIAL_CHAT: ChatMessage[] = [];

export function createEmptyCustomFoodDraft(): CustomFoodDraft {
  return {
    name: '',
    brand: '',
    category: '',
    barcode: '',
    basisType: 'per_100g',
    basisAmount: 100,
    basisUnit: 'g',
    servingDescription: '',
    servingQuantity: 1,
    servingUnit: 'serving',
    servingEquivalentAmount: null,
    servingEquivalentUnit: 'g',
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    fiber: null,
    sugar: null,
    sodium: null,
    calorieSource: 'manual',
    caloriesSyncedWithMacros: false,
    calorieWarningAcknowledged: false,
    vitaminC: null,
    vitaminD: null,
    calcium: null,
    iron: null,
    potassium: null,
    magnesium: null,
    isMicronutrientsExpanded: false,
    portionOptions: []
  };
}

export function getUnitDimension(unit: FoodUnit): MeasurementDimension {
  if (unit === 'g' || unit === 'kg' || unit === 'oz' || unit === 'lb') return 'mass';
  if (unit === 'ml' || unit === 'l') return 'volume';
  if (unit === 'serving') return 'serving';
  return 'count';
}

export function foodDefinitionToDraft(food: FoodDefinition): CustomFoodDraft {
  const isPerServing = food.nutritionBasis.unit === 'serving';
  const isPer100ml = food.nutritionBasis.unit === 'ml';
  const basisType = isPerServing ? 'per_serving' : (isPer100ml ? 'per_100ml' : 'per_100g');

  const matchedCat = FOOD_CATEGORIES.find(
    c => c.value === food.category || c.label.toLowerCase() === (food.category || '').toLowerCase()
  );
  const categoryKey = matchedCat ? matchedCat.value : (food.category || 'other');

  const micros = food.nutrition.micronutrients;
  const findNutrientAmount = (key: string): number | null => {
    if (!micros) return null;
    const all = [...(micros.vitamins || []), ...(micros.minerals || []), ...(micros.otherNutrients || [])];
    const found = all.find(n => n.key === key);
    return found && found.amount !== null && found.amount !== undefined ? found.amount : null;
  };

  const vitaminC = findNutrientAmount('vitamin_c');
  const vitaminD = findNutrientAmount('vitamin_d');
  const calcium = findNutrientAmount('calcium');
  const iron = findNutrientAmount('iron');
  const potassium = findNutrientAmount('potassium');
  const magnesium = findNutrientAmount('magnesium');

  const hasMicros = [vitaminC, vitaminD, calcium, iron, potassium, magnesium].some(v => v !== null);
  const rawCalorieSource = food.calorieSource || food.nutrition.calorieSource;
  const calorieSource = rawCalorieSource || 'manual';

  return {
    name: food.name || '',
    brand: food.brand || '',
    category: categoryKey,
    barcode: food.barcode || '',
    basisType,
    basisAmount: food.nutritionBasis.amount || (isPerServing ? 1 : 100),
    basisUnit: food.nutritionBasis.unit || 'g',
    servingDescription: food.nutritionBasis.servingDescription || '',
    servingQuantity: isPerServing ? (food.nutritionBasis.amount || 1) : 1,
    servingUnit: 'serving',
    servingEquivalentAmount: null,
    servingEquivalentUnit: 'g',
    calories: food.nutrition.calories ?? null,
    protein: food.nutrition.protein ?? null,
    carbs: food.nutrition.carbs ?? null,
    fat: food.nutrition.fat ?? null,
    fiber: food.nutrition.fiber ?? null,
    sugar: food.nutrition.sugar ?? null,
    sodium: food.nutrition.sodium ?? null,
    calorieSource,
    caloriesSyncedWithMacros: calorieSource === 'calculated_from_macros',
    calorieWarningAcknowledged: false,
    vitaminC,
    vitaminD,
    calcium,
    iron,
    potassium,
    magnesium,
    isMicronutrientsExpanded: hasMicros,
    portionOptions: food.portionOptions ? JSON.parse(JSON.stringify(food.portionOptions)) : []
  };
}

class Store {
  private state: AppState;
  private disposed = false;
  private lastDeviceDateKey = getTodayKey();
  private listeners: Set<() => void> = new Set();
  private workoutTimerInterval: ReturnType<typeof setInterval> | null = null;
  private restTimerInterval: ReturnType<typeof setInterval> | null = null;

  dispose() { this.disposed = true; this.listeners.clear(); this.stopWorkoutTimers(); this.setProfileImageUrl(null); this.state = null!; }

  constructor() {
    const persisted = loadPersistedAppData(INITIAL_MEALS);
    const dashboardLayout = loadDashboardWidgetLayout();

    this.state = {
      currentScreen: 'dashboard',
      theme: 'light',
      streakDays: 0,
      selectedDate: today,
      waterTarget: 8,
      calorieTarget: 2100,
      waterByDate: persisted.waterByDate || {},
      burnedByDate: persisted.burnedByDate || {},
      meals: persisted.meals,
      chatHistory: INITIAL_CHAT,
      lastScannedFood: null,
      quickActionOpen: false,
      quickAddOpen: false,
      dashboardWidgetOrder: dashboardLayout.order,
      hiddenDashboardWidgets: dashboardLayout.hidden,
      dashboardWidgetDrawerOpen: false,
      scannerMode: 'food',

      // Fitness State
      fitnessSubView: 'home',
      fitnessPlannerMode: (persisted.weeklyFitnessTemplate || (persisted.scheduledWorkouts && Object.keys(persisted.scheduledWorkouts).length > 0)) ? 'program' : 'workouts',
      weeklyFitnessTemplate: persisted.weeklyFitnessTemplate || null,
      scheduledWorkouts: persisted.scheduledWorkouts || {},
      plannerCalendarYear: new Date().getFullYear(),
      plannerCalendarMonth: new Date().getMonth() + 1,
      selectedPlannerDate: null,
      plannerDetailModalOpen: false,
      plannerWeeklyEditorOpen: false,
      plannerConfirmOverwriteMonth: null,
      plannerToastMessage: null,
      selectedPresetId: null,
      draftWorkout: null,
      activeWorkout: null,
      lastWorkoutSummary: null,
      workoutHistory: loadSavedWorkoutHistory(),

      // Detail navigation state
      selectedWorkoutHistoryId: null,
      selectedPersonalRecordExerciseId: null,
      deleteConfirmationWorkoutId: null,

      // Insights & Search State
      selectedInsightRange: loadSavedInsightRange(),
      selectedInsightTab: 'calories',
      recentFoodSearches: loadRecentFoodSearches(),
      selectedFoodForSearch: null,
      foodSearchServingMultiplier: 1,
      foodSearchMealType: 'lunch',

      // Micronutrients & Modals State
      selectedMealDetailId: null,
      activeNutrientModalSource: null,
      nutrientModalCategoryFilter: 'all',
      selectedInsightNutrientCategory: 'all',

      // Custom Foods, Recent Foods & Portion Management
      customFoods: persisted.customFoods,
      recentFoods: persisted.recentFoods,
      foodSearchTab: 'recent',
      isSetPortionOpen: false,
      activePortionFood: null,
      activePortionQuantity: 100,
      activePortionUnit: 'g',
      activePortionMealType: 'lunch',
      activePortionDate: today,
      activePortionTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isCustomFoodModalOpen: false,
      editingCustomFoodId: null,

      // Custom Food 4-Step Wizard State
      customFoodStep: 1,
      customFoodDraft: createEmptyCustomFoodDraft(),
      customFoodValidationErrors: {},
      customFoodDraftDirty: false,
      customFoodShowDiscardConfirm: false,
      customFoodDuplicateWarning: null,
      customFoodIsSaving: false,

      // Diary Date & Calendar Navigation State
      diaryCalendarOpen: false,
      diaryCalendarDraftDate: today,
      visibleDiaryWeekStart: formatLocalDateKey(getStartOfWeek(parseLocalDateKey(today), 1)),
      calendarViewYear: new Date().getFullYear(),
      calendarViewMonth: new Date().getMonth() + 1,
      calendarPickerMode: 'days',

      // Profile & Settings State
      profileSubpage: null,
      userProfile: persisted.userProfile || { displayName: '' },
      userPreferences: persisted.userPreferences || sanitizeUserPreferences(null),
      weightHistory: persisted.weightHistory || [],
      eatingSchedule: persisted.eatingSchedule || sanitizeEatingSchedule(null),
      nutritionGoals: persisted.nutritionGoals || sanitizeNutritionGoals(null),
      profileConfirmModal: null,
      weightModalOpen: false,
      editingWeightEntry: null,

      // Onboarding State
      onboardingState: persisted.onboardingState || { status: 'not_started' as const, currentStep: 1 },
      onboardingDraft: persisted.onboardingDraft || createDefaultOnboardingDraft(persisted.userPreferences),
      profileImageUrl: null
    };

    // Route to onboarding if not completed
    if (this.state.onboardingState.status !== 'completed') {
      this.state.currentScreen = 'onboarding';
    }

    // Synchronize calorie & water targets from nutrition goals
    if (this.state.nutritionGoals) {
      this.state.calorieTarget = this.state.nutritionGoals.calorieTarget;
      this.state.waterTarget = Math.round(this.state.nutritionGoals.waterTarget / 250);
    }

    // Apply persisted theme preference
    this.applyThemePreference();

    // Calculate and annotate PR flags on loaded history
    this.calculatePersonalRecords();

    // Load profile image from IndexedDB (async — sets state when ready)
    this.loadProfileImageAsync();
  }

  public getState(): AppState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    if (this.disposed) return;
    this.listeners.forEach(cb => cb());
  }

  public setScreen(screen: ActiveScreen) {
    this.state.currentScreen = screen;
    this.state.quickActionOpen = false;
    this.state.quickAddOpen = false;
    this.state.selectedMealDetailId = null;
    this.state.activeNutrientModalSource = null;
    this.state.isSetPortionOpen = false;
    this.state.isCustomFoodModalOpen = false;
    this.state.customFoodShowDiscardConfirm = false;
    this.notify();
  }

  public toggleTheme() {
    const next = this.state.theme === 'light' ? 'dark' : 'light';
    this.setThemePreference(next);
  }

  public setThemePreference(pref: ThemePreference) {
    this.state.userPreferences.theme = pref;
    this.applyThemePreference(pref);
    this.persistState();
    this.notify();
  }

  public applyThemePreference(pref?: ThemePreference) {
    const p = pref || this.state.userPreferences?.theme || 'system';
    let isDark = false;
    if (p === 'dark') {
      isDark = true;
    } else if (p === 'light') {
      isDark = false;
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.state.theme = isDark ? 'dark' : 'light';
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  }

  // --- Profile & Subpage Navigation ---
  public setProfileSubpage(subpage: ProfileSubpage | null) {
    this.state.profileSubpage = subpage;
    this.notify();
  }

  public goBackFromProfileSubpage() {
    this.state.profileSubpage = null;
    this.notify();
  }

  public updateUserProfile(profile: Partial<UserProfile>) {
    this.state.userProfile = {
      ...this.state.userProfile,
      ...profile,
      profileSetupCompleted: true
    };
    if (typeof this.state.userProfile.heightCm === 'number') {
      const height = safeFiniteNumber(this.state.userProfile.heightCm, -1);
      this.state.userProfile.heightCm = height > 0 ? Math.round(height) : null;
    }
    if (typeof this.state.userProfile.currentWeightKg === 'number') {
      const weight = safeFiniteNumber(this.state.userProfile.currentWeightKg, -1);
      this.state.userProfile.currentWeightKg = weight > 0 ? Math.round(weight * 10) / 10 : null;
    }
    this.persistState();
    this.notify();
  }

  public updateWeightGoal(goal: Partial<UserProfile>) {
    this.state.userProfile = {
      ...this.state.userProfile,
      ...goal
    };
    this.persistState();
    this.notify();
  }

  public updateNutritionGoals(goals: Partial<NutritionGoals>) {
    this.state.nutritionGoals = {
      ...this.state.nutritionGoals,
      ...goals
    };
    this.state.calorieTarget = this.state.nutritionGoals.calorieTarget;
    this.state.waterTarget = Math.round(this.state.nutritionGoals.waterTarget / 250);
    this.persistState();
    this.notify();
  }

  public setActivityLevel(level: ActivityLevel) {
    this.state.userProfile.activityLevel = level;
    this.persistState();
    this.notify();
  }

  public addWeightEntry(weight: number, unit: WeightUnit, date: string, time: string, note?: string) {
    const safeWeight = safeFiniteNumber(weight, -1);
    if (safeWeight <= 0) return;
    const weightKg = unit === 'lb' ? lbToKg(safeWeight) : Math.round(safeWeight * 10) / 10;
    const entry: WeightEntry = {
      id: `weight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      weightKg,
      date: date || new Date().toISOString().split('T')[0],
      time: time || '08:00',
      recordedAt: new Date().toISOString(),
      note: note && note.trim() ? note.trim() : undefined
    };

    const updated = [entry, ...this.state.weightHistory].sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.time.localeCompare(a.time);
    });

    this.state.weightHistory = updated;
    this.state.userProfile.currentWeightKg = updated[0].weightKg;
    this.persistState();
    this.notify();
  }

  public updateWeightEntry(id: string, weight: number, unit: WeightUnit, date: string, time: string, note?: string) {
    const safeWeight = safeFiniteNumber(weight, -1);
    if (safeWeight <= 0) return;
    const weightKg = unit === 'lb' ? lbToKg(safeWeight) : Math.round(safeWeight * 10) / 10;

    const updated = this.state.weightHistory.map(entry => {
      if (entry.id !== id) return entry;
      return {
        ...entry,
        weightKg,
        date: date || entry.date,
        time: time || entry.time,
        note: note && note.trim() ? note.trim() : undefined
      };
    }).sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.time.localeCompare(a.time);
    });

    this.state.weightHistory = updated;
    if (updated.length > 0) {
      this.state.userProfile.currentWeightKg = updated[0].weightKg;
    }
    this.persistState();
    this.notify();
  }

  public deleteWeightEntry(id: string) {
    const updated = this.state.weightHistory.filter(w => w.id !== id);
    this.state.weightHistory = updated;
    this.state.userProfile.currentWeightKg = updated.length > 0 ? updated[0].weightKg : null;
    this.persistState();
    this.notify();
  }

  public updateEatingSchedule(schedule: Partial<EatingSchedule>) {
    this.state.eatingSchedule = {
      ...this.state.eatingSchedule,
      ...schedule
    };
    this.persistState();
    this.notify();
  }

  public updateUserPreferences(preferences: Partial<UserPreferences>) {
    this.state.userPreferences = {
      ...this.state.userPreferences,
      ...preferences
    };
    if (preferences.theme) {
      this.applyThemePreference(preferences.theme);
    }
    this.persistState();
    this.notify();
  }

  public openProfileConfirmModal(modal: ProfileConfirmModalState) {
    this.state.profileConfirmModal = modal;
    this.notify();
  }

  public closeProfileConfirmModal() {
    this.state.profileConfirmModal = null;
    this.notify();
  }

  // --- Onboarding Methods ---

  /**
   * Loads profile image from IndexedDB and creates a single object URL.
   * Called once at startup. The URL is stored in state and reused across renders.
   */
  private async loadProfileImageAsync() {
    try {
      const blob = await loadProfileImageBlob();
      if (blob && !this.disposed) {
        // Revoke any previous URL to prevent leaks
        if (this.state.profileImageUrl) {
          URL.revokeObjectURL(this.state.profileImageUrl);
        }
        this.state.profileImageUrl = URL.createObjectURL(blob);
        this.notify();
      }
    } catch {
      // IndexedDB unavailable — no profile image
    }
  }

  /**
   * Sets the profile image URL in state.
   * Revokes the previous URL before setting the new one.
   */
  public setProfileImageUrl(url: string | null) {
    if (this.state.profileImageUrl && this.state.profileImageUrl !== url) {
      URL.revokeObjectURL(this.state.profileImageUrl);
    }
    this.state.profileImageUrl = url;
    this.notify();
  }

  /**
   * Advances to the next onboarding step (or stays on the last step).
   * Persists the draft on every step change.
   */
  public setOnboardingStep(step: number) {
    const clamped = Math.max(1, Math.min(6, step));
    this.state.onboardingState = {
      ...this.state.onboardingState,
      status: 'in_progress',
      currentStep: clamped
    };
    this.persistState();
    this.notify();
  }

  /**
   * Updates onboarding draft fields without touching confirmed profile/goals.
   */
  public updateOnboardingDraft(partial: Partial<OnboardingDraft>) {
    this.state.onboardingDraft = {
      ...this.state.onboardingDraft,
      ...partial
    };
    this.persistState();
    this.notify();
  }

  /**
   * Completes onboarding: applies draft to UserProfile and NutritionGoals.
   *
   * Idempotency:
   * - Generates a stable completionId on first call
   * - If called again with the same completionId, skips weight entry creation
   * - Checks for existing weight entry matching the completionId
   */
  public completeOnboarding(
    confirmedGoals: { calorieTarget: number; proteinTarget: number; carbsTarget: number; fatTarget: number; waterTarget: number },
    skipWeightEntry: boolean = false
  ) {
    const draft = this.state.onboardingDraft;
    const isRestart = this.state.userProfile.profileSetupCompleted === true;

    // Generate stable completion ID if not already set
    const completionId = this.state.onboardingState.completionId
      || `onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Check idempotency: if this completionId already exists, don't duplicate
    const alreadyCompleted = this.state.onboardingState.status === 'completed'
      && this.state.onboardingState.completionId === completionId;

    if (alreadyCompleted) return;

    // Apply draft to UserProfile (only now, not during review)
    const updatedProfile: UserProfile = {
      ...this.state.userProfile,
      displayName: draft.displayName || this.state.userProfile.displayName,
      biologicalSex: draft.biologicalSex || this.state.userProfile.biologicalSex,
      heightCm: draft.heightCm || this.state.userProfile.heightCm,
      currentWeightKg: draft.currentWeightKg || this.state.userProfile.currentWeightKg,
      targetWeightKg: draft.targetWeightKg || this.state.userProfile.targetWeightKg,
      dateOfBirth: draft.dateOfBirth || this.state.userProfile.dateOfBirth,
      activityLevel: draft.activityLevel || this.state.userProfile.activityLevel,
      weightGoalType: draft.weightDirection !== null
        ? (draft.weightDirection < 0 ? 'lose' : draft.weightDirection > 0 ? 'gain' : 'maintain')
        : this.state.userProfile.weightGoalType,
      weeklyGoalRateKg: draft.weightDirection,
      profileSetupCompleted: true
    };

    this.state.userProfile = updatedProfile;

    // Apply confirmed nutrition goals
    this.state.nutritionGoals = {
      ...this.state.nutritionGoals,
      ...confirmedGoals
    };
    this.state.calorieTarget = confirmedGoals.calorieTarget;
    this.state.waterTarget = Math.round(confirmedGoals.waterTarget / 250);

    // Add initial weight entry ONLY if:
    // 1. Weight was provided
    // 2. Not explicitly skipped
    // 3. No existing entry with note matching this completionId
    if (!skipWeightEntry && !isRestart && draft.currentWeightKg && draft.currentWeightKg > 0) {
      const hasExisting = this.state.weightHistory.some(
        w => w.note === `onboarding:${completionId}`
      );
      if (!hasExisting) {
        const entry: WeightEntry = {
          id: `weight-onboarding-${Date.now()}`,
          weightKg: Math.round(draft.currentWeightKg * 10) / 10,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          recordedAt: new Date().toISOString(),
          note: `onboarding:${completionId}`
        };
        this.state.weightHistory = [entry, ...this.state.weightHistory].sort((a, b) => {
          const cmp = b.date.localeCompare(a.date);
          if (cmp !== 0) return cmp;
          return b.time.localeCompare(a.time);
        });
        this.state.userProfile.currentWeightKg = this.state.weightHistory[0].weightKg;
      }
    }

    // Update profile image ref
    if (draft.profileImageRef) {
      this.state.onboardingDraft.profileImageRef = draft.profileImageRef;
    }

    // Mark onboarding completed
    this.state.onboardingState = {
      status: 'completed',
      currentStep: 6,
      completedAt: new Date().toISOString(),
      completionId
    };

    this.state.onboardingDraft = createDefaultOnboardingDraft(this.state.userPreferences);
    this.state.currentScreen = 'dashboard';
    this.persistState();
    this.notify();
  }

  /**
   * Restarts goal setup: opens onboarding with prefilled draft.
   * Does NOT delete history, meals, or workouts.
   * Does NOT add initial weight entry.
   * New goals apply only after user confirms.
   */
  public restartGoalSetup() {
    const profile = this.state.userProfile;
    const prefs = this.state.userPreferences;

    // Create prefilled draft from current profile
    this.state.onboardingDraft = {
      weightDirection: profile.weeklyGoalRateKg === 0 ? 0 : ((profile.weeklyGoalRateKg as WeeklyWeightRate) ?? null),
      biologicalSex: (profile.biologicalSex === 'female' || profile.biologicalSex === 'male' || profile.biologicalSex === 'prefer_not_to_say')
        ? profile.biologicalSex : null,
      heightCm: profile.heightCm || null,
      currentWeightKg: profile.currentWeightKg || null,
      targetWeightKg: profile.targetWeightKg || null,
      dateOfBirth: profile.dateOfBirth || null,
      displayName: profile.displayName || '',
      activityLevel: profile.activityLevel || null,
      profileImageRef: this.state.profileImageUrl ? 'current_profile_photo' : null,
      heightUnit: prefs.heightUnit || 'cm',
      weightUnit: prefs.weightUnit || 'kg'
    };

    this.state.onboardingState = {
      status: 'in_progress',
      currentStep: 2, // Skip welcome, go to weight direction
      completedAt: null,
      completionId: null // New completion ID will be generated on confirm
    };

    this.state.currentScreen = 'onboarding';
    this.persistState();
    this.notify();
  }


  public openWeightModal(entryToEdit?: WeightEntry | null) {
    this.state.weightModalOpen = true;
    this.state.editingWeightEntry = entryToEdit || null;
    this.notify();
  }

  public closeWeightModal() {
    this.state.weightModalOpen = false;
    this.state.editingWeightEntry = null;
    this.notify();
  }

  public deleteSelectedLocalData(target: 'meals' | 'workouts' | 'weights' | 'all') {
    deleteNutriAILocalData(target);
    if (target === 'meals') {
      this.state.meals = [];
      this.state.recentFoods = [];
    } else if (target === 'workouts') {
      this.state.workoutHistory = [];
    } else if (target === 'weights') {
      this.state.weightHistory = [];
      this.state.userProfile.currentWeightKg = null;
    } else if (target === 'all') {
      this.state.meals = [];
      this.state.waterByDate = {};
      this.state.burnedByDate = {};
      this.state.recentFoods = [];
      this.state.customFoods = [];
      this.state.workoutHistory = [];
      this.state.weightHistory = [];
      this.state.userProfile = { displayName: '' };
      this.state.userPreferences = sanitizeUserPreferences(null);
      this.state.eatingSchedule = sanitizeEatingSchedule(null);
      this.state.nutritionGoals = sanitizeNutritionGoals(null);
      this.state.calorieTarget = 2100;
      this.state.waterTarget = 8;
      this.state.onboardingState = { status: 'not_started', currentStep: 1 };
      this.state.onboardingDraft = createDefaultOnboardingDraft(this.state.userPreferences);
      this.state.currentScreen = 'onboarding';
      if (this.state.profileImageUrl) {
        URL.revokeObjectURL(this.state.profileImageUrl);
        this.state.profileImageUrl = null;
      }
      void deleteProfileImageDB().catch(() => { /* Save-status banner reports persistence errors. */ });
    }
    this.persistState();
    this.notify();
  }

  public selectDate(dateKey: string) {
    this.state.selectedDate = dateKey;
    const d = parseLocalDateKey(dateKey);
    const startDay = this.state.userPreferences?.weekStart === 'sunday' ? 0 : 1;
    this.state.visibleDiaryWeekStart = formatLocalDateKey(getStartOfWeek(d, startDay));
    this.notify();
  }

  public syncToCurrentDate() {
    const currentDate = getTodayKey();
    const previousDate = this.lastDeviceDateKey;
    if (currentDate === previousDate) return;

    this.lastDeviceDateKey = currentDate;
    if (this.state.selectedDate === previousDate) {
      this.selectDate(currentDate);
    }
  }

  public openDiaryCalendar() {
    this.state.diaryCalendarOpen = true;
    this.state.diaryCalendarDraftDate = this.state.selectedDate;
    const d = parseLocalDateKey(this.state.selectedDate);
    this.state.calendarViewYear = d.getFullYear();
    this.state.calendarViewMonth = d.getMonth() + 1;
    this.state.calendarPickerMode = 'days';
    this.notify();
  }

  public closeDiaryCalendar() {
    this.state.diaryCalendarOpen = false;
    this.notify();
  }

  public setDiaryCalendarDraftDate(dateKey: string) {
    this.state.diaryCalendarDraftDate = dateKey;
    const d = parseLocalDateKey(dateKey);
    this.state.calendarViewYear = d.getFullYear();
    this.state.calendarViewMonth = d.getMonth() + 1;
    this.notify();
  }

  public applyDiaryCalendarDate(overrideDateKey?: string) {
    const target = overrideDateKey || this.state.diaryCalendarDraftDate || this.state.selectedDate;
    this.selectDate(target);
    this.closeDiaryCalendar();
  }

  public goToToday() {
    this.selectDate(getTodayKey());
    this.closeDiaryCalendar();
  }

  public goToPreviousWeek() {
    const cur = parseLocalDateKey(this.state.visibleDiaryWeekStart);
    this.state.visibleDiaryWeekStart = formatLocalDateKey(addWeeks(cur, -1));
    this.notify();
  }

  public goToNextWeek() {
    const cur = parseLocalDateKey(this.state.visibleDiaryWeekStart);
    this.state.visibleDiaryWeekStart = formatLocalDateKey(addWeeks(cur, 1));
    this.notify();
  }

  public setCalendarViewMonth(year: number, month: number) {
    this.state.calendarViewYear = year;
    this.state.calendarViewMonth = Math.max(1, Math.min(12, month));
    this.state.calendarPickerMode = 'days';
    this.notify();
  }

  public setCalendarViewYear(year: number) {
    this.state.calendarViewYear = year;
    this.notify();
  }

  public changeCalendarMonth(deltaMonths: number) {
    let y = this.state.calendarViewYear;
    let m = this.state.calendarViewMonth + deltaMonths;
    while (m > 12) {
      m -= 12;
      y += 1;
    }
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    this.state.calendarViewYear = y;
    this.state.calendarViewMonth = m;
    this.notify();
  }

  public setCalendarPickerMode(mode: 'days' | 'monthYear') {
    this.state.calendarPickerMode = mode;
    this.notify();
  }

  public getDailyCalorieTotals(dateKeys: string[]): Record<string, number> {
    const keySet = new Set(dateKeys);
    const totals: Record<string, number> = {};
    for (const k of dateKeys) {
      totals[k] = 0;
    }
    for (const m of this.state.meals) {
      if (m.date && keySet.has(m.date)) {
        totals[m.date] = (totals[m.date] || 0) + clampNonNegative(safeFiniteNumber(m.calories));
      }
    }
    return totals;
  }

  public getSelectedDate(): string {
    return this.state.selectedDate;
  }

  public getWaterGlasses(dateKey: string = this.state.selectedDate): number {
    return clampNonNegative(safeFiniteNumber(this.state.waterByDate[dateKey]));
  }

  public addWater(dateKey: string = this.state.selectedDate) {
    const current = this.getWaterGlasses(dateKey);
    if (current < 12) {
      this.state.waterByDate[dateKey] = current + 1;
      this.persistState();
      this.notify();
    }
  }

  public removeWater(dateKey: string = this.state.selectedDate) {
    const current = this.getWaterGlasses(dateKey);
    if (current > 0) {
      this.state.waterByDate[dateKey] = current - 1;
      this.persistState();
      this.notify();
    }
  }

  public getBurnedCalories(dateKey: string = this.state.selectedDate): number {
    return clampNonNegative(safeFiniteNumber(this.state.burnedByDate[dateKey]));
  }

  public getMealsForDate(dateKey: string = this.state.selectedDate): MealItem[] {
    return this.state.meals.filter(m => m.date === dateKey);
  }

  public getConsumedCalories(dateKey: string = this.state.selectedDate): number {
    const meals = this.getMealsForDate(dateKey);
    return meals.reduce((sum, m) => sum + clampNonNegative(safeFiniteNumber(m.calories)), 0);
  }

  public getNetRemainingCalories(dateKey: string = this.state.selectedDate): number {
    const consumed = this.getConsumedCalories(dateKey);
    const burned = this.getBurnedCalories(dateKey);
    const net = this.state.calorieTarget - consumed + burned;
    return safeFiniteNumber(net);
  }

  public getTotals(dateKey: string = this.state.selectedDate) {
    const meals = this.getMealsForDate(dateKey);
    return meals.reduce(
      (acc, m) => {
        acc.protein += clampNonNegative(safeFiniteNumber(m.protein));
        acc.carbs += clampNonNegative(safeFiniteNumber(m.carbs));
        acc.fat += clampNonNegative(safeFiniteNumber(m.fat));
        return acc;
      },
      { protein: 0, carbs: 0, fat: 0 }
    );
  }

  private persistState() {
    savePersistedAppData({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      customFoods: this.state.customFoods,
      recentFoods: this.state.recentFoods,
      meals: this.state.meals,
      waterByDate: this.state.waterByDate,
      burnedByDate: this.state.burnedByDate,
      userProfile: this.state.userProfile,
      userPreferences: this.state.userPreferences,
      weightHistory: this.state.weightHistory,
      eatingSchedule: this.state.eatingSchedule,
      nutritionGoals: this.state.nutritionGoals,
      workoutHistory: this.state.workoutHistory,
      onboardingState: this.state.onboardingState,
      onboardingDraft: this.state.onboardingState.status === 'completed' ? undefined : this.state.onboardingDraft,
      weeklyFitnessTemplate: this.state.weeklyFitnessTemplate,
      scheduledWorkouts: this.state.scheduledWorkouts
    });
  }

  public logMeal(meal: Partial<MealItem> & { name: string; calories: number; mealType: MealType; date?: string }) {
    const targetDate = meal.date || this.state.selectedDate;
    const foodName = meal.name;
    const time = meal.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const id = `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const portion: LoggedFoodPortion = meal.portion || {
      foodId: meal.foodId || id,
      quantity: 1,
      unit: 'serving',
      baseAmount: 1,
      baseUnit: 'serving',
      servingDescription: meal.category || '1 serving'
    };

    const nutritionSnapshot: NutritionValues = meal.nutritionSnapshot || {
      calories: clampNonNegative(safeFiniteNumber(meal.calories)),
      protein: meal.protein === null || meal.protein === undefined ? null : clampNonNegative(safeFiniteNumber(meal.protein)),
      carbs: meal.carbs === null || meal.carbs === undefined ? null : clampNonNegative(safeFiniteNumber(meal.carbs)),
      fat: meal.fat === null || meal.fat === undefined ? null : clampNonNegative(safeFiniteNumber(meal.fat)),
      fiber: null,
      sugar: null,
      sodium: null,
      micronutrients: meal.micronutrients
    };

    const safeCalories = clampNonNegative(safeFiniteNumber(meal.calories));
    const safeProtein = clampNonNegative(safeFiniteNumber(meal.protein));
    const safeCarbs = clampNonNegative(safeFiniteNumber(meal.carbs));
    const safeFat = clampNonNegative(safeFiniteNumber(meal.fat));
    const newMeal: MealItem = {
      id,
      date: targetDate,
      time,
      mealType: meal.mealType,
      foodId: meal.foodId,
      foodName,
      portion,
      nutritionSnapshot,
      foodSource: meal.foodSource || (meal.foodId ? 'built_in' : 'quick_log'),
      loggedAt: new Date().toISOString(),

      name: foodName,
      category: meal.category || portion.servingDescription,
      calories: safeCalories,
      protein: safeProtein,
      carbs: safeCarbs,
      fat: safeFat,
      icon: meal.icon || 'restaurant',
      confidence: meal.confidence,
      ingredients: meal.ingredients || [],
      imageUrl: meal.imageUrl,
      micronutrients: meal.micronutrients
    };

    this.state.meals.unshift(newMeal);
    if (meal.foodId) {
      this.updateRecentFood(portion, meal.mealType);
    }
    this.persistState();
    this.notify();
  }

  public deleteMeal(id: string) {
    this.state.meals = this.state.meals.filter(m => m.id !== id);
    this.persistState();
    this.notify();
  }

  public setScannedFood(food: ScannedFood | null) {
    this.state.lastScannedFood = food;
    this.notify();
  }

  public sendChatMessage(text: string) {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      time: 'Just now'
    };
    this.state.chatHistory.push(userMsg);
    this.notify();

    setTimeout(() => {
      if (this.disposed) return;
      let reply = "Keep focus on progressive overload and adequate post-workout nutrition.";
      const lower = text.toLowerCase();
      if (lower.includes('protein') || lower.includes('dinner')) {
        reply = "For dinner after heavy resistance training, aim for 40-50g protein like wild salmon or chicken breast with complex carbohydrates to replenish glycogen.";
      } else if (lower.includes('workout') || lower.includes('volume')) {
        reply = "Track your total tonnage across sets. Progressive volume increase week over week is the primary driver for hypertrophy.";
      }
      this.state.chatHistory.push({
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: reply,
        time: 'Just now',
        actionChips: ['Check workout routines', 'Review personal records', 'Ask another question']
      });
      this.notify();
    }, 600);
  }

  public toggleQuickActions(open?: boolean) {
    this.state.quickActionOpen = typeof open === 'boolean' ? open : !this.state.quickActionOpen;
    this.state.quickAddOpen = this.state.quickActionOpen;
    this.notify();
  }

  public toggleDashboardWidgetDrawer(open?: boolean) {
    this.state.dashboardWidgetDrawerOpen = open ?? !this.state.dashboardWidgetDrawerOpen;
    this.notify();
  }

  public moveDashboardWidget(widgetId: DashboardWidgetId, direction: -1 | 1) {
    const index = this.state.dashboardWidgetOrder.indexOf(widgetId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= this.state.dashboardWidgetOrder.length) return;
    const order = [...this.state.dashboardWidgetOrder];
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    this.state.dashboardWidgetOrder = order;
    this.persistDashboardWidgetLayout();
    this.notify();
  }

  public toggleDashboardWidget(widgetId: DashboardWidgetId) {
    const hidden = new Set(this.state.hiddenDashboardWidgets);
    if (hidden.has(widgetId)) hidden.delete(widgetId);
    else hidden.add(widgetId);
    this.state.hiddenDashboardWidgets = this.state.dashboardWidgetOrder.filter(id => hidden.has(id));
    this.persistDashboardWidgetLayout();
    this.notify();
  }

  private persistDashboardWidgetLayout() {
    try {
      privateStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify({
        order: this.state.dashboardWidgetOrder,
        hidden: this.state.hiddenDashboardWidgets
      }));
    } catch {}
  }

  public toggleQuickAdd(open?: boolean) {
    this.state.quickAddOpen = typeof open === 'boolean' ? open : !this.state.quickAddOpen;
    this.state.quickActionOpen = this.state.quickAddOpen;
    this.notify();
  }

  public openQuickAdd() {
    this.toggleQuickAdd(true);
  }

  public closeQuickAdd() {
    this.toggleQuickAdd(false);
  }

  public setInsightRange(range: 7 | 30 | 90) {
    this.state.selectedInsightRange = range;
    try {
      privateStorage.setItem(INSIGHT_RANGE_STORAGE_KEY, String(range));
    } catch {}
    this.notify();
  }

  public setInsightTab(tab: 'calories' | 'macros') {
    this.state.selectedInsightTab = tab;
    this.notify();
  }

  public openScannerMode(mode: 'food' | 'barcode') {
    this.state.scannerMode = mode;
    this.state.currentScreen = 'scanner';
    this.state.quickAddOpen = false;
    this.state.quickActionOpen = false;
    this.notify();
  }

  public addRecentFoodSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const existing = this.state.recentFoodSearches.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
    this.state.recentFoodSearches = [trimmed, ...existing].slice(0, 10);
    try {
      privateStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(this.state.recentFoodSearches));
    } catch {}
    this.notify();
  }

  public clearRecentFoodSearches() {
    this.state.recentFoodSearches = [];
    try {
      privateStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {}
    this.notify();
  }

  public selectFoodForSearch(food: CatalogFoodItem | null) {
    this.state.selectedFoodForSearch = food;
    this.state.foodSearchServingMultiplier = 1;
    if (food) {
      this.state.foodSearchMealType = food.suggestedMealType;
    }
    this.notify();
  }

  public updateFoodSearchServingMultiplier(delta: number) {
    const current = this.state.foodSearchServingMultiplier;
    const updated = Math.max(0.25, Math.min(10, Math.round((current + delta) * 100) / 100));
    this.state.foodSearchServingMultiplier = updated;
    this.notify();
  }

  public setFoodSearchMealType(mealType: MealType) {
    this.state.foodSearchMealType = mealType;
    this.notify();
  }

  // ==========================================
  // FITNESS WORKOUT FLOW METHODS
  // ==========================================

  public setFitnessSubView(view: FitnessSubView) {
    this.state.fitnessSubView = view;
    this.notify();
  }

  public setFitnessPlannerMode(mode: FitnessPlannerMode) {
    this.state.fitnessPlannerMode = mode;
    this.notify();
  }

  public setPlannerCalendarMonth(year: number, month: number) {
    this.state.plannerCalendarYear = year;
    this.state.plannerCalendarMonth = month;
    this.notify();
  }

  public nextPlannerMonth() {
    let year = this.state.plannerCalendarYear;
    let month = this.state.plannerCalendarMonth + 1;
    if (month > 12) {
      month = 1;
      year++;
    }
    this.setPlannerCalendarMonth(year, month);
  }

  public prevPlannerMonth() {
    let year = this.state.plannerCalendarYear;
    let month = this.state.plannerCalendarMonth - 1;
    if (month < 1) {
      month = 12;
      year--;
    }
    this.setPlannerCalendarMonth(year, month);
  }

  public goToPlannerCurrentMonth() {
    const now = new Date();
    this.setPlannerCalendarMonth(now.getFullYear(), now.getMonth() + 1);
  }

  public openPlannerDateDetail(dateKey: string) {
    this.state.selectedPlannerDate = dateKey;
    this.state.plannerDetailModalOpen = true;
    this.notify();
  }

  public closePlannerDateDetail() {
    this.state.plannerDetailModalOpen = false;
    this.notify();
  }

  public openWeeklyProgramEditor() {
    this.state.plannerWeeklyEditorOpen = true;
    this.notify();
  }

  public closeWeeklyProgramEditor() {
    this.state.plannerWeeklyEditorOpen = false;
    this.notify();
  }

  public saveWeeklyProgramTemplate(days: Partial<Record<WeekdayNumber, PlannedWorkoutType>>, name?: string) {
    const existing = this.state.weeklyFitnessTemplate;
    const template: WeeklyProgramTemplate = {
      id: existing?.id || `template-${Date.now()}`,
      name: name || existing?.name || 'My Weekly Program',
      days,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.weeklyFitnessTemplate = template;
    this.persistState();
    this.showPlannerToast('Weekly program saved');
    this.notify();
  }

  public checkMonthHasExistingSchedule(year: number, month: number): boolean {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
    return Object.keys(this.state.scheduledWorkouts).some(k => k.startsWith(monthPrefix));
  }

  public applyWeeklyTemplateToMonth(year: number, month: number, forceOverwrite = false) {
    const template = this.state.weeklyFitnessTemplate;
    if (!template) {
      this.showPlannerToast('Please configure a weekly routine first');
      return;
    }

    if (!forceOverwrite && this.checkMonthHasExistingSchedule(year, month)) {
      this.state.plannerConfirmOverwriteMonth = { year, month };
      this.notify();
      return;
    }

    const newScheduled = expandWeeklyTemplateToMonth(
      template,
      year,
      month,
      forceOverwrite ? {} : this.state.scheduledWorkouts
    );

    this.state.scheduledWorkouts = {
      ...this.state.scheduledWorkouts,
      ...newScheduled
    };

    this.state.plannerConfirmOverwriteMonth = null;
    this.state.plannerWeeklyEditorOpen = false;
    this.persistState();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.showPlannerToast(`Applied to ${monthNames[month - 1]} ${year}`);
    this.notify();
  }

  public cancelPlannerConfirmOverwrite() {
    this.state.plannerConfirmOverwriteMonth = null;
    this.notify();
  }

  public applyWeeklyTemplateToCurrentWeek() {
    const template = this.state.weeklyFitnessTemplate;
    if (!template) {
      this.showPlannerToast('Please configure a weekly routine first');
      return;
    }

    const newScheduled = expandWeeklyTemplateToWeek(
      template,
      new Date(),
      this.state.scheduledWorkouts
    );

    this.state.scheduledWorkouts = {
      ...this.state.scheduledWorkouts,
      ...newScheduled
    };

    this.state.plannerWeeklyEditorOpen = false;
    this.persistState();
    this.showPlannerToast('Applied routine to this week');
    this.notify();
  }

  public setScheduledWorkoutForDate(dateKey: string, workout: PlannedWorkoutType) {
    this.state.scheduledWorkouts[dateKey] = {
      dateKey,
      workout,
      source: 'manual_override'
    };
    this.persistState();
    const actionLabel = workout.type === 'rest' ? 'Rest day scheduled' : 'Workout changed for this date';
    this.showPlannerToast(actionLabel);
    this.notify();
  }

  public removeScheduledWorkoutForDate(dateKey: string) {
    if (this.state.scheduledWorkouts[dateKey]) {
      delete this.state.scheduledWorkouts[dateKey];
      this.persistState();
      this.showPlannerToast('Removed from plan');
      this.notify();
    }
  }

  public startWorkoutFromPlan(dateKey: string, presetId: string) {
    const preset = WORKOUT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.state.selectedPresetId = presetId;
    this.state.draftWorkout = createWorkoutExercisesFromPreset(preset);
    this.state.selectedPlannerDate = dateKey;
    this.state.plannerDetailModalOpen = false;
    this.state.fitnessSubView = 'setup';
    this.notify();
  }

  public resetAllFitnessPrograms() {
    resetFitnessPlannerState(this.state);
    this.persistState();
    this.showPlannerToast('All fitness programs have been reset');
    this.notify();
  }

  public showPlannerToast(message: string) {
    this.state.plannerToastMessage = message;
    this.notify();
    setTimeout(() => {
      if (this.disposed) return;
      if (this.state.plannerToastMessage === message) {
        this.state.plannerToastMessage = null;
        this.notify();
      }
    }, 2800);
  }

  public selectWorkoutType(presetId: string) {
    const preset = WORKOUT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    this.state.selectedPresetId = presetId;
    this.state.draftWorkout = createWorkoutExercisesFromPreset(preset);
    this.state.fitnessSubView = 'setup';
    this.notify();
  }

  public cancelWorkoutSetup() {
    this.state.selectedPresetId = null;
    this.state.draftWorkout = null;
    this.state.fitnessSubView = 'home';
    this.notify();
  }

  public updateDraftSets(exerciseIndex: number, delta: number) {
    if (!this.state.draftWorkout || !this.state.draftWorkout[exerciseIndex]) return;
    const ex = this.state.draftWorkout[exerciseIndex];
    const newSetsCount = Math.max(1, Math.min(10, ex.targetSets + delta));
    ex.targetSets = newSetsCount;

    if (ex.sets.length < newSetsCount) {
      for (let i = ex.sets.length; i < newSetsCount; i++) {
        ex.sets.push({
          setNumber: i + 1,
          targetReps: ex.targetReps,
          actualReps: ex.targetReps,
          weightKg: ex.sets[i - 1]?.weightKg || 0,
          completed: false
        });
      }
    } else if (ex.sets.length > newSetsCount) {
      ex.sets = ex.sets.slice(0, newSetsCount);
    }
    this.notify();
  }

  public updateDraftReps(exerciseIndex: number, delta: number) {
    if (!this.state.draftWorkout || !this.state.draftWorkout[exerciseIndex]) return;
    const ex = this.state.draftWorkout[exerciseIndex];
    const newReps = Math.max(1, Math.min(100, ex.targetReps + delta));
    ex.targetReps = newReps;
    ex.sets.forEach(s => {
      s.targetReps = newReps;
      if (!s.completed && s.actualReps === s.targetReps - delta) {
        s.actualReps = newReps;
      }
    });
    this.notify();
  }

  public removeDraftExercise(exerciseIndex: number) {
    if (!this.state.draftWorkout || this.state.draftWorkout.length <= 1) return;
    this.state.draftWorkout.splice(exerciseIndex, 1);
    this.notify();
  }

  public addExerciseToDraft(name: string, muscleGroup: string, sets = 3, reps = 10, restSeconds = 60) {
    if (!this.state.draftWorkout) return;
    const newEx: WorkoutExercise = {
      id: `ex-custom-${Date.now()}`,
      name,
      muscleGroup,
      targetSets: sets,
      targetReps: reps,
      restSeconds,
      sets: Array.from({ length: sets }, (_, i) => ({
        setNumber: i + 1,
        targetReps: reps,
        actualReps: reps,
        weightKg: 0,
        completed: false
      }))
    };
    this.state.draftWorkout.push(newEx);
    this.notify();
  }

  public startWorkout() {
    if (!this.state.draftWorkout || this.state.draftWorkout.length === 0) return;
    const preset = WORKOUT_PRESETS.find(p => p.id === this.state.selectedPresetId);
    
    this.stopWorkoutTimers();

    this.state.activeWorkout = {
      presetId: this.state.selectedPresetId || 'custom',
      presetTitle: preset ? preset.title : 'Custom Routine',
      startTime: Date.now(),
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      isPaused: false,
      currentExerciseIndex: 0,
      exercises: JSON.parse(JSON.stringify(this.state.draftWorkout)),
      restTimerSeconds: null,
      restTimerTotal: 60,
      scheduledDate: this.state.selectedPlannerDate || undefined
    };

    this.state.fitnessSubView = 'active';
    this.startWorkoutTimerInterval();
    this.notify();
  }

  private startWorkoutTimerInterval() {
    this.stopWorkoutTimers();
    this.workoutTimerInterval = setInterval(() => {
      if (this.state.activeWorkout && !this.state.activeWorkout.isPaused) {
        this.state.activeWorkout.elapsedSeconds += 1;
        
        if (this.state.activeWorkout.restTimerSeconds !== null) {
          if (this.state.activeWorkout.restTimerSeconds > 1) {
            this.state.activeWorkout.restTimerSeconds -= 1;
          } else {
            this.state.activeWorkout.restTimerSeconds = null;
          }
        }

        const timerEl = document.getElementById('active-workout-timer-display');
        if (timerEl) {
          timerEl.textContent = this.formatTimerString(this.state.activeWorkout.elapsedSeconds);
        }
        const restEl = document.getElementById('active-rest-timer-countdown');
        if (restEl && this.state.activeWorkout.restTimerSeconds !== null) {
          restEl.textContent = `${this.state.activeWorkout.restTimerSeconds}s`;
        }
      }
    }, 1000);
  }

  private stopWorkoutTimers() {
    if (this.workoutTimerInterval) {
      clearInterval(this.workoutTimerInterval);
      this.workoutTimerInterval = null;
    }
    if (this.restTimerInterval) {
      clearInterval(this.restTimerInterval);
      this.restTimerInterval = null;
    }
  }

  public formatTimerString(seconds: number): string {
    const safeSeconds = Math.floor(clampNonNegative(safeFiniteNumber(seconds)));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  public togglePauseActiveWorkout() {
    if (!this.state.activeWorkout) return;
    this.state.activeWorkout.isPaused = !this.state.activeWorkout.isPaused;
    this.notify();
  }

  public updateActiveSetData(exerciseIndex: number, setIndex: number, weightKg: number, actualReps: number) {
    if (!this.state.activeWorkout) return;
    const ex = this.state.activeWorkout.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) return;
    ex.sets[setIndex].weightKg = clampNonNegative(safeFiniteNumber(weightKg));
    ex.sets[setIndex].actualReps = Math.floor(clampNonNegative(safeFiniteNumber(actualReps)));
  }

  public completeActiveSet(exerciseIndex: number, setIndex: number) {
    if (!this.state.activeWorkout) return;
    const ex = this.state.activeWorkout.exercises[exerciseIndex];
    if (!ex || !ex.sets[setIndex]) return;

    const currentStatus = ex.sets[setIndex].completed;
    ex.sets[setIndex].completed = !currentStatus;

    if (!currentStatus) {
      const restTime = ex.restSeconds || 60;
      this.state.activeWorkout.restTimerSeconds = restTime;
      this.state.activeWorkout.restTimerTotal = restTime;
    } else {
      this.state.activeWorkout.restTimerSeconds = null;
    }

    this.notify();
  }

  public skipRestTimer() {
    if (!this.state.activeWorkout) return;
    this.state.activeWorkout.restTimerSeconds = null;
    this.notify();
  }

  public nextActiveExercise() {
    if (!this.state.activeWorkout) return;
    if (this.state.activeWorkout.currentExerciseIndex < this.state.activeWorkout.exercises.length - 1) {
      this.state.activeWorkout.currentExerciseIndex += 1;
      this.state.activeWorkout.restTimerSeconds = null;
      this.notify();
    }
  }

  public prevActiveExercise() {
    if (!this.state.activeWorkout) return;
    if (this.state.activeWorkout.currentExerciseIndex > 0) {
      this.state.activeWorkout.currentExerciseIndex -= 1;
      this.state.activeWorkout.restTimerSeconds = null;
      this.notify();
    }
  }

  public finishActiveWorkout() {
    if (!this.state.activeWorkout) return;
    this.stopWorkoutTimers();

    const active = this.state.activeWorkout;
    const now = new Date();
    const finishedAt = now.toISOString();

    const startedTime = new Date(active.startedAt).getTime();
    const finishedTime = now.getTime();
    const durationSeconds = Math.max(0, Math.floor((finishedTime - startedTime) / 1000));

    let completedSetsCount = 0;
    let totalVolume = 0;

    const completedExercises: CompletedExercise[] = active.exercises.map(ex => {
      const sets = ex.sets.map(s => {
        if (s.completed) {
          completedSetsCount += 1;
          totalVolume += (s.weightKg * s.actualReps);
        }
        return {
          setNumber: s.setNumber,
          weightKg: s.weightKg,
          reps: s.actualReps,
          completed: s.completed,
          restSeconds: ex.restSeconds,
          completedAt: s.completed ? finishedAt : undefined
        };
      });

      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        muscleGroups: ex.muscleGroup,
        sets
      };
    });

    const isComplete = completedSetsCount > 0;
    const estimatedCalories = isComplete && totalVolume > 0 && durationSeconds >= 30
      ? Math.round((durationSeconds / 60) * 5.5 + totalVolume * 0.02)
      : null;

    this.state.lastWorkoutSummary = {
      id: `workout-${Date.now()}`,
      name: active.presetTitle,
      workoutType: active.presetTitle,
      status: isComplete ? 'completed' : 'incomplete',
      startedAt: active.startedAt,
      finishedAt,
      durationSeconds,
      exercises: completedExercises,
      completedSetCount: completedSetsCount,
      totalVolume,
      estimatedCalories,
      scheduledDate: active.scheduledDate
    };

    this.state.activeWorkout = null;
    this.state.selectedPlannerDate = null;
    this.state.fitnessSubView = 'summary';
    this.notify();
  }

  public saveWorkoutSummary() {
    if (!this.state.lastWorkoutSummary) {
      this.state.fitnessSubView = 'home';
      this.notify();
      return;
    }

    const summary = this.state.lastWorkoutSummary;
    this.state.workoutHistory.unshift(summary);

    // Save to privateStorage safely
    this.persistWorkoutHistory();

    // Re-calculate PRs based on newly added workout
    this.calculatePersonalRecords();

    // Add burned calories if available
    if (summary.estimatedCalories && summary.estimatedCalories > 0) {
      const workoutDate = summary.scheduledDate || formatLocalDateKey(new Date(summary.startedAt));
      const curBurn = this.state.burnedByDate[workoutDate] || 0;
      this.state.burnedByDate[workoutDate] = curBurn + summary.estimatedCalories;
    }

    this.persistState();

    this.state.lastWorkoutSummary = null;
    this.state.selectedPlannerDate = null;
    this.state.fitnessSubView = 'home';
    this.notify();
  }

  public discardWorkoutSummary() {
    this.state.lastWorkoutSummary = null;
    this.state.fitnessSubView = 'home';
    this.notify();
  }

  public cancelActiveWorkout(force = false) {
    if (!this.state.activeWorkout) {
      this.state.fitnessSubView = 'home';
      this.notify();
      return;
    }

    const hasAnyCompleted = this.state.activeWorkout.exercises.some(e => e.sets.some(s => s.completed));
    if (hasAnyCompleted && !force) {
      this.openDeleteModal('active_workout_cancel');
      return;
    }

    this.stopWorkoutTimers();
    this.state.activeWorkout = null;
    this.state.fitnessSubView = 'home';
    this.notify();
  }

  private persistWorkoutHistory() {
    try {
      privateStorage.setItem(WORKOUT_HISTORY_STORAGE_KEY, JSON.stringify(this.state.workoutHistory));
    } catch {
      // Ignore storage quota
    }
  }

  // ==========================================
  // DETAIL & INSPECTION NAVIGATION METHODS
  // ==========================================

  public openWorkoutDetail(workoutId: string) {
    this.state.selectedWorkoutHistoryId = workoutId;
    this.state.currentScreen = 'workoutDetail';
    this.notify();
  }

  public closeWorkoutDetail() {
    this.state.selectedWorkoutHistoryId = null;
    this.state.currentScreen = 'fitness';
    this.notify();
  }

  public openPersonalRecordDetail(exerciseIdOrName: string) {
    this.state.selectedPersonalRecordExerciseId = exerciseIdOrName;
    this.state.currentScreen = 'personalRecordDetail';
    this.notify();
  }

  public closePersonalRecordDetail() {
    this.state.selectedPersonalRecordExerciseId = null;
    this.state.currentScreen = 'fitness';
    this.notify();
  }

  public getWorkoutById(workoutId: string): WorkoutHistoryEntry | undefined {
    return this.state.workoutHistory.find(w => w.id === workoutId);
  }

  public repeatWorkout(workoutId: string) {
    const workout = this.getWorkoutById(workoutId);
    if (!workout) return;

    this.state.draftWorkout = workout.exercises.map((ex, exIdx) => {
      const targetSets = Math.max(1, ex.sets.length);
      const targetReps = ex.sets[0]?.reps || 10;
      const restSec = ex.sets[0]?.restSeconds || 60;

      return {
        id: `repeat-${exIdx}-${Date.now()}`,
        name: ex.exerciseName,
        muscleGroup: ex.muscleGroups,
        targetSets,
        targetReps,
        restSeconds: restSec,
        sets: Array.from({ length: targetSets }, (_, sIdx) => ({
          setNumber: sIdx + 1,
          targetReps,
          actualReps: targetReps,
          weightKg: 0,
          completed: false
        }))
      };
    });

    this.state.selectedPresetId = null;
    this.state.fitnessSubView = 'setup';
    this.state.currentScreen = 'fitness';
    this.notify();
  }

  public openDeleteModal(workoutId: string) {
    this.state.deleteConfirmationWorkoutId = workoutId;
    this.notify();
  }

  public closeDeleteModal() {
    this.state.deleteConfirmationWorkoutId = null;
    this.notify();
  }

  public confirmDeleteWorkout() {
    const targetId = this.state.deleteConfirmationWorkoutId;
    if (!targetId) return;

    if (targetId === 'active_workout_cancel') {
      this.stopWorkoutTimers();
      this.state.activeWorkout = null;
      this.state.fitnessSubView = 'home';
      this.state.deleteConfirmationWorkoutId = null;
      this.notify();
      return;
    }

    this.state.workoutHistory = this.state.workoutHistory.filter(w => w.id !== targetId);
    this.persistWorkoutHistory();
    this.calculatePersonalRecords();

    this.state.deleteConfirmationWorkoutId = null;
    if (this.state.currentScreen === 'workoutDetail') {
      this.state.currentScreen = 'fitness';
      this.state.selectedWorkoutHistoryId = null;
    }
    this.notify();
  }

  // ==========================================
  // PERSONAL RECORDS CALCULATION ENGINE
  // ==========================================

  public calculatePersonalRecords(): PersonalRecord[] {
    // Sort all workouts chronologically (oldest to newest) to trace progression
    const sortedWorkouts = [...this.state.workoutHistory].sort((a, b) => {
      return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
    });

    const prMap = new Map<string, {
      exerciseName: string;
      muscleGroup: string;
      maxWeight: number;
      maxRepsAtWeight: number;
      previousWeight: number;
      achievedAt: string;
      previousAchievedAt?: string;
      workoutId: string;
      workoutName: string;
      timesPerformed: number;
    }>();

    sortedWorkouts.forEach(workout => {
      workout.exercises.forEach(ex => {
        const normName = ex.exerciseName.trim();
        const currentPR = prMap.get(normName) || {
          exerciseName: ex.exerciseName,
          muscleGroup: ex.muscleGroups,
          maxWeight: 0,
          maxRepsAtWeight: 0,
          previousWeight: 0,
          achievedAt: workout.startedAt,
          workoutId: workout.id,
          workoutName: workout.name,
          timesPerformed: 0
        };

        currentPR.timesPerformed += 1;

        ex.sets.forEach(s => {
          s.isPersonalRecord = false; // reset flag before evaluating
          if (s.completed && s.weightKg > 0 && s.reps > 0) {
            const isNewMaxWeight = s.weightKg > currentPR.maxWeight;
            const isTieWithMoreReps = s.weightKg === currentPR.maxWeight && s.reps > currentPR.maxRepsAtWeight;

            if (isNewMaxWeight || isTieWithMoreReps) {
              if (isNewMaxWeight && currentPR.maxWeight > 0) {
                currentPR.previousWeight = currentPR.maxWeight;
                currentPR.previousAchievedAt = currentPR.achievedAt;
              }
              currentPR.maxWeight = s.weightKg;
              currentPR.maxRepsAtWeight = s.reps;
              currentPR.achievedAt = s.completedAt || workout.startedAt;
              currentPR.workoutId = workout.id;
              currentPR.workoutName = workout.name;
              s.isPersonalRecord = true;
            }
          }
        });

        prMap.set(normName, currentPR);
      });
    });

    const records: PersonalRecord[] = [];
    prMap.forEach((data, name) => {
      if (data.maxWeight > 0 && data.maxRepsAtWeight > 0) {
        const epley1RM = Math.round(data.maxWeight * (1 + data.maxRepsAtWeight / 30));
        const dateObj = new Date(data.achievedAt);
        const achievedDateFormatted = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        records.push({
          id: `pr-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          exerciseId: name,
          exerciseName: data.exerciseName,
          muscleGroup: data.muscleGroup,
          weightKg: data.maxWeight,
          reps: data.maxRepsAtWeight,
          estimatedOneRepMax: epley1RM,
          achievedAt: achievedDateFormatted,
          workoutId: data.workoutId,
          workoutName: data.workoutName,
          previousRecordValue: data.previousWeight > 0 ? data.previousWeight : undefined,
          previousAchievedAt: data.previousAchievedAt,
          totalTimesPerformed: data.timesPerformed
        });
      }
    });

    // Sort by estimated 1RM descending
    return records.sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax);
  }

  public getExerciseHistory(exerciseName: string): ExerciseHistoryOccurrence[] {
    const norm = exerciseName.trim().toLowerCase();
    const occurrences: ExerciseHistoryOccurrence[] = [];

    // Order workouts newest to oldest
    const descWorkouts = [...this.state.workoutHistory].sort((a, b) => {
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });

    descWorkouts.forEach(w => {
      const match = w.exercises.find(e => e.exerciseName.trim().toLowerCase() === norm);
      if (match) {
        const completedSets = match.sets.filter(s => s.completed);
        let totalVol = 0;
        let bestWeight = 0;
        let bestReps = 0;
        let hasPR = false;

        completedSets.forEach(s => {
          totalVol += (s.weightKg * s.reps);
          if (s.weightKg > bestWeight || (s.weightKg === bestWeight && s.reps > bestReps)) {
            bestWeight = s.weightKg;
            bestReps = s.reps;
          }
          if (s.isPersonalRecord) {
            hasPR = true;
          }
        });

        const dObj = new Date(w.startedAt);
        const dateStr = dObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        occurrences.push({
          workoutId: w.id,
          workoutName: w.name,
          date: dateStr,
          completedSetsCount: completedSets.length,
          totalExerciseVolume: totalVol,
          bestSet: {
            weightKg: bestWeight,
            reps: bestReps
          },
          sets: match.sets,
          hasPR
        });
      }
    });

    return occurrences;
  }

  // ==========================================
  // MICRONUTRIENTS & MEAL DETAIL METHODS
  // ==========================================

  public openMealDetail(mealId: string) {
    this.state.selectedMealDetailId = mealId;
    this.notify();
  }

  public closeMealDetail() {
    this.state.selectedMealDetailId = null;
    this.notify();
  }

  public openNutrientModal(source: ActiveNutrientModalSource) {
    this.state.activeNutrientModalSource = source;
    this.state.nutrientModalCategoryFilter = 'all';
    this.notify();
  }

  public closeNutrientModal() {
    this.state.activeNutrientModalSource = null;
    this.notify();
  }

  public setNutrientModalCategoryFilter(cat: 'all' | 'vitamins' | 'minerals' | 'other') {
    this.state.nutrientModalCategoryFilter = cat;
    this.notify();
  }

  public setSelectedInsightNutrientCategory(cat: 'all' | 'vitamins' | 'minerals' | 'other') {
    this.state.selectedInsightNutrientCategory = cat;
    this.notify();
  }

  public getSelectedMealDetail(): MealItem | null {
    if (!this.state.selectedMealDetailId) return null;
    return this.state.meals.find(m => m.id === this.state.selectedMealDetailId) || null;
  }

  // ==========================================
  // CUSTOM FOODS & PORTION MANAGEMENT
  // ==========================================

  public getCustomFoods(): FoodDefinition[] {
    return this.state.customFoods;
  }

  public getRecentFoods(): RecentFoodEntry[] {
    return this.state.recentFoods;
  }

  public getFrequentlyUsedFoods(): { food: FoodDefinition; entry: RecentFoodEntry }[] {
    if (this.state.recentFoods.length < 2) return [];

    const sorted = [...this.state.recentFoods]
      .sort((a, b) => {
        if (b.useCount !== a.useCount) return b.useCount - a.useCount;
        return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
      })
      .filter(r => r.useCount >= 1);

    const result: { food: FoodDefinition; entry: RecentFoodEntry }[] = [];
    for (const entry of sorted) {
      const food = this.getFoodDefinitionById(entry.foodId);
      if (food) {
        result.push({ food, entry });
      }
      if (result.length >= 6) break;
    }
    return result;
  }

  public getFoodDefinitionById(id: string): FoodDefinition | undefined {
    const custom = this.state.customFoods.find(f => f.id === id);
    if (custom) return custom;
    return findBuiltInFood(id);
  }

  public setFoodSearchTab(tab: 'recent' | 'myFoods' | 'allFoods') {
    this.state.foodSearchTab = tab;
    this.notify();
  }

  public searchFoods(query: string, category?: string, tab?: 'recent' | 'myFoods' | 'allFoods'): FoodDefinition[] {
    const q = (query || '').trim().toLowerCase();
    const activeTab = tab || this.state.foodSearchTab;

    let pool: FoodDefinition[] = [];

    if (activeTab === 'myFoods') {
      pool = [...this.state.customFoods];
    } else if (activeTab === 'recent') {
      pool = [];
      for (const r of this.state.recentFoods) {
        const f = this.getFoodDefinitionById(r.foodId);
        if (f) pool.push(f);
      }
    } else {
      // allFoods: built-in + custom
      pool = [...this.state.customFoods, ...BUILT_IN_FOOD_DEFINITIONS];
    }

    return pool.filter(f => {
      const matchQuery = !q || 
        f.name.toLowerCase().includes(q) ||
        (f.brand && f.brand.toLowerCase().includes(q)) ||
        (f.category && f.category.toLowerCase().includes(q)) ||
        (f.barcode && f.barcode.toLowerCase().includes(q));

      const matchCat = !category || category === 'all' || f.category === category;
      return matchQuery && matchCat;
    });
  }

  public openCreateCustomFoodModal(editingFoodId?: string) {
    if (editingFoodId) {
      const food = this.getFoodDefinitionById(editingFoodId);
      if (food) {
        this.state.customFoodDraft = foodDefinitionToDraft(food);
        this.state.editingCustomFoodId = editingFoodId;
      } else {
        this.state.customFoodDraft = createEmptyCustomFoodDraft();
        this.state.editingCustomFoodId = null;
      }
    } else {
      this.state.customFoodDraft = createEmptyCustomFoodDraft();
      this.state.editingCustomFoodId = null;
    }
    this.state.customFoodStep = 1;
    this.state.customFoodValidationErrors = {};
    this.state.customFoodDraftDirty = false;
    this.state.customFoodShowDiscardConfirm = false;
    this.state.customFoodDuplicateWarning = null;
    this.state.customFoodIsSaving = false;
    this.state.isCustomFoodModalOpen = true;
    this.notify();
  }

  public closeCreateCustomFoodModal(force = false) {
    if (!force && this.state.customFoodDraftDirty) {
      this.state.customFoodShowDiscardConfirm = true;
      this.notify();
      return;
    }
    this.state.isCustomFoodModalOpen = false;
    this.state.editingCustomFoodId = null;
    this.state.customFoodDraft = createEmptyCustomFoodDraft();
    this.state.customFoodStep = 1;
    this.state.customFoodValidationErrors = {};
    this.state.customFoodDraftDirty = false;
    this.state.customFoodShowDiscardConfirm = false;
    this.state.customFoodDuplicateWarning = null;
    this.state.customFoodIsSaving = false;
    this.notify();
  }

  public cancelDiscardCustomFood() {
    this.state.customFoodShowDiscardConfirm = false;
    this.notify();
  }

  public confirmDiscardCustomFood() {
    this.closeCreateCustomFoodModal(true);
  }

  public updateCustomFoodDraft(partial: Partial<CustomFoodDraft>, markDirty = true, shouldNotify = false) {
    const draft = this.state.customFoodDraft;

    // Check if any macro changed value
    const proteinChanged = 'protein' in partial && partial.protein !== draft.protein;
    const carbsChanged = 'carbs' in partial && partial.carbs !== draft.carbs;
    const fatChanged = 'fat' in partial && partial.fat !== draft.fat;

    if (proteinChanged || carbsChanged || fatChanged) {
      draft.caloriesSyncedWithMacros = false;
      draft.calorieWarningAcknowledged = false;
      delete this.state.customFoodValidationErrors.macros;
      delete this.state.customFoodValidationErrors.calorieConsistency;
    }

    // Check if calories changed directly by user
    if ('calories' in partial && partial.calories !== draft.calories) {
      if (!('calorieSource' in partial)) {
        draft.calorieSource = 'manual';
      }
      draft.caloriesSyncedWithMacros = false;
      draft.calorieWarningAcknowledged = false;
      delete this.state.customFoodValidationErrors.calorieConsistency;
    }

    Object.assign(draft, partial);
    if (markDirty) {
      this.state.customFoodDraftDirty = true;
    }
    if (shouldNotify) {
      this.notify();
    }
  }

  public calculateCustomFoodCalories(): { success: boolean; calories?: number; error?: string } {
    const draft = this.state.customFoodDraft;
    const macros = { protein: draft.protein, carbs: draft.carbs, fat: draft.fat };

    if (!areMacrosCompleteAndValid(macros)) {
      this.state.customFoodValidationErrors.macros = 'Enter protein, carbohydrates, and fat before calculating.';
      this.notify();
      return { success: false, error: 'Enter protein, carbohydrates, and fat before calculating.' };
    }

    const breakdown = calculateCaloriesFromMacros(macros);
    if (!breakdown) {
      return { success: false, error: 'Could not calculate calories.' };
    }

    const roundedCalories = Math.round(breakdown.totalCalories);
    draft.calories = roundedCalories;
    draft.calorieSource = 'calculated_from_macros';
    draft.caloriesSyncedWithMacros = true;
    draft.calorieWarningAcknowledged = false;

    delete this.state.customFoodValidationErrors.calories;
    delete this.state.customFoodValidationErrors.macros;
    delete this.state.customFoodValidationErrors.calorieConsistency;

    this.state.customFoodDraftDirty = true;
    this.notify();
    return { success: true, calories: roundedCalories };
  }

  public useCalculatedCustomFoodCalories(): boolean {
    const draft = this.state.customFoodDraft;
    const macros = { protein: draft.protein, carbs: draft.carbs, fat: draft.fat };
    const breakdown = calculateCaloriesFromMacros(macros);
    if (!breakdown) return false;

    const roundedCalories = Math.round(breakdown.totalCalories);
    draft.calories = roundedCalories;
    draft.calorieSource = 'calculated_from_macros';
    draft.caloriesSyncedWithMacros = true;
    draft.calorieWarningAcknowledged = false;

    delete this.state.customFoodValidationErrors.calories;
    delete this.state.customFoodValidationErrors.calorieConsistency;

    this.state.customFoodDraftDirty = true;
    this.notify();
    return true;
  }

  public keepEnteredCustomFoodCalories(): boolean {
    const draft = this.state.customFoodDraft;
    draft.calorieWarningAcknowledged = true;
    draft.calorieSource = 'manual';
    draft.caloriesSyncedWithMacros = false;

    delete this.state.customFoodValidationErrors.calorieConsistency;

    this.state.customFoodDraftDirty = true;
    this.notify();
    return true;
  }

  public validateCustomFoodStep(step: 1 | 2 | 3 | 4): boolean {
    const errors: Record<string, string> = {};
    const draft = this.state.customFoodDraft;

    if (step === 1) {
      if (!draft.name || !draft.name.trim()) {
        errors.name = 'Food name is required';
      }
      if (!draft.category || !draft.category.trim()) {
        errors.category = 'Please select a food category';
      }
      if (draft.barcode && draft.barcode.trim()) {
        const trimmedBarcode = draft.barcode.trim().toLowerCase();
        const dupBarcode = this.state.customFoods.find(
          f => f.id !== (this.state.editingCustomFoodId || undefined) &&
               f.barcode && f.barcode.trim().toLowerCase() === trimmedBarcode
        );
        if (dupBarcode) {
          errors.barcode = `Barcode is already registered to "${dupBarcode.name}"`;
        }
      }

      // Check similar name/brand warning (does not block proceeding, but displays warning)
      const dupCheck = this.checkCustomFoodDuplicate(
        draft.name, 
        draft.brand, 
        draft.barcode, 
        this.state.editingCustomFoodId || undefined
      );
      if (dupCheck.warningMessage && !errors.barcode) {
        this.state.customFoodDuplicateWarning = {
          message: dupCheck.warningMessage,
          duplicateFood: dupCheck.duplicateFood
        };
      } else {
        this.state.customFoodDuplicateWarning = null;
      }
    } else if (step === 2) {
      if (draft.basisType === 'per_serving') {
        if (!draft.servingDescription || !draft.servingDescription.trim()) {
          errors.servingDescription = 'Serving description is required (e.g. 1 slice, 1 scoop)';
        }
        if (draft.servingQuantity === null || isNaN(draft.servingQuantity) || !isFinite(draft.servingQuantity) || draft.servingQuantity <= 0) {
          errors.servingQuantity = 'Serving quantity must be greater than 0';
        }
        if (!draft.servingUnit || !draft.servingUnit.trim()) {
          errors.servingUnit = 'Serving unit is required';
        }
        if (draft.servingEquivalentAmount !== null) {
          if (isNaN(draft.servingEquivalentAmount) || !isFinite(draft.servingEquivalentAmount) || draft.servingEquivalentAmount <= 0) {
            errors.servingEquivalentAmount = 'Equivalent amount must be greater than 0';
          }
        }
      } else {
        // per_100g or per_100ml
        if (draft.basisAmount <= 0 || isNaN(draft.basisAmount) || !isFinite(draft.basisAmount)) {
          errors.basisAmount = 'Basis amount must be greater than 0';
        }
      }
    } else if (step === 3) {
      // 1. Protein, Carbs, Fat are required before advancing to Step 4
      if (draft.protein === null || isNaN(draft.protein) || !isFinite(draft.protein) || draft.protein < 0) {
        errors.protein = 'Protein is required (enter 0 or greater)';
      }
      if (draft.carbs === null || isNaN(draft.carbs) || !isFinite(draft.carbs) || draft.carbs < 0) {
        errors.carbs = 'Carbohydrates is required (enter 0 or greater)';
      }
      if (draft.fat === null || isNaN(draft.fat) || !isFinite(draft.fat) || draft.fat < 0) {
        errors.fat = 'Fat is required (enter 0 or greater)';
      }

      // 2. Calories is required
      if (draft.calories === null || isNaN(draft.calories) || !isFinite(draft.calories) || draft.calories < 0) {
        errors.calories = 'Calories is required and must be 0 or greater';
      }

      // 3. Check consistency warning if all 4 are valid numbers
      if (
        draft.protein !== null && !isNaN(draft.protein) && draft.protein >= 0 &&
        draft.carbs !== null && !isNaN(draft.carbs) && draft.carbs >= 0 &&
        draft.fat !== null && !isNaN(draft.fat) && draft.fat >= 0 &&
        draft.calories !== null && !isNaN(draft.calories) && draft.calories >= 0
      ) {
        const consistency = checkCalorieConsistency(draft.calories, {
          protein: draft.protein,
          carbs: draft.carbs,
          fat: draft.fat
        });

        if (consistency && consistency.shouldWarn && !draft.calorieWarningAcknowledged) {
          errors.calorieConsistency = 'Calories significantly deviate from macros. Please select "Use Calculated" or "Keep Entered".';
        }
      }

      // 4. Optional detail nutrients non-negative check
      const optionalNumericFields: (keyof CustomFoodDraft)[] = [
        'fiber', 'sugar', 'sodium',
        'vitaminC', 'vitaminD', 'calcium', 'iron', 'potassium', 'magnesium'
      ];
      for (const field of optionalNumericFields) {
        const val = draft[field] as number | null;
        if (val !== null && (isNaN(val) || !isFinite(val) || val < 0)) {
          errors[field] = 'Must be 0 or greater';
        }
      }
    }

    this.state.customFoodValidationErrors = errors;
    return Object.keys(errors).length === 0;
  }

  public nextCustomFoodStep(): boolean {
    const currentStep = this.state.customFoodStep;
    const isValid = this.validateCustomFoodStep(currentStep);
    if (!isValid) {
      this.notify();
      return false;
    }
    if (currentStep < 4) {
      this.state.customFoodStep = (currentStep + 1) as 1 | 2 | 3 | 4;
      this.state.customFoodValidationErrors = {};
      this.notify();
    }
    return true;
  }

  public previousCustomFoodStep(): void {
    if (this.state.customFoodStep > 1) {
      this.state.customFoodStep = (this.state.customFoodStep - 1) as 1 | 2 | 3 | 4;
      this.state.customFoodValidationErrors = {};
      this.notify();
    }
  }

  public setCustomFoodStep(targetStep: 1 | 2 | 3 | 4): boolean {
    if (targetStep === this.state.customFoodStep) return true;
    if (targetStep < this.state.customFoodStep) {
      this.state.customFoodStep = targetStep;
      this.state.customFoodValidationErrors = {};
      this.notify();
      return true;
    }
    // Cannot skip forward over invalid steps
    for (let s = this.state.customFoodStep; s < targetStep; s++) {
      if (!this.validateCustomFoodStep(s as 1 | 2 | 3 | 4)) {
        this.state.customFoodStep = s as 1 | 2 | 3 | 4;
        this.notify();
        return false;
      }
    }
    this.state.customFoodStep = targetStep;
    this.state.customFoodValidationErrors = {};
    this.notify();
    return true;
  }

  public addDraftPortionOption(option: FoodPortionOption): boolean {
    if (!option.label || !option.label.trim()) return false;
    if (option.quantity <= 0 || isNaN(option.quantity) || !isFinite(option.quantity)) return false;
    if (option.equivalentBaseAmount <= 0 || isNaN(option.equivalentBaseAmount) || !isFinite(option.equivalentBaseAmount)) return false;

    this.state.customFoodDraft.portionOptions.push({
      id: option.id || `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: option.label.trim(),
      quantity: option.quantity,
      unit: option.unit,
      dimension: option.dimension || getUnitDimension(option.unit),
      equivalentBaseAmount: option.equivalentBaseAmount,
      equivalentBaseUnit: option.equivalentBaseUnit
    });
    this.state.customFoodDraftDirty = true;
    this.notify();
    return true;
  }

  public removeDraftPortionOption(index: number): void {
    if (index >= 0 && index < this.state.customFoodDraft.portionOptions.length) {
      this.state.customFoodDraft.portionOptions.splice(index, 1);
      this.state.customFoodDraftDirty = true;
      this.notify();
    }
  }

  public toggleDraftMicronutrients(): void {
    this.state.customFoodDraft.isMicronutrientsExpanded = !this.state.customFoodDraft.isMicronutrientsExpanded;
    this.notify();
  }

  public saveCustomFoodDraft(): { success: boolean; food?: FoodDefinition; error?: string } {
    if (this.state.customFoodIsSaving) {
      return { success: false, error: 'Saving already in progress' };
    }
    this.state.customFoodIsSaving = true;

    // Validate Steps 1, 2, 3
    if (!this.validateCustomFoodStep(1)) {
      this.state.customFoodStep = 1;
      this.state.customFoodIsSaving = false;
      this.notify();
      return { success: false, error: 'Please correct errors in Step 1' };
    }
    if (!this.validateCustomFoodStep(2)) {
      this.state.customFoodStep = 2;
      this.state.customFoodIsSaving = false;
      this.notify();
      return { success: false, error: 'Please correct errors in Step 2' };
    }
    if (!this.validateCustomFoodStep(3)) {
      this.state.customFoodStep = 3;
      this.state.customFoodIsSaving = false;
      this.notify();
      return { success: false, error: 'Please correct errors in Step 3' };
    }

    const draft = this.state.customFoodDraft;
    const now = new Date().toISOString();

    // Micronutrients object
    const vitamins: NutrientValue[] = [];
    const minerals: NutrientValue[] = [];
    if (draft.vitaminC !== null) {
      vitamins.push({ key: 'vitamin_c', name: 'Vitamin C', shortName: 'Vit C', amount: draft.vitaminC, unit: 'mg', source: 'manual' });
    }
    if (draft.vitaminD !== null) {
      vitamins.push({ key: 'vitamin_d', name: 'Vitamin D', shortName: 'Vit D', amount: draft.vitaminD, unit: 'mcg', source: 'manual' });
    }
    if (draft.calcium !== null) {
      minerals.push({ key: 'calcium', name: 'Calcium', shortName: 'Calcium', amount: draft.calcium, unit: 'mg', source: 'manual' });
    }
    if (draft.iron !== null) {
      minerals.push({ key: 'iron', name: 'Iron', shortName: 'Iron', amount: draft.iron, unit: 'mg', source: 'manual' });
    }
    if (draft.potassium !== null) {
      minerals.push({ key: 'potassium', name: 'Potassium', shortName: 'Potassium', amount: draft.potassium, unit: 'mg', source: 'manual' });
    }
    if (draft.magnesium !== null) {
      minerals.push({ key: 'magnesium', name: 'Magnesium', shortName: 'Magnesium', amount: draft.magnesium, unit: 'mg', source: 'manual' });
    }

    const hasMicros = vitamins.length > 0 || minerals.length > 0;
    const micros: MicronutrientProfile | undefined = hasMicros ? {
      vitamins,
      minerals,
      otherNutrients: []
    } : undefined;

    const isPerServing = draft.basisType === 'per_serving';
    const isPer100ml = draft.basisType === 'per_100ml';

    let savedFood: FoodDefinition;

    if (this.state.editingCustomFoodId) {
      const idx = this.state.customFoods.findIndex(f => f.id === this.state.editingCustomFoodId);
      const existing = idx >= 0 ? this.state.customFoods[idx] : null;

      savedFood = {
        id: this.state.editingCustomFoodId,
        name: draft.name.trim(),
        brand: draft.brand.trim() || undefined,
        category: draft.category || 'other',
        barcode: draft.barcode.trim() || undefined,
        source: 'custom',
        nutritionBasis: {
          amount: isPerServing ? draft.servingQuantity : 100,
          unit: isPerServing ? 'serving' : (isPer100ml ? 'ml' : 'g'),
          servingDescription: draft.servingDescription.trim() || undefined
        },
        nutrition: {
          calories: draft.calories!,
          calorieSource: draft.calorieSource || 'manual',
          protein: draft.protein !== null ? draft.protein : null,
          carbs: draft.carbs !== null ? draft.carbs : null,
          fat: draft.fat !== null ? draft.fat : null,
          fiber: draft.fiber !== null ? draft.fiber : null,
          sugar: draft.sugar !== null ? draft.sugar : null,
          sodium: draft.sodium !== null ? draft.sodium : null,
          micronutrients: micros
        },
        portionOptions: draft.portionOptions ? [...draft.portionOptions] : [],
        calorieSource: draft.calorieSource || 'manual',
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };

      if (idx >= 0) {
        this.state.customFoods[idx] = savedFood;
      } else {
        this.state.customFoods.unshift(savedFood);
      }
    } else {
      savedFood = {
        id: `custom-food-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: draft.name.trim(),
        brand: draft.brand.trim() || undefined,
        category: draft.category || 'other',
        barcode: draft.barcode.trim() || undefined,
        source: 'custom',
        nutritionBasis: {
          amount: isPerServing ? draft.servingQuantity : 100,
          unit: isPerServing ? 'serving' : (isPer100ml ? 'ml' : 'g'),
          servingDescription: draft.servingDescription.trim() || undefined
        },
        nutrition: {
          calories: draft.calories!,
          calorieSource: draft.calorieSource || 'manual',
          protein: draft.protein !== null ? draft.protein : null,
          carbs: draft.carbs !== null ? draft.carbs : null,
          fat: draft.fat !== null ? draft.fat : null,
          fiber: draft.fiber !== null ? draft.fiber : null,
          sugar: draft.sugar !== null ? draft.sugar : null,
          sodium: draft.sodium !== null ? draft.sodium : null,
          micronutrients: micros
        },
        portionOptions: draft.portionOptions ? [...draft.portionOptions] : [],
        calorieSource: draft.calorieSource || 'manual',
        createdAt: now,
        updatedAt: now
      };

      this.state.customFoods.unshift(savedFood);
    }

    this.persistState();
    this.state.isCustomFoodModalOpen = false;
    this.state.editingCustomFoodId = null;
    this.state.customFoodDraft = createEmptyCustomFoodDraft();
    this.state.customFoodDraftDirty = false;
    this.state.customFoodIsSaving = false;
    this.state.customFoodValidationErrors = {};
    this.state.customFoodShowDiscardConfirm = false;

    // Immediately open Set Portion modal for the newly saved food
    this.openSetPortion(savedFood);

    this.notify();
    return { success: true, food: savedFood };
  }

  public checkCustomFoodDuplicate(name: string, brand?: string, barcode?: string, excludeFoodId?: string): {
    hasBarcodeDuplicate: boolean;
    duplicateFood?: FoodDefinition;
    warningMessage?: string;
  } {
    const normName = name.trim().toLowerCase();
    const normBrand = (brand || '').trim().toLowerCase();
    const normBarcode = (barcode || '').trim().toLowerCase();

    // 1. Check barcode unique constraint in custom foods
    if (normBarcode) {
      const barcodeMatch = this.state.customFoods.find(f => 
        f.id !== excludeFoodId && f.barcode && f.barcode.trim().toLowerCase() === normBarcode
      );
      if (barcodeMatch) {
        return {
          hasBarcodeDuplicate: true,
          duplicateFood: barcodeMatch,
          warningMessage: `Barcode "${barcode}" is already registered to "${barcodeMatch.name}". Barcodes must be unique.`
        };
      }
    }

    // 2. Check similar name + brand in all foods
    const all = [...this.state.customFoods, ...BUILT_IN_FOOD_DEFINITIONS];
    const nameMatch = all.find(f => {
      if (f.id === excludeFoodId) return false;
      const fn = f.name.trim().toLowerCase();
      const fb = (f.brand || '').trim().toLowerCase();
      if (fn === normName && (!normBrand || fb === normBrand)) return true;
      return false;
    });

    if (nameMatch) {
      return {
        hasBarcodeDuplicate: false,
        duplicateFood: nameMatch,
        warningMessage: `A food named "${nameMatch.name}"${nameMatch.brand ? ` (${nameMatch.brand})` : ''} already exists in your database.`
      };
    }

    return { hasBarcodeDuplicate: false };
  }

  public createCustomFood(foodInput: Omit<FoodDefinition, 'id' | 'createdAt' | 'updatedAt' | 'source'>): {
    success: boolean;
    food?: FoodDefinition;
    error?: string;
    duplicateWarning?: boolean;
    existingFood?: FoodDefinition;
  } {
    if (!foodInput.name || !foodInput.name.trim()) {
      return { success: false, error: 'Food name is required.' };
    }
    if (foodInput.nutrition.calories === null || isNaN(foodInput.nutrition.calories) || foodInput.nutrition.calories < 0) {
      return { success: false, error: 'Valid calories amount is required.' };
    }

    const now = new Date().toISOString();
    const newFood: FoodDefinition = {
      ...foodInput,
      id: `custom-food-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: foodInput.name.trim(),
      brand: foodInput.brand ? foodInput.brand.trim() : undefined,
      category: foodInput.category ? foodInput.category.trim() : 'Custom Food',
      barcode: foodInput.barcode ? foodInput.barcode.trim() : undefined,
      source: 'custom',
      createdAt: now,
      updatedAt: now
    };

    this.state.customFoods.unshift(newFood);
    this.persistState();
    this.closeCreateCustomFoodModal();
    this.notify();

    // Immediately open Set Portion for the newly created food
    this.openSetPortion(newFood);

    return { success: true, food: newFood };
  }

  public updateCustomFood(id: string, updates: Partial<Omit<FoodDefinition, 'id' | 'createdAt' | 'source'>>): boolean {
    const idx = this.state.customFoods.findIndex(f => f.id === id);
    if (idx === -1) return false;

    const current = this.state.customFoods[idx];
    this.state.customFoods[idx] = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.persistState();
    this.closeCreateCustomFoodModal();
    this.notify();
    return true;
  }

  public deleteCustomFood(id: string): void {
    // Delete custom food definition, but NEVER delete or mutate past MealItems!
    this.state.customFoods = this.state.customFoods.filter(f => f.id !== id);
    this.persistState();
    this.notify();
  }

  public openSetPortion(
    food: FoodDefinition, 
    initialPortion?: Partial<LoggedFoodPortion>, 
    mealType?: MealType, 
    dateKey?: string, 
    timeStr?: string
  ): void {
    this.state.activePortionFood = food;

    // Determine initial portion quantity & unit
    let initialQty = food.nutritionBasis.amount;
    let initialUnit = food.nutritionBasis.unit as FoodUnit;

    if (initialPortion && initialPortion.quantity && initialPortion.unit) {
      initialQty = initialPortion.quantity;
      initialUnit = initialPortion.unit;
    } else {
      // Check if food was recently used to restore last portion
      const recent = this.state.recentFoods.find(r => r.foodId === food.id);
      if (recent && recent.lastPortion) {
        initialQty = recent.lastPortion.quantity;
        initialUnit = recent.lastPortion.unit;
      } else if (food.portionOptions.length > 0) {
        initialQty = food.portionOptions[0].quantity;
        initialUnit = food.portionOptions[0].unit;
      }
    }

    this.state.activePortionQuantity = initialQty;
    this.state.activePortionUnit = initialUnit;
    this.state.activePortionMealType = mealType || this.state.foodSearchMealType || 'lunch';
    
    // Always default date to current context (never stale historical date)
    this.state.activePortionDate = dateKey || this.state.selectedDate || getTodayKey();
    
    // Always default time to current time
    this.state.activePortionTime = timeStr || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    this.state.isSetPortionOpen = true;
    this.notify();
  }

  public closeSetPortion(): void {
    this.state.isSetPortionOpen = false;
    this.state.activePortionFood = null;
    this.notify();
  }

  public setPortionQuantity(qty: number): void {
    this.state.activePortionQuantity = qty;
    this.notify();
  }

  public setPortionUnit(unit: FoodUnit): void {
    this.state.activePortionUnit = unit;
    this.notify();
  }

  public setPortionMealType(mealType: MealType): void {
    this.state.activePortionMealType = mealType;
    this.notify();
  }

  public setPortionDate(date: string): void {
    this.state.activePortionDate = date;
    this.notify();
  }

  public setPortionTime(time: string): void {
    this.state.activePortionTime = time;
    this.notify();
  }

  public calculateSelectedPortionNutrition(): { 
    nutrition: NutritionValues; 
    multiplier: number; 
    portionDescription: string;
    error?: string;
  } | null {
    const food = this.state.activePortionFood;
    if (!food) return null;

    const qty = this.state.activePortionQuantity;
    const unit = this.state.activePortionUnit;

    if (isNaN(qty) || !isFinite(qty) || qty <= 0) {
      return {
        nutrition: scaleNutritionForPortion(food.nutrition, 0),
        multiplier: 0,
        portionDescription: `${qty} ${unit}`,
        error: 'Please enter a quantity greater than zero.'
      };
    }

    const mult = calculatePortionMultiplier(qty, unit, food);
    if (mult === null) {
      return {
        nutrition: scaleNutritionForPortion(food.nutrition, 0),
        multiplier: 0,
        portionDescription: `${qty} ${unit}`,
        error: `Cannot convert unit "${unit}" for ${food.name}. Please select a compatible portion.`
      };
    }

    const scaled = scaleNutritionForPortion(food.nutrition, mult);
    const desc = formatPortionLabel(qty, unit, food.nutritionBasis.servingDescription);

    return {
      nutrition: scaled,
      multiplier: mult,
      portionDescription: desc
    };
  }

  public addSelectedFoodToDiary(): MealItem | null {
    const food = this.state.activePortionFood;
    if (!food) return null;

    const calc = this.calculateSelectedPortionNutrition();
    if (!calc || calc.error || calc.multiplier <= 0) {
      return null;
    }

    const resolved = resolvePortionToBaseAmount(
      this.state.activePortionQuantity, 
      this.state.activePortionUnit, 
      food
    );

    const portion: LoggedFoodPortion = {
      foodId: food.id,
      quantity: this.state.activePortionQuantity,
      unit: this.state.activePortionUnit,
      baseAmount: resolved ? resolved.baseAmount : this.state.activePortionQuantity,
      baseUnit: resolved ? resolved.baseUnit : food.nutritionBasis.unit,
      servingDescription: calc.portionDescription
    };

    const newMeal: MealItem = {
      id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: this.state.activePortionDate,
      time: this.state.activePortionTime,
      mealType: this.state.activePortionMealType,
      foodId: food.id,
      foodName: food.name,
      portion,
      nutritionSnapshot: calc.nutrition,
      foodSource: food.source,
      loggedAt: new Date().toISOString(),

      name: food.name,
      category: food.brand ? `${food.brand} • ${portion.servingDescription}` : portion.servingDescription,
      calories: calc.nutrition.calories || 0,
      protein: calc.nutrition.protein || 0,
      carbs: calc.nutrition.carbs || 0,
      fat: calc.nutrition.fat || 0,
      icon: food.icon || 'restaurant',
      micronutrients: calc.nutrition.micronutrients
    };

    this.state.meals.unshift(newMeal);
    this.updateRecentFood(portion, this.state.activePortionMealType);
    this.persistState();

    this.closeSetPortion();
    this.setScreen('diary');
    return newMeal;
  }

  public updateRecentFood(portion: LoggedFoodPortion, mealType: MealType): void {
    const existingIndex = this.state.recentFoods.findIndex(r => r.foodId === portion.foodId);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = this.state.recentFoods[existingIndex];
      this.state.recentFoods.splice(existingIndex, 1);
      this.state.recentFoods.unshift({
        foodId: portion.foodId,
        lastUsedAt: now,
        useCount: existing.useCount + 1,
        lastPortion: portion,
        lastMealType: mealType
      });
    } else {
      this.state.recentFoods.unshift({
        foodId: portion.foodId,
        lastUsedAt: now,
        useCount: 1,
        lastPortion: portion,
        lastMealType: mealType
      });
    }

    if (this.state.recentFoods.length > 30) {
      this.state.recentFoods = this.state.recentFoods.slice(0, 30);
    }

    this.persistState();
  }

  public removeRecentFood(foodId: string): void {
    this.state.recentFoods = this.state.recentFoods.filter(r => r.foodId !== foodId);
    this.persistState();
    this.notify();
  }

  public clearRecentFoods(): void {
    this.state.recentFoods = [];
    this.persistState();
    this.notify();
  }

  public getActiveNutrientModalData(): {
    title: string;
    subtitle: string;
    sourceBadge: string;
    profile: MicronutrientProfile | undefined;
    ingredients?: string[];
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  } | null {
    const source = this.state.activeNutrientModalSource;
    if (!source) return null;

    if (source.type === 'scanned') {
      const food = this.state.lastScannedFood;
      return {
        title: food?.name || 'Scanned Food',
        subtitle: food?.subtitle || 'Instant Lens Preview',
        sourceBadge: 'DEMO ESTIMATE',
        profile: food?.micronutrients,
        ingredients: food?.ingredients,
        calories: food?.calories,
        protein: food?.protein,
        carbs: food?.carbs,
        fat: food?.fat
      };
    }

    if (source.type === 'meal') {
      const meal = this.state.meals.find(m => m.id === source.mealId);
      if (!meal) return null;
      const isDemo = meal.micronutrients?.vitamins.some(v => v.source === 'demo');
      return {
        title: meal.name,
        subtitle: `${meal.mealType.toUpperCase()} • ${meal.date} at ${meal.time}`,
        sourceBadge: isDemo ? 'DEMO' : 'DATABASE',
        profile: meal.nutritionSnapshot?.micronutrients || meal.micronutrients,
        ingredients: meal.ingredients,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat
      };
    }

    if (source.type === 'catalog') {
      // Check FoodDefinition first
      const def = this.getFoodDefinitionById(source.catalogId);
      if (def) {
        let mult = 1;
        if (this.state.isSetPortionOpen && this.state.activePortionFood?.id === def.id) {
          mult = calculatePortionMultiplier(this.state.activePortionQuantity, this.state.activePortionUnit, def) || 1;
        } else {
          mult = this.state.foodSearchServingMultiplier || 1;
        }

        const scaledNut = scaleNutritionForPortion(def.nutrition, mult);

        return {
          title: def.name,
          subtitle: def.brand ? `${def.brand} • ${def.nutritionBasis.servingDescription || def.nutritionBasis.amount + def.nutritionBasis.unit}` : (def.nutritionBasis.servingDescription || `${def.nutritionBasis.amount} ${def.nutritionBasis.unit}`),
          sourceBadge: def.source === 'custom' ? 'MY FOOD' : 'DATABASE',
          profile: scaledNut.micronutrients,
          calories: scaledNut.calories || undefined,
          protein: scaledNut.protein || undefined,
          carbs: scaledNut.carbs || undefined,
          fat: scaledNut.fat || undefined
        };
      }

      // Legacy fallback
      const item = LOCAL_FOOD_CATALOG.find(c => c.id === source.catalogId);
      if (!item) return null;
      const mult = this.state.foodSearchServingMultiplier;
      const scaledProfile = item.micronutrients 
        ? scaleMicronutrientProfile(item.micronutrients, mult) 
        : undefined;

      return {
        title: item.name,
        subtitle: `${item.servingUnit} (${mult}x portion)`,
        sourceBadge: 'DEMO CATALOG',
        profile: scaledProfile,
        calories: Math.round(item.caloriesPerServing * mult),
        protein: Math.round(item.proteinPerServing * mult * 10) / 10,
        carbs: Math.round(item.carbsPerServing * mult * 10) / 10,
        fat: Math.round(item.fatPerServing * mult * 10) / 10
      };
    }

    return null;
  }
}

export let store: Store;
export function initializeStore() { store = new Store(); }
export function disposeStore() { store.dispose(); }
