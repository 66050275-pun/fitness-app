export type ActiveScreen = 
  | 'dashboard' 
  | 'diary' 
  | 'scanner' 
  | 'foodResult' 
  | 'fitness' 
  | 'coach' 
  | 'profile'
  | 'workoutDetail'
  | 'personalRecordDetail'
  | 'insights'
  | 'foodSearch'
  | 'quickLog'
  | 'onboarding';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type NutrientUnit = 
  | 'mg' 
  | 'mcg' 
  | 'g' 
  | 'IU' 
  | 'mg_NE' 
  | 'mcg_DFE' 
  | 'mcg_RAE' 
  | 'mg_alpha_TE';

export type NutrientCategory = 'vitamin' | 'mineral' | 'other';
export type NutrientFilterCategory = 'all' | 'vitamins' | 'minerals' | 'other';
export type NutrientReferenceKind = 'daily_value' | 'adequate_intake' | 'upper_limit' | 'informational' | 'none';
export type NutrientDirection = 'minimum_target' | 'maximum_limit' | 'informational_only';

export interface NutrientValue {
  key: string;
  name: string;
  shortName?: string;
  amount: number | null;
  unit: NutrientUnit;
  dailyValuePercent?: number | null;
  source?: 'ai_estimate' | 'database' | 'nutrition_label' | 'manual' | 'demo';
  confidence?: number | null;
}

export interface ServingBasis {
  amount: number;
  unit: string;
  description?: string;
}

export interface MicronutrientProfile {
  servingBasis?: ServingBasis;
  vitamins: NutrientValue[];
  minerals: NutrientValue[];
  otherNutrients: NutrientValue[];
}

export type MeasurementDimension =
  | 'mass'
  | 'volume'
  | 'count'
  | 'serving';

export type FoodUnit =
  | 'mg'
  | 'g'
  | 'kg'
  | 'oz'
  | 'lb'
  | 'ml'
  | 'l'
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'piece'
  | 'slice'
  | 'bowl'
  | 'scoop'
  | 'serving';

export interface FoodPortionOption {
  id: string;
  label: string;
  unit: FoodUnit;
  dimension: MeasurementDimension;
  quantity: number;
  equivalentBaseAmount: number;
  equivalentBaseUnit: 'g' | 'ml';
}

export type CalorieValueSource =
  | 'manual'
  | 'calculated_from_macros'
  | 'nutrition_label'
  | 'database'
  | 'ai_estimate'
  | 'demo';

export interface NutritionValues {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  micronutrients?: MicronutrientProfile;
  calorieSource?: CalorieValueSource;
}

export interface FoodDefinition {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  barcode?: string;
  source: 'built_in' | 'custom' | 'database' | 'demo';
  calorieSource?: CalorieValueSource;

  nutritionBasis: {
    amount: number;
    unit: 'g' | 'ml' | 'serving';
    servingDescription?: string;
  };

  nutrition: NutritionValues;
  portionOptions: FoodPortionOption[];
  densityGramsPerMl?: number | null;
  icon?: string;

  createdAt: string;
  updatedAt: string;
}

export interface LoggedFoodPortion {
  foodId: string;
  quantity: number;
  unit: FoodUnit;
  baseAmount: number;
  baseUnit: 'g' | 'ml' | 'serving';
  servingDescription: string;
}

export interface RecentFoodEntry {
  foodId: string;
  lastUsedAt: string;
  useCount: number;
  lastPortion: LoggedFoodPortion;
  lastMealType: MealType;
}

export interface PersistedAppData {
  schemaVersion: number;
  customFoods: FoodDefinition[];
  recentFoods: RecentFoodEntry[];
  meals: MealItem[];
  waterByDate?: Record<string, number>;
  burnedByDate?: Record<string, number>;
  userProfile?: UserProfile;
  userPreferences?: UserPreferences;
  weightHistory?: WeightEntry[];
  eatingSchedule?: EatingSchedule;
  nutritionGoals?: NutritionGoals;
  workoutHistory?: WorkoutHistoryEntry[];
  onboardingState?: OnboardingState;
  onboardingDraft?: OnboardingDraft;
  weeklyFitnessTemplate?: WeeklyProgramTemplate | null;
  scheduledWorkouts?: Record<string, ScheduledWorkout>;
}

export interface MealItem {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  mealType: MealType;

  // New portion & snapshot specifications
  foodId?: string;
  foodName: string;
  portion: LoggedFoodPortion;
  nutritionSnapshot: NutritionValues;
  foodSource?: 'built_in' | 'custom' | 'database' | 'demo' | 'quick_log';
  loggedAt: string;

  // Preserved for backwards compatibility with existing views
  name: string;
  category: string;
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fat: number;     // in grams
  icon: string;
  confidence?: number;
  ingredients?: string[];
  imageUrl?: string;
  micronutrients?: MicronutrientProfile;
}

export interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Workout Types & Interfaces
export type WorkoutCategory = 'Full Body' | 'Push Day' | 'Pull Day' | 'Leg Day';

export interface ExerciseSet {
  setNumber: number;
  targetReps: number;
  actualReps: number;
  weightKg: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  muscleGroup: string;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
  sets: ExerciseSet[];
}

export interface WorkoutPreset {
  id: string;
  title: WorkoutCategory;
  subtitle: string;
  primaryMuscles: string;
  estimatedMinutes: number;
  intensity: 'Moderate' | 'High' | 'Very High';
  icon: string;
  exercises: {
    name: string;
    muscleGroup: string;
    defaultSets: number;
    defaultReps: number;
    restSeconds: number;
  }[];
}

// Fitness Planner Types
export type FitnessPlannerMode = 'workouts' | 'program';

export type PlannedWorkoutType =
  | { type: 'preset'; presetId: string }
  | { type: 'rest' };

export type WeekdayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = Monday ... 7 = Sunday

export interface WeeklyProgramTemplate {
  id: string;
  name: string;
  days: Partial<Record<WeekdayNumber, PlannedWorkoutType>>;
  createdAt: string;
  updatedAt: string;
}

export type ScheduledWorkoutStatus = 'planned' | 'completed' | 'missed' | 'rest' | 'unplanned';

export interface ScheduledWorkout {
  dateKey: string; // YYYY-MM-DD
  workout: PlannedWorkoutType;
  source: 'weekly_repeat' | 'manual_override';
  templateId?: string;
  notes?: string;
}

export interface ActiveWorkoutSessionState {
  presetId: string;
  presetTitle: string;
  startTime: number; // unix timestamp in ms
  startedAt: string; // ISO string
  elapsedSeconds: number;
  isPaused: boolean;
  currentExerciseIndex: number;
  exercises: WorkoutExercise[];
  restTimerSeconds: number | null;
  restTimerTotal: number;
  scheduledDate?: string; // YYYY-MM-DD if started from planned routine
}

export interface CompletedSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  completedAt?: string;
  restSeconds?: number;
  isPersonalRecord?: boolean;
}

export interface CompletedExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroups: string;
  sets: CompletedSet[];
}

export interface WorkoutHistoryEntry {
  id: string;
  name: string;
  workoutType: string;
  status: 'completed' | 'incomplete';
  startedAt: string;
  finishedAt?: string;
  durationSeconds: number;
  exercises: CompletedExercise[];
  completedSetCount: number;
  totalVolume: number;
  estimatedCalories: number | null;
  scheduledDate?: string; // YYYY-MM-DD if associated with a scheduled routine date
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  weightKg: number;
  reps: number;
  estimatedOneRepMax: number;
  achievedAt: string;
  workoutId: string;
  workoutName: string;
  previousRecordValue?: number;
  previousAchievedAt?: string;
  totalTimesPerformed: number;
}

export interface ExerciseHistoryOccurrence {
  workoutId: string;
  workoutName: string;
  date: string;
  completedSetsCount: number;
  totalExerciseVolume: number;
  bestSet: {
    weightKg: number;
    reps: number;
  };
  sets: CompletedSet[];
  hasPR: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  time: string;
  actionChips?: string[];
}

export interface ScannedFood {
  name: string;
  subtitle: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  glycemicIndex: 'Low' | 'Medium' | 'High';
  ingredients: string[];
  suggestedMealType: MealType;
  imageUrl?: string;
  micronutrients?: MicronutrientProfile;
}

export interface CatalogFoodItem {
  id: string;
  name: string;
  category: string;
  servingUnit: string;
  defaultServingSize: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  glycemicIndex: 'Low' | 'Medium' | 'High';
  suggestedMealType: MealType;
  icon: string;
  description?: string;
  micronutrients?: MicronutrientProfile;
}

/**
 * Single-location interface contract for future AI Food Analysis API.
 * Production flow: Mobile app → NutriAI backend → AI provider / food database.
 */
export interface FoodAnalysisResult {
  foodName: string;
  servingDescription: string;
  servingWeightGrams?: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  ingredients: string[];
  micronutrients: MicronutrientProfile;
  overallConfidence?: number | null;
  warnings?: string[];
}

export type FitnessSubView = 'home' | 'setup' | 'active' | 'summary';

export type ActiveNutrientModalSource = 
  | { type: 'scanned' } 
  | { type: 'meal'; mealId: string } 
  | { type: 'catalog'; catalogId: string } 
  | null;

export type DashboardWidgetId = 'energy' | 'macros' | 'hydration' | 'coach' | 'meals';

export interface AppState {
  currentScreen: ActiveScreen;
  theme: 'light' | 'dark';
  streakDays: number;
  selectedDate: string; // YYYY-MM-DD synced with device
  waterTarget: number;
  calorieTarget: number;
  waterByDate: Record<string, number>;
  burnedByDate: Record<string, number>;
  meals: MealItem[];
  chatHistory: ChatMessage[];
  lastScannedFood: ScannedFood | null;
  quickActionOpen: boolean;
  quickAddOpen: boolean;
  dashboardWidgetOrder: DashboardWidgetId[];
  hiddenDashboardWidgets: DashboardWidgetId[];
  dashboardWidgetDrawerOpen: boolean;

  // Scanner Mode
  scannerMode: 'food' | 'barcode';

  // Fitness Workout Flow State
  fitnessSubView: FitnessSubView;
  fitnessPlannerMode: FitnessPlannerMode;
  weeklyFitnessTemplate: WeeklyProgramTemplate | null;
  scheduledWorkouts: Record<string, ScheduledWorkout>;
  plannerCalendarYear: number;
  plannerCalendarMonth: number;
  selectedPlannerDate: string | null;
  plannerDetailModalOpen: boolean;
  plannerWeeklyEditorOpen: boolean;
  plannerConfirmOverwriteMonth: { year: number; month: number } | null;
  plannerToastMessage: string | null;
  selectedPresetId: string | null;
  draftWorkout: WorkoutExercise[] | null;
  activeWorkout: ActiveWorkoutSessionState | null;
  lastWorkoutSummary: WorkoutHistoryEntry | null;
  workoutHistory: WorkoutHistoryEntry[];

  // Inspection Selection State
  selectedWorkoutHistoryId: string | null;
  selectedPersonalRecordExerciseId: string | null;
  deleteConfirmationWorkoutId: string | null;

  // Insights & Search State
  selectedInsightRange: 7 | 30 | 90;
  selectedInsightTab: 'calories' | 'macros';
  recentFoodSearches: string[];
  selectedFoodForSearch: CatalogFoodItem | null;
  foodSearchServingMultiplier: number;
  foodSearchMealType: MealType;

  // Micronutrients & Modals State
  selectedMealDetailId: string | null;
  activeNutrientModalSource: ActiveNutrientModalSource;
  nutrientModalCategoryFilter: 'all' | 'vitamins' | 'minerals' | 'other';
  selectedInsightNutrientCategory: 'all' | 'vitamins' | 'minerals' | 'other';

  // Custom Foods, Recent Foods & Portion Management
  customFoods: FoodDefinition[];
  recentFoods: RecentFoodEntry[];
  foodSearchTab: 'recent' | 'myFoods' | 'allFoods';
  isSetPortionOpen: boolean;
  activePortionFood: FoodDefinition | null;
  activePortionQuantity: number;
  activePortionUnit: FoodUnit;
  activePortionMealType: MealType;
  activePortionDate: string;
  activePortionTime: string;
  isCustomFoodModalOpen: boolean;
  editingCustomFoodId: string | null;

  // Custom Food 4-Step Wizard State
  customFoodStep: 1 | 2 | 3 | 4;
  customFoodDraft: CustomFoodDraft;
  customFoodValidationErrors: Record<string, string>;
  customFoodDraftDirty: boolean;
  customFoodShowDiscardConfirm: boolean;
  customFoodDuplicateWarning: { message: string; duplicateFood?: FoodDefinition } | null;
  customFoodIsSaving: boolean;

  // Diary Date & Calendar Navigation State
  diaryCalendarOpen: boolean;
  diaryCalendarDraftDate: string;
  visibleDiaryWeekStart: string; // YYYY-MM-DD Monday of visible weekly strip
  calendarViewYear: number;
  calendarViewMonth: number; // 1..12
  calendarPickerMode: 'days' | 'monthYear';

  // Profile & Settings State
  profileSubpage: ProfileSubpage | null;
  userProfile: UserProfile;
  userPreferences: UserPreferences;
  weightHistory: WeightEntry[];
  eatingSchedule: EatingSchedule;
  nutritionGoals: NutritionGoals;
  profileConfirmModal: ProfileConfirmModalState | null;
  weightModalOpen: boolean;
  editingWeightEntry: WeightEntry | null;

  // Onboarding State
  onboardingState: OnboardingState;
  onboardingDraft: OnboardingDraft;
  profileImageUrl: string | null;
}

export interface CustomFoodDraft {
  // Step 1: Basic Info
  name: string;
  brand: string;
  category: string;
  barcode: string;

  // Step 2: Nutrition Basis
  basisType: 'per_100g' | 'per_100ml' | 'per_serving';
  basisAmount: number;
  basisUnit: 'g' | 'ml' | 'serving';
  servingDescription: string;
  servingQuantity: number;
  servingUnit: FoodUnit;
  servingEquivalentAmount: number | null;
  servingEquivalentUnit: 'g' | 'ml';

  // Step 3: Nutrition
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;

  // 4-4-9 Calculation & Consistency Tracking
  calorieSource: CalorieValueSource;
  caloriesSyncedWithMacros: boolean;
  calorieWarningAcknowledged: boolean;

  // Micronutrients (Optional)
  vitaminC: number | null;
  vitaminD: number | null;
  calcium: number | null;
  iron: number | null;
  potassium: number | null;
  magnesium: number | null;
  isMicronutrientsExpanded: boolean;

  // Step 4: Portion Options
  portionOptions: FoodPortionOption[];
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'ft_in';
export type WeekStart = 'monday' | 'sunday';
export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very_active'
  | 'athlete';

export type WeightGoalType = 'lose' | 'maintain' | 'gain';

// Discrete weekly weight rate values (signed: negative = lose, positive = gain)
export type WeeklyWeightRate = -0.75 | -0.50 | -0.25 | 0 | 0.25 | 0.50 | 0.75;

export const VALID_WEEKLY_RATES: WeeklyWeightRate[] = [-0.75, -0.50, -0.25, 0, 0.25, 0.50, 0.75];

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export interface OnboardingState {
  status: OnboardingStatus;
  currentStep: number; // 1–6
  completedAt?: string | null;
  /** Stable ID generated when onboarding completes. Used for idempotency of initial weight entry. */
  completionId?: string | null;
}

export interface OnboardingDraft {
  weightDirection: WeeklyWeightRate | null;
  biologicalSex: 'female' | 'male' | 'prefer_not_to_say' | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  dateOfBirth: string | null;
  displayName: string;
  activityLevel: ActivityLevel | null;
  profileImageRef: string | null;
  heightUnit: HeightUnit;
  weightUnit: WeightUnit;
}

export interface UserProfile {
  displayName: string;
  dateOfBirth?: string | null;
  biologicalSex?: 'female' | 'male' | 'other' | 'prefer_not_to_say' | null;
  heightCm?: number | null;
  currentWeightKg?: number | null;
  weightGoalType?: WeightGoalType | null;
  targetWeightKg?: number | null;
  targetDate?: string | null;
  /** Signed kg/week: negative for lose, positive for gain, 0 for maintain */
  weeklyGoalRateKg?: number | null;
  activityLevel?: ActivityLevel | null;
  /** True only when profile was explicitly set by the user (not demo/default data) */
  profileSetupCompleted?: boolean;
}

export interface UserPreferences {
  theme: ThemePreference;
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  preferredMassUnit: 'g' | 'oz';
  preferredVolumeUnit: 'ml' | 'cup';
  weekStart: WeekStart;
  language: string;
  reduceMotion: boolean;
  hapticFeedback: boolean;
  marketingConsent: boolean;
  marketingConsentUpdatedAt?: string | null;
}

export interface WeightEntry {
  id: string;
  weightKg: number; // Canonical base weight in kilograms
  date: string;     // YYYY-MM-DD
  time: string;     // HH:mm
  recordedAt: string; // ISO string
  note?: string;
}

export interface EatingSchedule {
  enabled: boolean;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  daysOfWeek: number[]; // 1 = Mon ... 7 = Sun
  remindersEnabled?: boolean;
}

export interface NutritionGoals {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTarget: number;
}

export type ProfileSubpage =
  | 'personal_info'
  | 'weight_goal'
  | 'nutrition_goals'
  | 'activity_level'
  | 'weight_history'
  | 'eating_schedule'
  | 'health_connections'
  | 'app_settings'
  | 'whats_new'
  | 'feedback'
  | 'help_center'
  | 'terms_of_use'
  | 'privacy_policy'
  | 'marketing_consent'
  | 'health_disclaimer'
  | 'data_privacy';

export interface ProfileConfirmModalState {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColorClass?: string;
  requireTypingText?: string;
  onConfirm: () => void;
}

export interface ProfileMenuItem {
  id: string;
  label: string;
  description?: string;
  icon: string;
  action: string;
  status?: string;
  external?: boolean;
  disabled?: boolean;
}
