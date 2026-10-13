import type { AppState } from '../types/index.ts';
import { tr } from '../i18n/index.ts';
import { SPECIAL_PROGRAM_ACTIONS } from '../components/BottomSheets/specialProgramActions.ts';
import { calculateRecompMatrix, estimateHiddenFat, getFatGauge, getPhaseCycleProgress, getProteinRadar, splitProteinTarget } from '../services/phasicRecompService.ts';
import { isSpecialProgramUnlocked } from './dietPrograms.ts';
import { formatDisplayNumber as number } from './safeNumbers.ts';
import type { InsightMessage } from './insightCalculations.ts';

type PhasicInsightState = Pick<AppState, 'userProfile' | 'nutritionGoals' | 'phasicTools' | 'meals' | 'weightHistory' | 'workoutHistory'>;

/** Reuse the six tools' calculations and ordinary diary entries, never a second analytics ledger. */
export function generatePhasicInsightMessages(state: PhasicInsightState, dates: string[], today: string): InsightMessage[] {
  if (!isSpecialProgramUnlocked(state.userProfile)) return [];
  const dateSet = new Set(dates);
  const meals = state.meals.filter(meal => dateSet.has(meal.date) && meal.foodSource !== 'demo');
  const goals = state.nutritionGoals;
  const program = state.userProfile.dietProgram ?? 'standard';
  let includedFat = 0, extraFat = 0, reviewedScans = 0, unknownScans = 0;
  for (const meal of meals) {
    if (meal.scanAnalysis) {
      reviewedScans++;
      const amount = meal.scanAnalysis.reviewedCookingFatGrams;
      if (amount === null) unknownScans++;
      else includedFat += amount;
    }
    if (meal.hiddenFatEstimate) extraFat += estimateHiddenFat(meal.hiddenFatEstimate).fatGrams;
  }
  const split = splitProteinTarget(goals.proteinTarget, state.phasicTools.proteinMealCount);
  let belowGroups = 0, unknownGroups = 0, loggedGroups = 0, fatEvaluated = 0, fatExceeded = 0, fatUnknown = 0;
  for (const date of dates) {
    const radar = getProteinRadar(meals, date, goals.proteinTarget);
    for (const group of radar.groups) {
      if (!group.entryCount) continue;
      loggedGroups++;
      if (group.benchmarkStatus === 'below') belowGroups++;
      if (group.unknownEntryCount > 0) unknownGroups++;
    }
    if (goals.fatTarget > 0 && meals.some(meal => meal.date === date)) {
      const gauge = getFatGauge(meals, date, goals.fatTarget, program, state.userProfile.currentWeightKg);
      if (gauge.unknownEntryCount || gauge.missingWeight) fatUnknown++;
      else fatEvaluated++;
      // Known fat above the ceiling remains evidence of an overage even with other unknown entries.
      if (gauge.state === 'exceeded') fatExceeded++;
    }
  }
  const ceiling = goals.fatTarget > 0
    ? getFatGauge([], today, goals.fatTarget, program, state.userProfile.currentWeightKg).ceilingGrams : null;
  const cycle = state.phasicTools.phaseCycle;
  const progress = cycle?.program === program ? getPhaseCycleProgress(cycle, today, goals.calorieTarget) : null;
  const refeeds = progress?.refeedDates.filter(date => dateSet.has(date)).length ?? 0;
  const recomp = calculateRecompMatrix(state.weightHistory, state.workoutHistory, today);
  const details: Record<string, Pick<InsightMessage, 'text' | 'status'>> = {
    'hidden-fat-scanner': {
      text: tr('{0} reviewed scans: {1} g included cooking fat, {2} unknown estimates. Manual extra fat: {3} g. These calories and fats are already counted once in nutrition totals.', number(reviewedScans, 0), number(includedFat), number(unknownScans, 0), number(extraFat)),
      status: 'neutral',
    },
    'protein-splitter': {
      text: tr('Saved protein plan: {0} g across {1} intervals ({2} g each). This is an allocation, not logged intake.', number(split.targetGrams), number(split.mealCount, 0), split.intervals.map(interval => number(interval.proteinGrams)).join(' / '))
        + ' ' + tr(split.isFeasible ? 'Each interval meets the 30 g planning benchmark.' : 'The saved target is too low to provide 30 g in every interval.'),
      status: split.isFeasible ? 'neutral' : 'attention',
    },
    'protein-radar': {
      text: tr('{0} of {1} logged meal groups were below the 30 g protein benchmark; {2} groups have incomplete protein data. This does not measure leucine.', number(belowGroups, 0), number(loggedGroups, 0), number(unknownGroups, 0)),
      status: belowGroups > 0 ? 'attention' : 'neutral',
    },
    'fat-gauge': {
      text: tr('Daily fat ceiling: {0} g. {1} logged days have complete fat data; {2} days exceeded the ceiling; {3} days have incomplete data. The ceiling uses your current saved program and weight.', number(ceiling), number(fatEvaluated, 0), number(fatExceeded, 0), number(fatUnknown, 0)),
      status: fatExceeded > 0 ? 'attention' : 'neutral',
    },
    'phase-cycle': {
      text: progress
        ? tr('Current cycle: {0}, week {1}/{2}, day {3}/{4}. {5} scheduled refeed dates in this window. Daily calorie and carb comparisons include those allowances, not extra food logs.', tr({ active: 'Active', upcoming: 'Upcoming', completed: 'Completed' }[progress.status]), number(progress.weekNumber, 0), number(cycle!.lengthWeeks, 0), number(progress.dayNumber, 0), number(progress.totalDays, 0), number(refeeds, 0))
        : tr('Set a cycle in Phase & Cycle to include scheduled refeed allowances in your daily targets.'),
      status: 'neutral',
    },
    'recomp-matrix': {
      text: recomp.status === 'insufficient_data'
        ? tr('Recomp compares the latest 7 days with the previous 7, regardless of this page’s range. Log weight on 3 days in each window and comparable loaded workouts to evaluate it.')
        : tr('Latest 7 days vs previous 7: weight {0} kg; comparable strength {1}%. {2}. This is a performance trend, not measured body composition.', number(recomp.weightChangeKg, 3), number(recomp.strengthChangePercent), tr(RECOMP_STATUS_LABELS[recomp.status])),
      status: recomp.status === 'optimal_recomp' ? 'positive' : recomp.status === 'strength_declining' ? 'attention' : 'neutral',
    },
  };
  return SPECIAL_PROGRAM_ACTIONS.map(action => ({ id: `phasic-${action.id}`, category: 'nutrition',
    title: tr(action.label), icon: action.icon, toolId: action.id, ...details[action.id] }));
}

export const RECOMP_STATUS_LABELS = {
  insufficient_data: 'Not enough comparable data', optimal_recomp: 'Optimal Recomp',
  strength_declining: 'Strength trending down', building_strength: 'Strength trending up',
  weight_rising: 'Weight trending up', stable: 'Broadly stable',
} as const;
