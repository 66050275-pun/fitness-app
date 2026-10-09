import './index.css';
import { store } from './store/appState';
import { ActiveScreen, DashboardWidgetId, MealType } from './types/index.ts';
import { renderBottomNav } from './components/Navigation/BottomNav';
import { renderQuickActionModal } from './components/Modals/QuickActionModal';
import { renderQuickAddBottomSheet } from './components/BottomSheets/QuickAddBottomSheet';
import { renderDashboardScreen } from './screens/DashboardScreen';
import { renderScannerScreen } from './screens/ScannerScreen';
import { renderFoodResultScreen } from './screens/FoodResultScreen';
import { renderDiaryScreen } from './screens/DiaryScreen';
import { renderAICoachScreen } from './screens/AICoachScreen';
import { renderFitnessScreen } from './screens/FitnessScreen';
import { renderProfileScreen } from './screens/ProfileScreen';
import { renderWorkoutDetailScreen } from './screens/WorkoutDetailScreen';
import { renderPersonalRecordDetailScreen } from './screens/PersonalRecordDetailScreen';
import { renderDeleteWorkoutModal } from './components/Modals/DeleteWorkoutModal';
import { renderMealDetailModal } from './components/Modals/MealDetailModal';
import { renderNutrientDetailModal } from './components/Modals/NutrientDetailModal';
import { renderSetPortionModal } from './components/Modals/SetPortionModal';
import { renderCustomFoodModal } from './components/Modals/CustomFoodModal';
import { renderDiaryCalendarModal } from './components/Modals/DiaryCalendarModal';
import { renderPersonalInformationScreen } from './screens/profile/PersonalInformationScreen';
import { renderWeightGoalScreen } from './screens/profile/WeightGoalScreen';
import { renderNutritionGoalsScreen } from './screens/profile/NutritionGoalsScreen';
import { renderActivityLevelScreen } from './screens/profile/ActivityLevelScreen';
import { renderWeightHistoryScreen } from './screens/profile/WeightHistoryScreen';
import { renderEatingScheduleScreen } from './screens/profile/EatingScheduleScreen';
import { renderHealthConnectionsScreen } from './screens/profile/HealthConnectionsScreen';
import { renderAppSettingsScreen } from './screens/profile/AppSettingsScreen';
import { renderWhatsNewScreen } from './screens/profile/WhatsNewScreen';
import { renderFeedbackScreen } from './screens/profile/FeedbackScreen';
import { renderHelpCenterScreen } from './screens/profile/HelpCenterScreen';
import { renderLegalDocumentScreen } from './screens/profile/LegalDocumentScreen';
import { renderMarketingConsentScreen } from './screens/profile/MarketingConsentScreen';
import { renderDataPrivacyScreen } from './screens/profile/DataPrivacyScreen';
import { renderProfileConfirmationModal } from './components/Modals/ProfileConfirmationModal';
import { renderWeightEntryModal } from './components/Modals/WeightEntryModal';
import { renderInsightsScreen } from './screens/InsightsScreen';
import { renderFoodSearchScreen, renderFoodDefinitionCard } from './screens/FoodSearchScreen';
import { renderQuickLogScreen } from './screens/QuickLogScreen';
import { getUnitDimension } from './utils/portionCalculations';
import { escapeHtml } from './utils/sanitize';
import { 
  NutrientFilterCategory, 
  FoodDefinition, 
  LoggedFoodPortion, 
  FoodUnit,
  ProfileSubpage,
  ThemePreference,
  WeightUnit,
  HeightUnit,
  WeekStart,
  ActivityLevel,
  WeightGoalType,
  FitnessPlannerMode,
  WeekdayNumber
} from './types/index.ts';
import { lbToKg, kgToLb, ftInToCm } from './utils/unitConversions';
import { calculateCaloriesFromMacros } from './utils/calorieCalculations';
import { APP_METADATA, HELP_CENTER_FAQS } from './data/appConfig';
import { renderOnboardingScreen, getOnboardingGoalPreview } from './screens/onboarding/OnboardingScreen';
import { deleteProfileImage, resizeProfileImage, saveProfileImage, validateProfileImage } from './utils/profileImageStorage';

// Declare global window functions for HTML click handlers
declare global {
  interface Window {
    navigateApp: (screen: ActiveScreen) => void;
    toggleTheme: () => void;
    addWater: (dateKey?: string) => void;
    removeWater: (dateKey?: string) => void;
    deleteMeal: (id: string) => void;
    logCurrentFood: () => void;
    toggleQuickActions: (open?: boolean) => void;
    toggleDashboardWidgetDrawer: (open?: boolean) => void;
    moveDashboardWidget: (widgetId: DashboardWidgetId, direction: -1 | 1) => void;
    toggleDashboardWidget: (widgetId: DashboardWidgetId) => void;
    selectDate: (dateKey: string) => void;
    sendPrompt: (text: string) => void;
    submitChat: () => void;
    clearChat: () => void;
    selectedMealType: MealType;

    // Fitness Workout Flow handlers
    selectWorkoutType: (presetId: string) => void;
    cancelWorkoutSetup: () => void;
    updateDraftSets: (exerciseIndex: number, delta: number) => void;
    updateDraftReps: (exerciseIndex: number, delta: number) => void;
    removeDraftExercise: (exerciseIndex: number) => void;
    addExerciseToDraft: (name: string, muscleGroup: string, sets?: number, reps?: number, restSeconds?: number) => void;
    startWorkout: () => void;
    togglePauseWorkout: () => void;
    updateActiveSetInput: (exerciseIndex: number, setIndex: number, weightVal: string | null, repsVal: string | null) => void;
    completeActiveSet: (exerciseIndex: number, setIndex: number) => void;
    skipRestTimer: () => void;
    nextActiveExercise: () => void;
    prevActiveExercise: () => void;
    finishActiveWorkout: () => void;
    saveWorkoutSummary: () => void;
    discardWorkoutSummary: () => void;
    cancelActiveWorkout: (force?: boolean) => void;

    // Inspection & Personal Record Detail handlers
    openWorkoutDetail: (workoutId: string) => void;
    closeWorkoutDetail: () => void;
    openPersonalRecordDetail: (exerciseIdOrName: string) => void;
    closePersonalRecordDetail: () => void;
    repeatWorkout: (workoutId: string) => void;
    openDeleteModal: (workoutId: string) => void;
    closeDeleteModal: () => void;
    confirmDeleteWorkout: () => void;

    // Fitness Planner handlers
    setFitnessPlannerMode: (mode: FitnessPlannerMode) => void;
    nextPlannerMonth: () => void;
    prevPlannerMonth: () => void;
    goToPlannerTodayMonth: () => void;
    openPlannerDateDetail: (dateKey: string) => void;
    closePlannerDateDetail: () => void;
    openWeeklyProgramEditor: () => void;
    closeWeeklyProgramEditor: () => void;
    handleWeeklyDaySelect: (dayNum: number, value: string) => void;
    applyWeeklyToCurrentWeek: () => void;
    applyWeeklyToMonth: (year: number, month: number) => void;
    confirmPlannerOverwrite: (year: number, month: number) => void;
    cancelPlannerOverwrite: () => void;
    saveWeeklyRoutineOnly: () => void;
    startScheduledWorkout: (dateKey: string, presetId: string) => void;
    handleDateWorkoutOverride: (dateKey: string, value: string) => void;
    removeScheduledWorkout: (dateKey: string) => void;
    openWorkoutHistoryDetail: (workoutId: string) => void;
    confirmResetAllFitnessPrograms: () => void;

    // Quick Add & Bottom Sheet handlers
    toggleQuickAdd: (open?: boolean) => void;
    openQuickAdd: () => void;
    closeQuickAdd: () => void;

    // Insights Screen handlers
    setInsightRange: (range: 7 | 30 | 90) => void;
    setInsightTab: (tab: 'calories' | 'macros') => void;
    showDayDetailToast: (title: string, text: string) => void;

    // Scanner Mode
    openScannerMode: (mode: 'food' | 'barcode') => void;

    // Food Search & Catalog handlers
    filterFoodCatalog: (query: string) => void;
    clearRecentFoodSearches: () => void;
    selectFoodForLogging: (foodId: string | null) => void;
    updateFoodSearchServing: (delta: number) => void;
    setFoodSearchMealType: (type: MealType) => void;
    saveFoodSearchLog: () => void;

    // Portion Units & Custom Foods & Recent Foods
    openSetPortion: (foodOrId: string | FoodDefinition, initialPortion?: Partial<LoggedFoodPortion>, mealType?: MealType, dateKey?: string, timeStr?: string) => void;
    closeSetPortionModal: () => void;
    setPortionQuantity: (qty: number) => void;
    setPortionUnit: (unit: string) => void;
    setPortionQuickOption: (qty: number, unit: string) => void;
    setPortionMealType: (type: MealType) => void;
    setPortionDate: (date: string) => void;
    setPortionTime: (time: string) => void;
    confirmAddPortionToDiary: () => void;

    openCreateCustomFood: (editingFoodId?: string) => void;
    closeCustomFoodModal: () => void;
    cancelDiscardCustomFood: () => void;
    confirmDiscardCustomFood: () => void;
    nextCustomFoodStep: () => void;
    prevCustomFoodStep: () => void;
    setCustomFoodStep: (step: number) => void;
    setCustomFoodBasisType: (basisType: 'per_100g' | 'per_100ml' | 'per_serving') => void;
    updateCustomFoodDraftField: (fieldName: string, value: string) => void;
    updateCustomFoodDraftNumeric: (fieldName: string, rawValue: string) => void;
    toggleDraftMicronutrients: () => void;
    calculateCustomFoodCalories: () => void;
    useCalculatedCustomFoodCalories: () => void;
    keepEnteredCustomFoodCalories: () => void;
    addCustomFoodDraftPortion: () => void;
    removeCustomFoodDraftPortion: (index: number) => void;
    saveCustomFoodDraft: () => void;
    useExistingFoodFromDuplicate: (foodId: string) => void;
    confirmDeleteCustomFood: (foodName?: string) => void;

    setFoodSearchTab: (tab: 'recent' | 'myFoods' | 'allFoods') => void;
    handleFoodSearchInput: (query: string) => void;
    removeRecentFood: (foodId: string) => void;
    clearRecentFoods: () => void;
    addAgainMeal: (mealId: string) => void;

    // Quick Log Form handler
    submitQuickLog: () => void;

    // Meal Detail & Micronutrient Detail handlers
    openMealDetail: (mealId: string) => void;
    closeMealDetail: () => void;
    openNutrientsFromScanned: () => void;
    openNutrientsFromMeal: (mealId: string) => void;
    openNutrientsFromCatalog: (catalogId: string) => void;
    closeNutrientModal: () => void;
    setNutrientCategoryFilter: (category: NutrientFilterCategory) => void;
    filterNutrientList: (query: string) => void;
    setInsightNutrientCategory: (category: NutrientFilterCategory) => void;

    // Diary Calendar Date Navigation
    openDiaryCalendar: () => void;
    closeDiaryCalendar: () => void;
    setDiaryCalendarDraftDate: (dateKey: string) => void;
    applyDiaryCalendarDate: (overrideDateKey?: string) => void;
    goToToday: () => void;
    goToPreviousWeek: () => void;
    goToNextWeek: () => void;
    setCalendarViewMonth: (year: number, month: number) => void;
    setCalendarViewYear: (year: number) => void;
    changeCalendarMonth: (deltaMonths: number) => void;
    setCalendarPickerMode: (mode: 'days' | 'monthYear') => void;

    // Profile Sub-navigation & Settings
    openProfileSubpage: (subpage: ProfileSubpage, param?: string) => void;
    goBackFromProfileSubpage: () => void;
    showAvatarInfoModal: () => void;
    shareNutriAI: () => void;

    // Personal Information
    setPersonalHeightUnit: (unit: HeightUnit) => void;
    setPersonalWeightUnit: (unit: WeightUnit) => void;
    submitPersonalInfo: () => void;

    // Weight Goal
    selectWeightGoalType: (type: WeightGoalType) => void;
    selectWeeklyRate: (rate: number) => void;
    updateWeightGoalPreview: () => void;
    submitWeightGoal: () => void;

    // Nutrition Goals
    syncCaloriesFromMacroTargets: () => void;
    submitNutritionGoals: () => void;
    confirmResetNutritionGoals: () => void;

    // Activity Level
    selectActivityTier: (level: ActivityLevel, suggestedTdee: number) => void;
    dismissActivitySuggestion: () => void;
    applySuggestedCalorieTarget: () => void;
    saveActivityLevel: () => void;

    // Weight History & Weight Modal
    toggleWeightDisplayUnit: (unit: WeightUnit) => void;
    openWeightModal: (entryId?: string) => void;
    closeWeightModal: () => void;
    editWeightEntry: (id: string) => void;
    setWeightModalUnit: (unit: WeightUnit) => void;
    submitWeightEntry: () => void;
    confirmDeleteWeightEntry: (id: string) => void;

    // Eating Schedule
    toggleEatingWindowEnabled: () => void;
    toggleEatingDay: (dayId: number) => void;
    toggleEatingReminders: () => void;
    submitEatingSchedule: () => void;

    // App Settings
    setAppTheme: (theme: ThemePreference) => void;
    setAppWeightUnit: (unit: WeightUnit) => void;
    setAppMassUnit: (unit: 'g' | 'oz') => void;
    setAppVolumeUnit: (unit: 'ml' | 'cup') => void;
    setAppWeekStart: (start: WeekStart) => void;
    setAppLanguage: (lang: string) => void;
    toggleAppReduceMotion: () => void;
    toggleAppHapticFeedback: () => void;
    confirmResetPreferences: () => void;

    // Feedback
    saveFeedbackDraft: () => void;
    toggleFeedbackDiagnostics: () => void;
    copyFeedbackText: () => void;
    clearFeedbackDraft: () => void;

    // Help Center
    filterFaqList: (query: string) => void;

    // Marketing Consent
    toggleMarketingConsent: () => void;

    // Data & Privacy / Deletions
    exportAppData: () => void;
    confirmDeleteFoodHistory: () => void;
    confirmDeleteWorkoutHistory: () => void;
    confirmDeleteWeightHistory: () => void;
    confirmDeleteAllLocalData: () => void;
    closeProfileConfirmModal: () => void;
    executeProfileConfirmModalAction: () => void;

    // First-launch onboarding & profile photo
    onboardingNext: () => void;
    onboardingBack: () => void;
    onboardingSkip: () => void;
    selectOnboardingRate: (rate: number) => void;
    selectOnboardingActivity: (level: ActivityLevel) => void;
    toggleOnboardingHeightUnit: () => void;
    toggleOnboardingWeightUnit: () => void;
    handleProfilePhotoSelected: (input: HTMLInputElement) => void;
    removeProfilePhoto: () => void;
    restartGoalSetup: () => void;
  }
}

window.selectedMealType = 'dinner';

window.navigateApp = (screen: ActiveScreen) => {
  store.setScreen(screen);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.toggleTheme = () => {
  store.toggleTheme();
};

window.addWater = (dateKey?: string) => {
  store.addWater(dateKey);
};

window.removeWater = (dateKey?: string) => {
  store.removeWater(dateKey);
};

window.deleteMeal = (id: string) => {
  store.deleteMeal(id);
};

window.logCurrentFood = () => {
  const { lastScannedFood } = store.getState();
  if (!lastScannedFood) {
    store.setScreen('diary');
    return;
  }

  const foodDef: FoodDefinition = {
    id: `scanned-${lastScannedFood.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: lastScannedFood.name,
    brand: lastScannedFood.subtitle,
    category: 'Scanned Food',
    source: 'demo',
    nutritionBasis: {
      amount: 1,
      unit: 'serving',
      servingDescription: '1 prepared serving'
    },
    nutrition: {
      calories: lastScannedFood.calories,
      protein: lastScannedFood.protein,
      carbs: lastScannedFood.carbs,
      fat: lastScannedFood.fat,
      micronutrients: lastScannedFood.micronutrients
    },
    portionOptions: [
      { id: 'scanned-1s', label: '1 serving', unit: 'serving', dimension: 'serving', quantity: 1, equivalentBaseAmount: 1, equivalentBaseUnit: 'g' },
      { id: 'scanned-half', label: '0.5 serving', unit: 'serving', dimension: 'serving', quantity: 0.5, equivalentBaseAmount: 0.5, equivalentBaseUnit: 'g' },
      { id: 'scanned-double', label: '2 servings', unit: 'serving', dimension: 'serving', quantity: 2, equivalentBaseAmount: 2, equivalentBaseUnit: 'g' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.openSetPortion(
    foodDef,
    { quantity: 1, unit: 'serving' },
    window.selectedMealType || lastScannedFood.suggestedMealType
  );
};

window.toggleQuickActions = (open?: boolean) => {
  store.toggleQuickActions(open);
};

window.toggleDashboardWidgetDrawer = (open?: boolean) => {
  store.toggleDashboardWidgetDrawer(open);
};

window.moveDashboardWidget = (widgetId: DashboardWidgetId, direction: -1 | 1) => {
  store.moveDashboardWidget(widgetId, direction);
};

window.toggleDashboardWidget = (widgetId: DashboardWidgetId) => {
  store.toggleDashboardWidget(widgetId);
};

window.selectDate = (dateKey: string) => {
  store.selectDate(dateKey);
};

window.openDiaryCalendar = () => {
  store.openDiaryCalendar();
};

window.closeDiaryCalendar = () => {
  store.closeDiaryCalendar();
};

window.setDiaryCalendarDraftDate = (dateKey: string) => {
  store.setDiaryCalendarDraftDate(dateKey);
};

window.applyDiaryCalendarDate = (overrideDateKey?: string) => {
  store.applyDiaryCalendarDate(overrideDateKey);
};

window.goToToday = () => {
  store.goToToday();
};

window.goToPreviousWeek = () => {
  store.goToPreviousWeek();
};

window.goToNextWeek = () => {
  store.goToNextWeek();
};

window.setCalendarViewMonth = (year: number, month: number) => {
  store.setCalendarViewMonth(year, month);
};

window.setCalendarViewYear = (year: number) => {
  store.setCalendarViewYear(year);
};

window.changeCalendarMonth = (deltaMonths: number) => {
  store.changeCalendarMonth(deltaMonths);
};

window.setCalendarPickerMode = (mode: 'days' | 'monthYear') => {
  store.setCalendarPickerMode(mode);
};

window.sendPrompt = (text: string) => {
  store.sendChatMessage(text);
  const container = document.getElementById('chat-messages-container');
  if (container) {
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }
};

window.submitChat = () => {
  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  if (input && input.value.trim()) {
    store.sendChatMessage(input.value.trim());
    input.value = '';
    const container = document.getElementById('chat-messages-container');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);
    }
  }
};

window.clearChat = () => {
  store.getState().chatHistory = [];
  store.setScreen('coach');
};

// ==========================================
// FITNESS WORKOUT FLOW BINDINGS
// ==========================================
window.selectWorkoutType = (presetId: string) => {
  store.selectWorkoutType(presetId);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.cancelWorkoutSetup = () => {
  store.cancelWorkoutSetup();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.updateDraftSets = (exerciseIndex: number, delta: number) => {
  store.updateDraftSets(exerciseIndex, delta);
};

window.updateDraftReps = (exerciseIndex: number, delta: number) => {
  store.updateDraftReps(exerciseIndex, delta);
};

window.removeDraftExercise = (exerciseIndex: number) => {
  store.removeDraftExercise(exerciseIndex);
};

window.addExerciseToDraft = (name: string, muscleGroup: string, sets?: number, reps?: number, restSeconds?: number) => {
  store.addExerciseToDraft(name, muscleGroup, sets, reps, restSeconds);
  const accordion = document.getElementById('add-exercise-accordion');
  if (accordion) accordion.classList.add('hidden');
};

window.startWorkout = () => {
  store.startWorkout();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.togglePauseWorkout = () => {
  store.togglePauseActiveWorkout();
};

window.updateActiveSetInput = (exerciseIndex: number, setIndex: number, weightVal: string | null, repsVal: string | null) => {
  const state = store.getState();
  if (!state.activeWorkout) return;
  const currentSet = state.activeWorkout.exercises[exerciseIndex]?.sets[setIndex];
  if (!currentSet) return;

  const newWeight = weightVal !== null ? parseFloat(weightVal) || 0 : currentSet.weightKg;
  const newReps = repsVal !== null ? parseInt(repsVal, 10) || 0 : currentSet.actualReps;
  store.updateActiveSetData(exerciseIndex, setIndex, newWeight, newReps);
};

window.completeActiveSet = (exerciseIndex: number, setIndex: number) => {
  store.completeActiveSet(exerciseIndex, setIndex);
};

window.skipRestTimer = () => {
  store.skipRestTimer();
};

window.nextActiveExercise = () => {
  store.nextActiveExercise();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.prevActiveExercise = () => {
  store.prevActiveExercise();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.finishActiveWorkout = () => {
  store.finishActiveWorkout();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.saveWorkoutSummary = () => {
  store.saveWorkoutSummary();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.discardWorkoutSummary = () => {
  store.discardWorkoutSummary();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.cancelActiveWorkout = (force?: boolean) => {
  store.cancelActiveWorkout(force);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

// ==========================================
// WORKOUT DETAIL & PERSONAL RECORD BINDINGS
// ==========================================
window.openWorkoutDetail = (workoutId: string) => {
  store.openWorkoutDetail(workoutId);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.closeWorkoutDetail = () => {
  store.closeWorkoutDetail();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.openPersonalRecordDetail = (exerciseIdOrName: string) => {
  store.openPersonalRecordDetail(exerciseIdOrName);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.closePersonalRecordDetail = () => {
  store.closePersonalRecordDetail();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.repeatWorkout = (workoutId: string) => {
  store.repeatWorkout(workoutId);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.openDeleteModal = (workoutId: string) => {
  store.openDeleteModal(workoutId);
};

window.closeDeleteModal = () => {
  store.closeDeleteModal();
};

window.confirmDeleteWorkout = () => {
  store.confirmDeleteWorkout();
};

// ==========================================
// FITNESS PLANNER BINDINGS
// ==========================================
window.setFitnessPlannerMode = (mode: FitnessPlannerMode) => {
  store.setFitnessPlannerMode(mode);
};

window.nextPlannerMonth = () => {
  store.nextPlannerMonth();
};

window.prevPlannerMonth = () => {
  store.prevPlannerMonth();
};

window.goToPlannerTodayMonth = () => {
  store.goToPlannerCurrentMonth();
};

window.openPlannerDateDetail = (dateKey: string) => {
  store.openPlannerDateDetail(dateKey);
};

window.closePlannerDateDetail = () => {
  store.closePlannerDateDetail();
};

window.openWeeklyProgramEditor = () => {
  store.openWeeklyProgramEditor();
};

window.closeWeeklyProgramEditor = () => {
  store.closeWeeklyProgramEditor();
};

window.handleWeeklyDaySelect = (dayNum: number, value: string) => {
  const currentTemplate = store.getState().weeklyFitnessTemplate;
  const currentDays = { ...(currentTemplate?.days || {}) };
  const weekday = dayNum as WeekdayNumber;
  if (value === 'none') {
    delete currentDays[weekday];
  } else if (value === 'rest') {
    currentDays[weekday] = { type: 'rest' };
  } else {
    currentDays[weekday] = { type: 'preset', presetId: value };
  }
  store.saveWeeklyProgramTemplate(currentDays);
};

window.applyWeeklyToCurrentWeek = () => {
  store.applyWeeklyTemplateToCurrentWeek();
};

window.applyWeeklyToMonth = (year: number, month: number) => {
  store.applyWeeklyTemplateToMonth(year, month);
};

window.confirmPlannerOverwrite = (year: number, month: number) => {
  store.applyWeeklyTemplateToMonth(year, month, true);
};

window.cancelPlannerOverwrite = () => {
  store.cancelPlannerConfirmOverwrite();
};

window.saveWeeklyRoutineOnly = () => {
  store.closeWeeklyProgramEditor();
};

window.startScheduledWorkout = (dateKey: string, presetId: string) => {
  store.startWorkoutFromPlan(dateKey, presetId);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.handleDateWorkoutOverride = (dateKey: string, value: string) => {
  if (value === 'rest') {
    store.setScheduledWorkoutForDate(dateKey, { type: 'rest' });
  } else if (value) {
    store.setScheduledWorkoutForDate(dateKey, { type: 'preset', presetId: value });
  }
};

window.removeScheduledWorkout = (dateKey: string) => {
  store.removeScheduledWorkoutForDate(dateKey);
};

window.openWorkoutHistoryDetail = (workoutId: string) => {
  store.closePlannerDateDetail();
  store.openWorkoutDetail(workoutId);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.confirmResetAllFitnessPrograms = () => {
  store.openProfileConfirmModal({
    title: 'Reset All Programs?',
    message: 'This will remove your weekly routine and every scheduled workout from the calendar. Completed workout history and personal records will remain available.',
    confirmLabel: 'Reset Program',
    confirmColorClass: 'bg-rose-600 hover:bg-rose-700 text-white',
    onConfirm: () => {
      store.resetAllFitnessPrograms();
      store.closeProfileConfirmModal();
    }
  });
};

// ==========================================
// QUICK ADD & BOTTOM SHEET BINDINGS
// ==========================================
window.toggleQuickAdd = (open?: boolean) => {
  store.toggleQuickAdd(open);
};

window.openQuickAdd = () => {
  store.openQuickAdd();
};

window.closeQuickAdd = () => {
  store.closeQuickAdd();
};

// ==========================================
// INSIGHTS SCREEN BINDINGS
// ==========================================
window.setInsightRange = (range: 7 | 30 | 90) => {
  store.setInsightRange(range);
};

window.setInsightTab = (tab: 'calories' | 'macros') => {
  store.setInsightTab(tab);
};

window.showDayDetailToast = (title: string, text: string) => {
  const toast = document.getElementById('day-detail-toast');
  const toastText = document.getElementById('day-detail-toast-text');
  if (toast && toastText) {
    toastText.innerHTML = `<strong>${title}:</strong> ${text}`;
    toast.classList.remove('hidden');
  }
};

window.openScannerMode = (mode: 'food' | 'barcode') => {
  store.openScannerMode(mode);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

// ==========================================
// FOOD SEARCH, PORTIONS & RECENT FOOD BINDINGS
// ==========================================
window.filterFoodCatalog = (query: string) => {
  window.handleFoodSearchInput(query);
};

window.clearRecentFoodSearches = () => {
  store.clearRecentFoodSearches();
};

window.selectFoodForLogging = (foodId: string | null) => {
  if (!foodId) return;
  window.openSetPortion(foodId);
};

window.updateFoodSearchServing = (delta: number) => {
  store.updateFoodSearchServingMultiplier(delta);
};

window.setFoodSearchMealType = (type: MealType) => {
  store.setFoodSearchMealType(type);
};

window.saveFoodSearchLog = () => {
  const { selectedFoodForSearch } = store.getState();
  if (selectedFoodForSearch) {
    window.openSetPortion(selectedFoodForSearch.id);
  }
};

window.setFoodSearchTab = (tab: 'recent' | 'myFoods' | 'allFoods') => {
  store.setFoodSearchTab(tab);
};

window.handleFoodSearchInput = (query: string) => {
  const container = document.getElementById('food-search-content-area');
  if (!container) return;
  const q = query.trim().toLowerCase();

  if (!q) {
    // Re-render tab content
    store.setFoodSearchTab(store.getState().foodSearchTab);
    return;
  }

  const allMatched = store.searchFoods(q, undefined, 'allFoods');

  if (allMatched.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl border border-dashed border-outline-variant/40">
        <span class="material-symbols-outlined text-3xl text-on-surface-variant dark:text-gray-400 mb-1">search_off</span>
        <h4 class="font-heading font-bold text-sm text-on-surface dark:text-white">No Matching Foods Found</h4>
        <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-1">No foods match "${escapeHtml(q)}".</p>
        <button onclick="window.openCreateCustomFood()" class="mt-3 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs">
          + Create Custom Food
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="flex flex-col gap-2.5">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
          Search Matches (${allMatched.length})
        </span>
        <span class="text-[10px] text-on-surface-variant dark:text-gray-400">Tap to set portion</span>
      </div>
      <div class="flex flex-col gap-2">
        ${allMatched.map(f => renderFoodDefinitionCard(f)).join('')}
      </div>
    </div>
  `;
};

// ==========================================
// PORTION CONFIGURATOR & DIARY LOGGING
// ==========================================
window.openSetPortion = (foodOrId: string | FoodDefinition, initialPortion?: Partial<LoggedFoodPortion>, mealType?: MealType, dateKey?: string, timeStr?: string) => {
  let food: FoodDefinition | undefined;
  if (typeof foodOrId === 'string') {
    food = store.getFoodDefinitionById(foodOrId);
  } else {
    food = foodOrId;
  }

  if (!food) {
    console.warn('Food not found for set portion:', foodOrId);
    return;
  }

  store.openSetPortion(food, initialPortion, mealType, dateKey, timeStr);
};

window.closeSetPortionModal = () => {
  store.closeSetPortion();
};

window.setPortionQuantity = (qty: number) => {
  store.setPortionQuantity(qty);
};

window.setPortionUnit = (unit: string) => {
  store.setPortionUnit(unit as FoodUnit);
};

window.setPortionQuickOption = (qty: number, unit: string) => {
  store.setPortionQuantity(qty);
  store.setPortionUnit(unit as FoodUnit);
};

window.setPortionMealType = (type: MealType) => {
  store.setPortionMealType(type);
};

window.setPortionDate = (date: string) => {
  store.setPortionDate(date);
};

window.setPortionTime = (time: string) => {
  store.setPortionTime(time);
};

window.confirmAddPortionToDiary = () => {
  store.addSelectedFoodToDiary();
};

// ==========================================
// RECENT FOODS ACTIONS
// ==========================================
window.removeRecentFood = (foodId: string) => {
  store.removeRecentFood(foodId);
};

window.clearRecentFoods = () => {
  const confirmed = window.confirm('Are you sure you want to clear your recent foods list?');
  if (confirmed) {
    store.clearRecentFoods();
  }
};

window.addAgainMeal = (mealId: string) => {
  const meal = store.getState().meals.find(m => m.id === mealId);
  if (!meal) return;

  let food: FoodDefinition | undefined = meal.foodId ? store.getFoodDefinitionById(meal.foodId) : undefined;
  if (!food) {
    food = {
      id: meal.foodId || `legacy-${meal.id}`,
      name: meal.name,
      category: meal.category,
      source: (meal.foodSource === 'quick_log' ? 'custom' : meal.foodSource) || 'custom',
      nutritionBasis: {
        amount: meal.portion?.quantity || 1,
        unit: (meal.portion?.unit === 'g' || meal.portion?.unit === 'ml' ? meal.portion.unit : 'serving') as 'g' | 'ml' | 'serving',
        servingDescription: meal.portion?.servingDescription || '1 serving'
      },
      nutrition: {
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        micronutrients: meal.micronutrients
      },
      portionOptions: [
        {
          id: `opt-${meal.id}`,
          label: meal.portion?.servingDescription || '1 serving',
          unit: meal.portion?.unit || 'serving',
          dimension: 'serving',
          quantity: meal.portion?.quantity || 1,
          equivalentBaseAmount: meal.portion?.quantity || 1,
          equivalentBaseUnit: 'g'
        }
      ],
      createdAt: meal.loggedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Opens portion modal with latest portion prefilled, but date set to today/context and time to now
  if (food) {
    store.openSetPortion(food, meal.portion, meal.mealType);
  }
};

// ==========================================
// CUSTOM FOOD WIZARD ACTIONS
// ==========================================
window.openCreateCustomFood = (editingFoodId?: string) => {
  store.openCreateCustomFoodModal(editingFoodId);
};

window.closeCustomFoodModal = () => {
  store.closeCreateCustomFoodModal();
};

window.cancelDiscardCustomFood = () => {
  store.cancelDiscardCustomFood();
};

window.confirmDiscardCustomFood = () => {
  store.confirmDiscardCustomFood();
};

window.nextCustomFoodStep = () => {
  store.nextCustomFoodStep();
};

window.prevCustomFoodStep = () => {
  store.previousCustomFoodStep();
};

window.setCustomFoodStep = (step: number) => {
  store.setCustomFoodStep(step as 1 | 2 | 3 | 4);
};

window.setCustomFoodBasisType = (basisType: 'per_100g' | 'per_100ml' | 'per_serving') => {
  const amount = basisType === 'per_serving' ? 1 : 100;
  const unit = basisType === 'per_100ml' ? 'ml' : (basisType === 'per_serving' ? 'serving' : 'g');
  store.updateCustomFoodDraft({
    basisType,
    basisAmount: amount,
    basisUnit: unit
  }, true, true);
};

window.updateCustomFoodDraftField = (fieldName: string, value: string) => {
  store.updateCustomFoodDraft({ [fieldName]: value }, true, false);
};

window.updateCustomFoodDraftNumeric = (fieldName: string, rawValue: string) => {
  const trimmed = rawValue.trim();
  const val = trimmed === '' ? null : parseFloat(trimmed);
  store.updateCustomFoodDraft({ [fieldName]: val }, true, false);
};

window.toggleDraftMicronutrients = () => {
  store.toggleDraftMicronutrients();
};

window.calculateCustomFoodCalories = () => {
  store.calculateCustomFoodCalories();
};

window.useCalculatedCustomFoodCalories = () => {
  store.useCalculatedCustomFoodCalories();
};

window.keepEnteredCustomFoodCalories = () => {
  store.keepEnteredCustomFoodCalories();
};

window.addCustomFoodDraftPortion = () => {
  const qtyEl = document.getElementById('cf-new-portion-qty') as HTMLInputElement | null;
  const unitEl = document.getElementById('cf-new-portion-unit') as HTMLSelectElement | null;
  const equivEl = document.getElementById('cf-new-portion-equiv') as HTMLInputElement | null;
  if (!qtyEl || !unitEl || !equivEl) return;

  const qty = parseFloat(qtyEl.value);
  const unit = unitEl.value as FoodUnit;
  const equiv = parseFloat(equivEl.value);

  if (isNaN(qty) || qty <= 0 || isNaN(equiv) || equiv <= 0) {
    return;
  }

  const draft = store.getState().customFoodDraft;
  const baseUnit = draft.basisType === 'per_100ml' ? 'ml' : 'g';
  const label = `1 ${unit} (${equiv}${baseUnit})`;

  store.addDraftPortionOption({
    id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label,
    quantity: qty,
    unit,
    dimension: getUnitDimension(unit),
    equivalentBaseAmount: equiv,
    equivalentBaseUnit: baseUnit
  });

  qtyEl.value = '1';
  equivEl.value = '';
};

window.removeCustomFoodDraftPortion = (index: number) => {
  store.removeDraftPortionOption(index);
};

window.saveCustomFoodDraft = () => {
  store.saveCustomFoodDraft();
};

window.useExistingFoodFromDuplicate = (foodId: string) => {
  const food = store.getFoodDefinitionById(foodId);
  if (food) {
    store.closeCreateCustomFoodModal(true);
    store.openSetPortion(food);
  }
};

window.confirmDeleteCustomFood = (foodName?: string) => {
  const editId = store.getState().editingCustomFoodId;
  if (!editId) return;
  const name = foodName || 'this custom food';
  const confirmed = window.confirm(`Are you sure you want to delete "${name}"?\n\nHistorical diary entries will NOT be modified.`);
  if (confirmed) {
    store.deleteCustomFood(editId);
    store.closeCreateCustomFoodModal(true);
  }
};

// ==========================================
// QUICK LOG FORM BINDING
// ==========================================
window.submitQuickLog = () => {
  const nameEl = document.getElementById('ql-food-name') as HTMLInputElement | null;
  const calEl = document.getElementById('ql-calories') as HTMLInputElement | null;
  const proEl = document.getElementById('ql-protein') as HTMLInputElement | null;
  const carbEl = document.getElementById('ql-carbs') as HTMLInputElement | null;
  const fatEl = document.getElementById('ql-fat') as HTMLInputElement | null;
  const dateEl = document.getElementById('ql-date') as HTMLInputElement | null;
  const timeEl = document.getElementById('ql-time') as HTMLInputElement | null;
  const qtyEl = document.getElementById('ql-quantity') as HTMLInputElement | null;
  const unitEl = document.getElementById('ql-unit') as HTMLSelectElement | null;
  const servingEl = document.getElementById('ql-serving') as HTMLInputElement | null;
  const saveCheckbox = document.getElementById('ql-save-to-my-foods') as HTMLInputElement | null;

  const errorBanner = document.getElementById('quicklog-error-banner');
  const errorMsg = document.getElementById('quicklog-error-message');

  const foodName = nameEl?.value.trim() || '';
  const calories = calEl ? parseFloat(calEl.value) : NaN;
  const protein = proEl && proEl.value ? parseFloat(proEl.value) : 0;
  const carbs = carbEl && carbEl.value ? parseFloat(carbEl.value) : 0;
  const fat = fatEl && fatEl.value ? parseFloat(fatEl.value) : 0;
  const dateVal = dateEl?.value || store.getState().selectedDate;
  const timeVal = timeEl?.value.trim() || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const qtyVal = qtyEl ? parseFloat(qtyEl.value) || 1 : 1;
  const unitVal = (unitEl?.value || 'serving') as FoodUnit;
  const servingVal = servingEl?.value.trim() || `${qtyVal} ${unitVal}`;
  const shouldSaveToMyFoods = saveCheckbox?.checked || false;

  const checkedRadio = document.querySelector('input[name="ql-meal-type"]:checked') as HTMLInputElement | null;
  const mealTypeVal: MealType = (checkedRadio?.value as MealType) || 'lunch';

  if (!foodName) {
    if (errorBanner && errorMsg) {
      errorMsg.innerText = 'Please provide a food or recipe name.';
      errorBanner.classList.remove('hidden');
    }
    return;
  }

  if (isNaN(calories) || calories < 0) {
    if (errorBanner && errorMsg) {
      errorMsg.innerText = 'Please enter a valid non-negative calorie amount.';
      errorBanner.classList.remove('hidden');
    }
    return;
  }

  if (isNaN(protein) || protein < 0 || isNaN(carbs) || carbs < 0 || isNaN(fat) || fat < 0) {
    if (errorBanner && errorMsg) {
      errorMsg.innerText = 'Macronutrient values cannot be negative numbers.';
      errorBanner.classList.remove('hidden');
    }
    return;
  }

  let foodId = `quick-${Date.now()}`;
  let foodSource: 'custom' | 'demo' | 'built_in' = 'custom';

  if (shouldSaveToMyFoods) {
    const res = store.createCustomFood({
      name: foodName,
      category: 'Custom Food',
      nutritionBasis: {
        amount: qtyVal,
        unit: (unitVal === 'g' || unitVal === 'ml' ? unitVal : 'serving') as 'g' | 'ml' | 'serving',
        servingDescription: servingVal
      },
      nutrition: {
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10
      },
      portionOptions: [
        {
          id: `opt-${Date.now()}`,
          label: servingVal,
          unit: unitVal,
          dimension: getUnitDimension(unitVal),
          quantity: qtyVal,
          equivalentBaseAmount: qtyVal,
          equivalentBaseUnit: unitVal === 'ml' ? 'ml' : 'g'
        }
      ]
    });
    if (res.food) {
      foodId = res.food.id;
    }
  }

  const portion: LoggedFoodPortion = {
    foodId,
    quantity: qtyVal,
    unit: unitVal,
    baseAmount: qtyVal,
    baseUnit: unitVal === 'ml' ? 'ml' : 'serving',
    servingDescription: servingVal
  };

  store.logMeal({
    date: dateVal,
    time: timeVal,
    mealType: mealTypeVal,
    foodId,
    foodName,
    portion,
    nutritionSnapshot: {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10
    },
    foodSource,
    loggedAt: new Date().toISOString(),

    name: foodName,
    category: servingVal,
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    icon: 'edit_note'
  });

  store.setScreen('diary');
};

// ==========================================
// MEAL DETAIL & MICRONUTRIENT MODAL BINDINGS
// ==========================================
window.openMealDetail = (mealId: string) => {
  store.openMealDetail(mealId);
};

window.closeMealDetail = () => {
  store.closeMealDetail();
};

window.openNutrientsFromScanned = () => {
  store.openNutrientModal({ type: 'scanned' });
};

window.openNutrientsFromMeal = (mealId: string) => {
  store.openNutrientModal({ type: 'meal', mealId });
};

window.openNutrientsFromCatalog = (catalogId: string) => {
  store.openNutrientModal({ type: 'catalog', catalogId });
};

window.closeNutrientModal = () => {
  store.closeNutrientModal();
};

window.setNutrientCategoryFilter = (category: NutrientFilterCategory) => {
  store.setNutrientModalCategoryFilter(category);
};

window.setInsightNutrientCategory = (category: NutrientFilterCategory) => {
  store.setSelectedInsightNutrientCategory(category);
};

window.filterNutrientList = (query: string) => {
  const q = query.trim().toLowerCase();
  const rows = document.querySelectorAll<HTMLElement>('.nutrient-item-row');
  let visibleCount = 0;
  rows.forEach(row => {
    const name = row.getAttribute('data-nutrient-name')?.toLowerCase() || '';
    const cat = row.getAttribute('data-nutrient-category')?.toLowerCase() || '';
    const match = !q || name.includes(q) || cat.includes(q);
    if (match) {
      row.style.display = '';
      visibleCount++;
    } else {
      row.style.display = 'none';
    }
  });
  const counter = document.getElementById('nutrient-active-count');
  if (counter) {
    counter.innerText = `${visibleCount} visible`;
  }
};
// ==========================================
// PROFILE, SETTINGS & MODAL HANDLERS
// ==========================================
let activeFeedbackCategory = 'Bug Report';

window.openProfileSubpage = (subpage: ProfileSubpage, param?: string) => {
  if (subpage === 'feedback' && param) {
    activeFeedbackCategory = param;
  } else if (subpage === 'feedback') {
    activeFeedbackCategory = 'Bug Report';
  }
  store.setProfileSubpage(subpage);
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.goBackFromProfileSubpage = () => {
  store.goBackFromProfileSubpage();
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.showAvatarInfoModal = () => {
  store.setProfileSubpage('personal_info');
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};

window.shareNutriAI = async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'NutriAI',
        text: 'Track your nutrition, calories, and fitness with NutriAI.',
        url: window.location.href
      });
    } catch {}
  } else {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('NutriAI link copied to clipboard!');
    } catch {
      alert('NutriAI: Your personal nutrition assistant.');
    }
  }
};

// --- Personal Information ---
window.setPersonalHeightUnit = (unit: HeightUnit) => {
  store.updateUserPreferences({ heightUnit: unit });
};

window.setPersonalWeightUnit = (unit: WeightUnit) => {
  store.updateUserPreferences({ weightUnit: unit });
};

window.submitPersonalInfo = () => {
  const nameInput = document.getElementById('profile-name-input') as HTMLInputElement | null;
  const dobInput = document.getElementById('profile-dob-input') as HTMLInputElement | null;
  const sexRadio = document.querySelector('input[name="profile-sex"]:checked') as HTMLInputElement | null;
  const heightCmInput = document.getElementById('profile-height-cm') as HTMLInputElement | null;
  const heightFtInput = document.getElementById('profile-height-ft') as HTMLInputElement | null;
  const heightInInput = document.getElementById('profile-height-in') as HTMLInputElement | null;
  const weightInput = document.getElementById('profile-weight-input') as HTMLInputElement | null;

  const displayName = nameInput?.value.trim() || '';
  const dateOfBirth = dobInput?.value.trim() || null;
  const biologicalSex = (sexRadio?.value as any) || null;

  let heightCm: number | null = null;
  const heightUnit = store.getState().userPreferences.heightUnit;
  if (heightUnit === 'cm') {
    if (heightCmInput && heightCmInput.value) {
      const val = parseFloat(heightCmInput.value);
      if (!isNaN(val) && val > 0) heightCm = Math.round(val);
    }
  } else {
    const ft = heightFtInput && heightFtInput.value ? parseFloat(heightFtInput.value) : 0;
    const inch = heightInInput && heightInInput.value ? parseFloat(heightInInput.value) : 0;
    if (ft > 0 || inch > 0) {
      heightCm = ftInToCm(ft, inch);
    }
  }

  let currentWeightKg: number | null = null;
  if (weightInput && weightInput.value) {
    const rawWeight = parseFloat(weightInput.value);
    if (!isNaN(rawWeight) && rawWeight > 0) {
      const weightUnit = store.getState().userPreferences.weightUnit;
      currentWeightKg = weightUnit === 'lb' ? lbToKg(rawWeight) : Math.round(rawWeight * 10) / 10;
    }
  }

  store.updateUserProfile({
    displayName,
    dateOfBirth,
    biologicalSex,
    heightCm,
    currentWeightKg
  });

  store.goBackFromProfileSubpage();
};

// --- Weight Goal ---
window.selectWeightGoalType = (type: WeightGoalType) => {
  const hiddenInput = document.getElementById('weight-goal-type-input') as HTMLInputElement | null;
  if (hiddenInput) hiddenInput.value = type;
  const magnitude = Math.abs(store.getState().userProfile.weeklyGoalRateKg ?? 0.25);
  store.updateWeightGoal({ weightGoalType: type, weeklyGoalRateKg: type === 'lose' ? -magnitude : type === 'gain' ? magnitude : 0 });
};

window.selectWeeklyRate = (rate: number) => {
  const hiddenInput = document.getElementById('weekly-rate-input') as HTMLInputElement | null;
  if (hiddenInput) hiddenInput.value = String(rate);
  store.updateWeightGoal({ weeklyGoalRateKg: rate });
};

window.updateWeightGoalPreview = () => {
  const targetInput = document.getElementById('weight-target-input') as HTMLInputElement | null;
  if (!targetInput) return;
  const val = parseFloat(targetInput.value);
  if (isNaN(val) || val <= 0) return;
};

window.submitWeightGoal = () => {
  const typeInput = document.getElementById('weight-goal-type-input') as HTMLInputElement | null;
  const targetInput = document.getElementById('weight-target-input') as HTMLInputElement | null;
  const dateInput = document.getElementById('weight-target-date-input') as HTMLInputElement | null;
  const rateInput = document.getElementById('weekly-rate-input') as HTMLInputElement | null;

  const goalType = (typeInput?.value as WeightGoalType) || store.getState().userProfile.weightGoalType || 'maintain';
  let targetKg: number | null = null;
  if (targetInput && targetInput.value) {
    const val = parseFloat(targetInput.value);
    if (!isNaN(val) && val > 0) {
      const unit = store.getState().userPreferences.weightUnit;
      targetKg = unit === 'lb' ? lbToKg(val) : Math.round(val * 10) / 10;
    }
  }

  const targetDate = dateInput?.value.trim() || null;
  const weeklyRateKg = goalType === 'maintain' ? 0 : (rateInput && rateInput.value ? parseFloat(rateInput.value) : (store.getState().userProfile.weeklyGoalRateKg ?? (goalType === 'lose' ? -0.25 : 0.25)));

  store.updateWeightGoal({
    weightGoalType: goalType,
    targetWeightKg: targetKg,
    targetDate,
    weeklyGoalRateKg: weeklyRateKg
  });

  store.goBackFromProfileSubpage();
};

// --- Nutrition Goals ---
window.syncCaloriesFromMacroTargets = () => {
  const proteinInput = document.getElementById('goal-protein-input') as HTMLInputElement | null;
  const carbsInput = document.getElementById('goal-carbs-input') as HTMLInputElement | null;
  const fatInput = document.getElementById('goal-fat-input') as HTMLInputElement | null;
  const calInput = document.getElementById('goal-calorie-input') as HTMLInputElement | null;

  const p = proteinInput ? parseFloat(proteinInput.value) || 0 : 0;
  const c = carbsInput ? parseFloat(carbsInput.value) || 0 : 0;
  const f = fatInput ? parseFloat(fatInput.value) || 0 : 0;

  const breakdown = calculateCaloriesFromMacros({ protein: p, carbs: c, fat: f });
  if (calInput && breakdown) {
    calInput.value = String(Math.round(breakdown.totalCalories));
  }
};

window.submitNutritionGoals = () => {
  const calInput = document.getElementById('goal-calorie-input') as HTMLInputElement | null;
  const proInput = document.getElementById('goal-protein-input') as HTMLInputElement | null;
  const carbInput = document.getElementById('goal-carbs-input') as HTMLInputElement | null;
  const fatInput = document.getElementById('goal-fat-input') as HTMLInputElement | null;
  const waterInput = document.getElementById('goal-water-input') as HTMLInputElement | null;

  const cal = calInput ? parseFloat(calInput.value) : 2100;
  const pro = proInput ? parseFloat(proInput.value) : 145;
  const carb = carbInput ? parseFloat(carbInput.value) : 220;
  const fat = fatInput ? parseFloat(fatInput.value) : 70;
  const water = waterInput ? parseFloat(waterInput.value) : 2000;

  store.updateNutritionGoals({
    calorieTarget: Math.max(500, Math.min(10000, Math.round(cal))),
    proteinTarget: Math.max(0, Math.round(pro)),
    carbsTarget: Math.max(0, Math.round(carb)),
    fatTarget: Math.max(0, Math.round(fat)),
    waterTarget: Math.max(500, Math.min(10000, Math.round(water)))
  });

  store.goBackFromProfileSubpage();
};

window.confirmResetNutritionGoals = () => {
  store.openProfileConfirmModal({
    title: 'Reset Nutrition Targets?',
    message: 'This will reset your daily nutrition targets to default standard values (2,100 kcal, 145g protein, 220g carbs, 70g fat, 2,000ml water).',
    confirmLabel: 'Reset Defaults',
    confirmColorClass: 'bg-primary text-white',
    onConfirm: () => {
      store.updateNutritionGoals({
        calorieTarget: 2100,
        proteinTarget: 145,
        carbsTarget: 220,
        fatTarget: 70,
        waterTarget: 2000
      });
      store.closeProfileConfirmModal();
    }
  });
};

// --- Activity Level ---
let pendingActivityLevel: ActivityLevel | null = null;
let pendingSuggestedTdee: number | null = null;

window.selectActivityTier = (level: ActivityLevel, suggestedTdee: number) => {
  pendingActivityLevel = level;
  pendingSuggestedTdee = suggestedTdee;

  document.querySelectorAll<HTMLElement>('[id^="activity-card-"]').forEach(card => {
    card.classList.remove('bg-primary/5', 'dark:bg-primary/10', 'border-primary', 'ring-1', 'ring-primary/40', 'shadow-ambient');
    card.classList.add('bg-surface-container-lowest', 'dark:bg-dark-surface-card', 'border-outline-variant/30');
  });
  const selectedEl = document.getElementById(`activity-card-${level}`);
  if (selectedEl) {
    selectedEl.classList.remove('bg-surface-container-lowest', 'dark:bg-dark-surface-card', 'border-outline-variant/30');
    selectedEl.classList.add('bg-primary/5', 'dark:bg-primary/10', 'border-primary', 'ring-1', 'ring-primary/40', 'shadow-ambient');
  }

  const suggestionCard = document.getElementById('activity-suggestion-card');
  const suggestionText = document.getElementById('activity-suggestion-text');
  if (suggestionCard && suggestionText) {
    const currentCal = store.getState().calorieTarget;
    suggestionText.innerHTML = `Your current daily target is <strong>${currentCal} kcal</strong>. Based on ${level.replace('_', ' ')} activity, your suggested target is <strong>${suggestedTdee} kcal</strong>. Would you like to recalibrate?`;
    suggestionCard.classList.remove('hidden');
  }
};

window.dismissActivitySuggestion = () => {
  const suggestionCard = document.getElementById('activity-suggestion-card');
  if (suggestionCard) suggestionCard.classList.add('hidden');
};

window.applySuggestedCalorieTarget = () => {
  if (pendingSuggestedTdee) {
    store.updateNutritionGoals({ calorieTarget: pendingSuggestedTdee });
  }
  const suggestionCard = document.getElementById('activity-suggestion-card');
  if (suggestionCard) suggestionCard.classList.add('hidden');
};

window.saveActivityLevel = () => {
  const levelToSave = pendingActivityLevel || store.getState().userProfile.activityLevel || 'moderate';
  store.setActivityLevel(levelToSave);
  pendingActivityLevel = null;
  pendingSuggestedTdee = null;
  store.goBackFromProfileSubpage();
};

// --- Weight History & Weight Entry Modal ---
window.toggleWeightDisplayUnit = (unit: WeightUnit) => {
  store.updateUserPreferences({ weightUnit: unit });
};

window.openWeightModal = (entryId?: string) => {
  const entry = entryId ? store.getState().weightHistory.find(w => w.id === entryId) : null;
  store.openWeightModal(entry);
};

window.closeWeightModal = () => {
  store.closeWeightModal();
};

window.editWeightEntry = (id: string) => {
  window.openWeightModal(id);
};

window.setWeightModalUnit = (unit: WeightUnit) => {
  const inputEl = document.getElementById('weight-input-value') as HTMLInputElement | null;
  const unitInput = document.getElementById('weight-input-unit') as HTMLInputElement | null;
  const kgBtn = document.getElementById('weight-unit-kg-btn');
  const lbBtn = document.getElementById('weight-unit-lb-btn');

  const currentUnit = (unitInput?.value as WeightUnit) || 'kg';
  if (currentUnit !== unit && inputEl && inputEl.value) {
    const currentVal = parseFloat(inputEl.value);
    if (!isNaN(currentVal) && currentVal > 0) {
      if (unit === 'lb') {
        inputEl.value = String(kgToLb(currentVal));
      } else {
        inputEl.value = String(lbToKg(currentVal));
      }
    }
  }

  if (unitInput) unitInput.value = unit;
  if (kgBtn && lbBtn) {
    if (unit === 'kg') {
      kgBtn.className = 'px-3 py-2 rounded-lg text-xs font-bold transition-all bg-primary text-white shadow-xs';
      lbBtn.className = 'px-3 py-2 rounded-lg text-xs font-bold transition-all text-on-surface-variant hover:text-on-surface';
    } else {
      kgBtn.className = 'px-3 py-2 rounded-lg text-xs font-bold transition-all text-on-surface-variant hover:text-on-surface';
      lbBtn.className = 'px-3 py-2 rounded-lg text-xs font-bold transition-all bg-primary text-white shadow-xs';
    }
  }
};

window.submitWeightEntry = () => {
  const idInput = document.getElementById('weight-entry-id') as HTMLInputElement | null;
  const weightInput = document.getElementById('weight-input-value') as HTMLInputElement | null;
  const unitInput = document.getElementById('weight-input-unit') as HTMLInputElement | null;
  const dateInput = document.getElementById('weight-input-date') as HTMLInputElement | null;
  const timeInput = document.getElementById('weight-input-time') as HTMLInputElement | null;
  const noteInput = document.getElementById('weight-input-note') as HTMLInputElement | null;

  const rawWeight = weightInput ? parseFloat(weightInput.value) : NaN;
  if (isNaN(rawWeight) || rawWeight <= 0) {
    return;
  }

  const unit = (unitInput?.value as WeightUnit) || store.getState().userPreferences.weightUnit || 'kg';
  const date = dateInput?.value || new Date().toISOString().split('T')[0];
  const time = timeInput?.value || '08:00';
  const note = noteInput?.value.trim() || undefined;
  const editId = idInput?.value || '';

  if (editId) {
    store.updateWeightEntry(editId, rawWeight, unit, date, time, note);
  } else {
    store.addWeightEntry(rawWeight, unit, date, time, note);
  }

  store.closeWeightModal();
};

window.confirmDeleteWeightEntry = (id: string) => {
  store.openProfileConfirmModal({
    title: 'Delete Weight Record?',
    message: 'Are you sure you want to permanently delete this recorded body weight entry?',
    confirmLabel: 'Delete Entry',
    confirmColorClass: 'bg-error text-white',
    onConfirm: () => {
      store.deleteWeightEntry(id);
      store.closeProfileConfirmModal();
    }
  });
};

// --- Eating Schedule ---
window.toggleEatingWindowEnabled = () => {
  const current = store.getState().eatingSchedule?.enabled || false;
  store.updateEatingSchedule({ enabled: !current });
};

window.toggleEatingDay = (dayId: number) => {
  const currentDays = [...(store.getState().eatingSchedule?.daysOfWeek || [1, 2, 3, 4, 5, 6, 7])];
  const idx = currentDays.indexOf(dayId);
  if (idx >= 0) {
    if (currentDays.length > 1) {
      currentDays.splice(idx, 1);
    }
  } else {
    currentDays.push(dayId);
    currentDays.sort((a, b) => a - b);
  }
  store.updateEatingSchedule({ daysOfWeek: currentDays });
};

window.toggleEatingReminders = () => {
  const current = store.getState().eatingSchedule?.remindersEnabled || false;
  store.updateEatingSchedule({ remindersEnabled: !current });
};

window.submitEatingSchedule = () => {
  const startInput = document.getElementById('schedule-start-time') as HTMLInputElement | null;
  const endInput = document.getElementById('schedule-end-time') as HTMLInputElement | null;

  const startTime = startInput?.value || '12:00';
  const endTime = endInput?.value || '20:00';

  store.updateEatingSchedule({ startTime, endTime });
  store.goBackFromProfileSubpage();
};

// --- App Settings ---
window.setAppTheme = (theme: ThemePreference) => {
  store.setThemePreference(theme);
};

window.setAppWeightUnit = (unit: WeightUnit) => {
  store.updateUserPreferences({ weightUnit: unit });
};

window.setAppMassUnit = (unit: 'g' | 'oz') => {
  store.updateUserPreferences({ preferredMassUnit: unit });
};

window.setAppVolumeUnit = (unit: 'ml' | 'cup') => {
  store.updateUserPreferences({ preferredVolumeUnit: unit });
};

window.setAppWeekStart = (start: WeekStart) => {
  store.updateUserPreferences({ weekStart: start });
};

window.setAppLanguage = (lang: string) => {
  store.updateUserPreferences({ language: lang });
};

window.toggleAppReduceMotion = () => {
  const cur = store.getState().userPreferences?.reduceMotion || false;
  store.updateUserPreferences({ reduceMotion: !cur });
};

window.toggleAppHapticFeedback = () => {
  const cur = store.getState().userPreferences?.hapticFeedback ?? true;
  store.updateUserPreferences({ hapticFeedback: !cur });
};

window.confirmResetPreferences = () => {
  store.openProfileConfirmModal({
    title: 'Reset Preferences?',
    message: 'This will reset your theme, unit preferences, and accessibility settings back to their default values.',
    confirmLabel: 'Reset Preferences',
    confirmColorClass: 'bg-error text-white',
    onConfirm: () => {
      store.updateUserPreferences({
        theme: 'system',
        weightUnit: 'kg',
        heightUnit: 'cm',
        preferredMassUnit: 'g',
        preferredVolumeUnit: 'ml',
        weekStart: 'monday',
        language: 'en',
        reduceMotion: false,
        hapticFeedback: true
      });
      store.closeProfileConfirmModal();
    }
  });
};

// --- Feedback ---
window.saveFeedbackDraft = () => {
  const catInput = document.getElementById('feedback-category-input') as HTMLSelectElement | null;
  const subInput = document.getElementById('feedback-subject-input') as HTMLInputElement | null;
  const descInput = document.getElementById('feedback-description-input') as HTMLTextAreaElement | null;
  const emailInput = document.getElementById('feedback-email-input') as HTMLInputElement | null;
  const diagInput = document.getElementById('feedback-diagnostics-input') as HTMLInputElement | null;

  const draft = {
    category: catInput?.value || 'Bug Report',
    subject: subInput?.value || '',
    description: descInput?.value || '',
    email: emailInput?.value || '',
    diagnostics: diagInput?.value === 'true'
  };

  try {
    localStorage.setItem('nutriai_feedback_draft', JSON.stringify(draft));
  } catch {}
};

window.toggleFeedbackDiagnostics = () => {
  const diagInput = document.getElementById('feedback-diagnostics-input') as HTMLInputElement | null;
  const isEnabled = diagInput?.value === 'true';
  if (diagInput) diagInput.value = isEnabled ? 'false' : 'true';
  window.saveFeedbackDraft();
  renderApp();
};

window.copyFeedbackText = async () => {
  window.saveFeedbackDraft();
  const sub = (document.getElementById('feedback-subject-input') as HTMLInputElement | null)?.value || 'Feedback';
  const cat = (document.getElementById('feedback-category-input') as HTMLSelectElement | null)?.value || 'General';
  const desc = (document.getElementById('feedback-description-input') as HTMLTextAreaElement | null)?.value || '';
  const email = (document.getElementById('feedback-email-input') as HTMLInputElement | null)?.value || 'Not provided';
  const diagInput = document.getElementById('feedback-diagnostics-input') as HTMLInputElement | null;

  const textToCopy = `[NutriAI v${APP_METADATA.version} Feedback]\nCategory: ${cat}\nSubject: ${sub}\nDetails: ${desc}\nContact: ${email}${diagInput?.value === 'true' ? `\nPlatform: ${navigator.userAgent}` : ''}`;

  try {
    await navigator.clipboard.writeText(textToCopy);
    alert('Feedback text copied to clipboard! You can paste it into an email or support message.');
  } catch {
    alert('Please copy your message directly from the form.');
  }
};

window.clearFeedbackDraft = () => {
  try {
    localStorage.removeItem('nutriai_feedback_draft');
  } catch {}
  renderApp();
};

// --- Help Center ---
window.filterFaqList = (query: string) => {
  const q = (query || '').trim().toLowerCase();
  HELP_CENTER_FAQS.forEach(faq => {
    const el = document.getElementById(`faq-item-${faq.id}`) as HTMLDetailsElement | null;
    if (!el) return;
    const matches = !q || faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q) || faq.category.toLowerCase().includes(q);
    if (matches) {
      el.style.display = '';
      if (q) el.open = true;
    } else {
      el.style.display = 'none';
    }
  });
};

// --- Marketing Consent ---
window.toggleMarketingConsent = () => {
  const cur = store.getState().userPreferences?.marketingConsent || false;
  store.updateUserPreferences({
    marketingConsent: !cur,
    marketingConsentUpdatedAt: new Date().toISOString()
  });
};

// --- Data & Privacy / Export / Granular Deletions ---
window.exportAppData = () => {
  store.exportLocalData();
};

window.confirmDeleteFoodHistory = () => {
  const count = store.getState().meals.length;
  store.openProfileConfirmModal({
    title: 'Delete Food & Diary History?',
    message: `Are you sure you want to permanently delete all ${count} food diary entries? Your profile, goals, and weight records will NOT be deleted.`,
    confirmLabel: 'Delete Food History',
    confirmColorClass: 'bg-error text-white',
    onConfirm: () => {
      store.deleteSelectedLocalData('meals');
      store.closeProfileConfirmModal();
    }
  });
};

window.confirmDeleteWorkoutHistory = () => {
  const count = store.getState().workoutHistory.length;
  store.openProfileConfirmModal({
    title: 'Delete Workout History?',
    message: `Are you sure you want to delete all ${count} finished workouts and personal records? Your nutrition and weight data will remain intact.`,
    confirmLabel: 'Delete Workouts',
    confirmColorClass: 'bg-error text-white',
    onConfirm: () => {
      store.deleteSelectedLocalData('workouts');
      store.closeProfileConfirmModal();
    }
  });
};

window.confirmDeleteWeightHistory = () => {
  const count = store.getState().weightHistory.length;
  store.openProfileConfirmModal({
    title: 'Delete Weight History?',
    message: `Are you sure you want to delete all ${count} weight measurements?`,
    confirmLabel: 'Delete Weight History',
    confirmColorClass: 'bg-error text-white',
    onConfirm: () => {
      store.deleteSelectedLocalData('weights');
      store.closeProfileConfirmModal();
    }
  });
};

window.confirmDeleteAllLocalData = () => {
  store.openProfileConfirmModal({
    title: 'Delete All Local Data?',
    message: 'This will completely reset NutriAI on this device. All logged meals, workouts, custom foods, weight entries, and preferences will be permanently wiped. Type DELETE to confirm.',
    confirmLabel: 'Delete Everything',
    confirmColorClass: 'bg-error text-white',
    requireTypingText: 'DELETE',
    onConfirm: () => {
      store.deleteSelectedLocalData('all');
      store.closeProfileConfirmModal();
    }
  });
};

window.closeProfileConfirmModal = () => {
  store.closeProfileConfirmModal();
};

window.executeProfileConfirmModalAction = () => {
  const modal = store.getState().profileConfirmModal;
  if (modal && modal.onConfirm) {
    modal.onConfirm();
  }
};

// ==========================================
// FIRST-LAUNCH ONBOARDING & PROFILE PHOTO
// ==========================================
function showOnboardingError(message: string) {
  const el = document.getElementById('onboarding-error');
  if (el) el.textContent = message;
}

function capturePersonalDetails(validate: boolean = true): boolean {
  const state = store.getState();
  const draft = state.onboardingDraft;
  const name = (document.getElementById('onboarding-name') as HTMLInputElement | null)?.value.trim() || '';
  const dob = (document.getElementById('onboarding-dob') as HTMLInputElement | null)?.value || null;
  const sex = (document.querySelector('input[name="onboarding-sex"]:checked') as HTMLInputElement | null)?.value as 'female' | 'male' | 'prefer_not_to_say' | undefined;
  let heightCm: number | null = null;
  if (draft.heightUnit === 'cm') {
    const raw = Number((document.getElementById('onboarding-height-cm') as HTMLInputElement | null)?.value);
    heightCm = Number.isFinite(raw) && raw > 0 ? Math.round(raw) : null;
  } else {
    const feet = Number((document.getElementById('onboarding-height-ft') as HTMLInputElement | null)?.value || 0);
    const inches = Number((document.getElementById('onboarding-height-in') as HTMLInputElement | null)?.value || 0);
    heightCm = feet > 0 || inches > 0 ? ftInToCm(feet, inches) : null;
  }
  const rawWeight = Number((document.getElementById('onboarding-current-weight') as HTMLInputElement | null)?.value);
  const rawTarget = Number((document.getElementById('onboarding-target-weight') as HTMLInputElement | null)?.value);
  const currentWeightKg = Number.isFinite(rawWeight) && rawWeight > 0 ? (draft.weightUnit === 'lb' ? lbToKg(rawWeight) : Math.round(rawWeight * 10) / 10) : null;
  const targetWeightKg = Number.isFinite(rawTarget) && rawTarget > 0 ? (draft.weightUnit === 'lb' ? lbToKg(rawTarget) : Math.round(rawTarget * 10) / 10) : null;
  if (validate && !sex) { showOnboardingError('Choose a calculation profile or Prefer not to say.'); return false; }
  if (validate && (!heightCm || heightCm < 50 || heightCm > 300)) { showOnboardingError('Enter a valid height between 50 and 300 cm.'); return false; }
  if (validate && (!currentWeightKg || currentWeightKg < 15 || currentWeightKg > 500)) { showOnboardingError('Enter a valid current weight.'); return false; }
  if (validate && draft.weightDirection !== null && targetWeightKg && currentWeightKg) {
    if (draft.weightDirection < 0 && targetWeightKg >= currentWeightKg) { showOnboardingError('For a loss goal, target weight should be below current weight.'); return false; }
    if (draft.weightDirection > 0 && targetWeightKg <= currentWeightKg) { showOnboardingError('For a gain goal, target weight should be above current weight.'); return false; }
  }
  store.updateOnboardingDraft({ displayName: name, dateOfBirth: dob, biologicalSex: sex, heightCm, currentWeightKg, targetWeightKg });
  return true;
}

window.selectOnboardingRate = (rate: number) => {
  const allowed = [-0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75];
  if (allowed.includes(rate)) store.updateOnboardingDraft({ weightDirection: rate as any });
};

window.selectOnboardingActivity = (level: ActivityLevel) => store.updateOnboardingDraft({ activityLevel: level });

window.toggleOnboardingHeightUnit = () => {
  capturePersonalDetails(false);
  const current = store.getState().onboardingDraft.heightUnit;
  store.updateOnboardingDraft({ heightUnit: current === 'cm' ? 'ft_in' : 'cm' });
};

window.toggleOnboardingWeightUnit = () => {
  capturePersonalDetails(false);
  const current = store.getState().onboardingDraft.weightUnit;
  store.updateOnboardingDraft({ weightUnit: current === 'kg' ? 'lb' : 'kg' });
};

window.onboardingNext = () => {
  const state = store.getState();
  const step = state.onboardingState.currentStep;
  if (step === 1) { store.setOnboardingStep(2); return; }
  if (step === 2) {
    if (state.onboardingDraft.weightDirection === null) { showOnboardingError('Choose a weight goal to continue.'); return; }
    store.setOnboardingStep(3); return;
  }
  if (step === 3) {
    if (!capturePersonalDetails()) return;
    store.setOnboardingStep(4); return;
  }
  if (step === 4) {
    if (!state.onboardingDraft.activityLevel) { showOnboardingError('Choose your usual activity level.'); return; }
    store.setOnboardingStep(5); return;
  }
  if (step === 5) { store.setOnboardingStep(6); return; }
  const preview = getOnboardingGoalPreview();
  const current = store.getState().nutritionGoals;
  store.completeOnboarding(preview ? {
    calorieTarget: preview.reviewedSuggestedCalories,
    proteinTarget: preview.protein,
    carbsTarget: preview.carbs,
    fatTarget: preview.fat,
    waterTarget: current.waterTarget
  } : current);
};

window.onboardingBack = () => {
  const step = store.getState().onboardingState.currentStep;
  if (step > 1) store.setOnboardingStep(step - 1);
};

window.onboardingSkip = () => {
  if (store.getState().onboardingState.currentStep === 6) window.onboardingNext();
};

window.handleProfilePhotoSelected = async (input: HTMLInputElement) => {
  const file = input.files?.[0];
  if (!file) return;
  const validation = validateProfileImage(file);
  const errorEl = document.getElementById('profile-photo-error');
  if (!validation.valid) { if (errorEl) errorEl.textContent = validation.error || 'Invalid image.'; input.value = ''; return; }
  try {
    const blob = await resizeProfileImage(file);
    const ref = await saveProfileImage(blob);
    const url = URL.createObjectURL(blob);
    store.setProfileImageUrl(url);
    if (store.getState().currentScreen === 'onboarding') store.updateOnboardingDraft({ profileImageRef: ref });
  } catch {
    if (errorEl) errorEl.textContent = 'The photo could not be saved on this device.';
  } finally {
    input.value = '';
  }
};

window.removeProfilePhoto = async () => {
  await deleteProfileImage();
  store.setProfileImageUrl(null);
  if (store.getState().currentScreen === 'onboarding') store.updateOnboardingDraft({ profileImageRef: null });
};

window.restartGoalSetup = () => store.restartGoalSetup();

// ==========================================
// HARDWARE BACK BUTTON & KEYBOARD ESCAPE
// ==========================================
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const state = store.getState();
    if (state.profileConfirmModal) {
      store.closeProfileConfirmModal();
    } else if (state.currentScreen === 'onboarding' && state.onboardingState.currentStep > 1) {
      store.setOnboardingStep(state.onboardingState.currentStep - 1);
    } else if (state.weightModalOpen) {
      store.closeWeightModal();
    } else if (state.currentScreen === 'profile' && state.profileSubpage) {
      store.goBackFromProfileSubpage();
    } else if (state.customFoodShowDiscardConfirm) {
      store.cancelDiscardCustomFood();
    } else if (state.isCustomFoodModalOpen) {
      if (state.customFoodStep > 1) {
        store.previousCustomFoodStep();
      } else {
        store.closeCreateCustomFoodModal();
      }
    } else if (state.isSetPortionOpen) {
      store.closeSetPortion();
    } else if (state.activeNutrientModalSource) {
      store.closeNutrientModal();
    } else if (state.selectedMealDetailId) {
      store.closeMealDetail();
    } else if (state.quickAddOpen) {
      store.closeQuickAdd();
    } else if (state.diaryCalendarOpen) {
      store.closeDiaryCalendar();
    } else if (state.deleteConfirmationWorkoutId) {
      store.closeDeleteModal();
    }
  }
});

document.addEventListener('backbutton', (e) => {
  const state = store.getState();
  if (state.profileConfirmModal) {
    e.preventDefault();
    store.closeProfileConfirmModal();
    return;
  }
  if (state.currentScreen === 'onboarding') {
    e.preventDefault();
    if (state.onboardingState.currentStep > 1) store.setOnboardingStep(state.onboardingState.currentStep - 1);
    return;
  }
  if (state.weightModalOpen) {
    e.preventDefault();
    store.closeWeightModal();
    return;
  }
  if (state.currentScreen === 'profile' && state.profileSubpage) {
    e.preventDefault();
    store.goBackFromProfileSubpage();
    return;
  }
  if (state.diaryCalendarOpen) {
    e.preventDefault();
    store.closeDiaryCalendar();
    return;
  }
  if (state.customFoodShowDiscardConfirm) {
    e.preventDefault();
    store.cancelDiscardCustomFood();
    return;
  }
  if (state.isCustomFoodModalOpen) {
    e.preventDefault();
    if (state.customFoodStep > 1) {
      store.previousCustomFoodStep();
    } else {
      store.closeCreateCustomFoodModal();
    }
    return;
  }
  if (state.isSetPortionOpen) {
    e.preventDefault();
    store.closeSetPortion();
    return;
  }
  if (state.activeNutrientModalSource) {
    e.preventDefault();
    store.closeNutrientModal();
    return;
  }
  if (state.selectedMealDetailId) {
    e.preventDefault();
    store.closeMealDetail();
    return;
  }
  if (state.quickAddOpen) {
    e.preventDefault();
    store.closeQuickAdd();
    return;
  }
  if (state.deleteConfirmationWorkoutId) {
    e.preventDefault();
    store.closeDeleteModal();
    return;
  }
  if (['foodSearch', 'quickLog', 'workoutDetail', 'personalRecordDetail'].includes(state.currentScreen)) {
    e.preventDefault();
    store.setScreen('dashboard');
    return;
  }
});

function renderApp() {
  const app = document.getElementById('app');
  if (!app) return;

  const { currentScreen, fitnessSubView } = store.getState();

  let screenHtml = '';
  switch (currentScreen) {
    case 'onboarding':
      screenHtml = renderOnboardingScreen();
      break;
    case 'dashboard':
      screenHtml = renderDashboardScreen();
      break;
    case 'scanner':
      screenHtml = renderScannerScreen();
      break;
    case 'foodResult':
      screenHtml = renderFoodResultScreen();
      break;
    case 'diary':
      screenHtml = renderDiaryScreen();
      break;
    case 'coach':
      screenHtml = renderAICoachScreen();
      break;
    case 'fitness':
      screenHtml = renderFitnessScreen();
      break;
    case 'profile': {
      const subpage = store.getState().profileSubpage;
      if (!subpage) {
        screenHtml = renderProfileScreen();
      } else {
        switch (subpage) {
          case 'personal_info':
            screenHtml = renderPersonalInformationScreen();
            break;
          case 'weight_goal':
            screenHtml = renderWeightGoalScreen();
            break;
          case 'nutrition_goals':
            screenHtml = renderNutritionGoalsScreen();
            break;
          case 'activity_level':
            screenHtml = renderActivityLevelScreen();
            break;
          case 'weight_history':
            screenHtml = renderWeightHistoryScreen();
            break;
          case 'eating_schedule':
            screenHtml = renderEatingScheduleScreen();
            break;
          case 'health_connections':
            screenHtml = renderHealthConnectionsScreen();
            break;
          case 'app_settings':
            screenHtml = renderAppSettingsScreen();
            break;
          case 'whats_new':
            screenHtml = renderWhatsNewScreen();
            break;
          case 'feedback':
            screenHtml = renderFeedbackScreen(activeFeedbackCategory);
            break;
          case 'help_center':
            screenHtml = renderHelpCenterScreen();
            break;
          case 'terms_of_use':
            screenHtml = renderLegalDocumentScreen('terms_of_use');
            break;
          case 'privacy_policy':
            screenHtml = renderLegalDocumentScreen('privacy_policy');
            break;
          case 'marketing_consent':
            screenHtml = renderMarketingConsentScreen();
            break;
          case 'health_disclaimer':
            screenHtml = renderLegalDocumentScreen('health_disclaimer');
            break;
          case 'data_privacy':
            screenHtml = renderDataPrivacyScreen();
            break;
          default:
            screenHtml = renderProfileScreen();
        }
      }
      break;
    }
    case 'workoutDetail':
      screenHtml = renderWorkoutDetailScreen();
      break;
    case 'personalRecordDetail':
      screenHtml = renderPersonalRecordDetailScreen();
      break;
    case 'insights':
      screenHtml = renderInsightsScreen();
      break;
    case 'foodSearch':
      screenHtml = renderFoodSearchScreen();
      break;
    case 'quickLog':
      screenHtml = renderQuickLogScreen();
      break;
    default:
      screenHtml = renderDashboardScreen();
  }

  // Active workout session, detail, and search screens hide bottom navigation to maximize focus.
  // Profile main screen shows Bottom Nav, but all profile subpages hide Bottom Nav.
  const isWorkoutActive = currentScreen === 'fitness' && fitnessSubView === 'active';
  const isProfileSubpage = currentScreen === 'profile' && !!store.getState().profileSubpage;
  const showBottomNav = !isWorkoutActive && !isProfileSubpage && ['dashboard', 'diary', 'insights', 'coach', 'profile'].includes(currentScreen);

  app.innerHTML = `
    ${screenHtml}
    ${showBottomNav ? renderBottomNav() : ''}
    ${renderQuickActionModal()}
    ${renderQuickAddBottomSheet()}
    ${renderDeleteWorkoutModal()}
    ${renderMealDetailModal()}
    ${renderNutrientDetailModal()}
    ${renderSetPortionModal()}
    ${renderCustomFoodModal()}
    ${renderDiaryCalendarModal()}
    ${renderProfileConfirmationModal()}
    ${renderWeightEntryModal()}
  `;

  if (currentScreen === 'coach') {
    const container = document.getElementById('chat-messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
}

// Subscribe to store updates
store.subscribe(renderApp);

// If the app remains open overnight, resume on the new device-local date.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') store.syncToCurrentDate();
});

// Initial render
renderApp();
