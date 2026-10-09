/**
 * Pure Calculation and Aggregation Utilities for Micronutrients
 * 
 * Rules:
 * 1. Missing data is strictly null; NEVER treated as zero.
 * 2. Amount 0 means genuinely verified zero (not missing).
 * 3. Daily Value % can exceed 100%. Clamped at 100% in progress bars, but displays real % in text.
 * 4. Units normalized safely (mg <-> mcg, g <-> mg). Incompatible units return null.
 * 5. Maximum-oriented nutrients (Sodium, Saturated Fat, Added Sugars, Cholesterol, Caffeine)
 *    evaluate exceeding as 'above_limit' or 'near_limit', NOT 'target_met'.
 * 6. Minimum coverage threshold required before concluding trend status (otherwise 'insufficient_data').
 * 7. NEVER use "deficient" or diagnose nutritional deficiency.
 * 8. Demo data (source === 'demo') is isolated and excluded from real user historical insights.
 */

import type { 
  NutrientUnit, 
  NutrientValue, 
  MicronutrientProfile, 
  MealItem 
} from '../types/index.ts';
import { 
  getNutrientReference, 
  getAllNutrientReferences,
  type NutrientReferenceConfig 
} from '../data/nutrientReferenceValues.ts';

export type EvaluatedNutrientStatus = 
  | 'within_limit'
  | 'near_limit'
  | 'above_limit'
  | 'target_met'
  | 'near_target'
  | 'below_target'
  | 'informational'
  | 'insufficient_data';

export interface AggregatedNutrientItem {
  key: string;
  name: string;
  shortName: string;
  category: 'vitamin' | 'mineral' | 'other';
  totalAmount: number;
  unit: NutrientUnit;
  dailyValuePercent: number | null;
  referenceValue: number | null;
  referenceKind: string;
  direction: string;
  mealsReportingCount: number;
  status: EvaluatedNutrientStatus;
  statusLabel: string;
}

export interface DailyMicronutrientSummaryResult {
  nutrients: AggregatedNutrientItem[];
  totalMealsInDay: number;
  mealsWithMicronutrients: number;
  coveragePercentage: number;
  hasSufficientCoverage: boolean;
}

export interface NutrientTrendItem {
  key: string;
  name: string;
  shortName: string;
  category: 'vitamin' | 'mineral' | 'other';
  avgDailyIntake: number | null;
  unit: NutrientUnit;
  referenceValue: number | null;
  direction: string;
  daysMeetingTarget: number;
  daysEvaluated: number;
  dataCoveragePercent: number;
  totalMealsReporting: number;
  status: EvaluatedNutrientStatus;
  statusLabel: string;
  guidanceText: string;
}

export interface MicronutrientTrendsSummary {
  periodDays: number;
  totalLoggedMeals: number;
  mealsWithMicronutrientData: number;
  overallCoveragePercent: number;
  hasMinimumCoverage: boolean;
  nutrients: NutrientTrendItem[];
  frequentlyBelowTarget: NutrientTrendItem[];
  consistentlyMeetingTarget: NutrientTrendItem[];
}

/**
 * Normalizes an amount between compatible units.
 * Returns null if units cannot be converted directly without substance-specific factors.
 */
export function normalizeNutrientUnit(
  amount: number | null, 
  fromUnit: NutrientUnit, 
  toUnit: NutrientUnit
): number | null {
  if (amount === null || isNaN(amount) || !isFinite(amount)) return null;
  if (fromUnit === toUnit) return amount;

  // Grams <-> Milligrams
  if (fromUnit === 'g' && toUnit === 'mg') return amount * 1000;
  if (fromUnit === 'mg' && toUnit === 'g') return amount / 1000;

  // Milligrams <-> Micrograms
  if (fromUnit === 'mg' && toUnit === 'mcg') return amount * 1000;
  if (fromUnit === 'mcg' && toUnit === 'mg') return amount / 1000;

  // Grams <-> Micrograms
  if (fromUnit === 'g' && toUnit === 'mcg') return amount * 1000000;
  if (fromUnit === 'mcg' && toUnit === 'g') return amount / 1000000;

  // Specialized equivalents matching base units
  if (fromUnit === 'mcg_RAE' && toUnit === 'mcg') return amount;
  if (fromUnit === 'mcg' && toUnit === 'mcg_RAE') return amount;
  if (fromUnit === 'mg_alpha_TE' && toUnit === 'mg') return amount;
  if (fromUnit === 'mg' && toUnit === 'mg_alpha_TE') return amount;
  if (fromUnit === 'mg_NE' && toUnit === 'mg') return amount;
  if (fromUnit === 'mg' && toUnit === 'mg_NE') return amount;
  if (fromUnit === 'mcg_DFE' && toUnit === 'mcg') return amount;
  if (fromUnit === 'mcg' && toUnit === 'mcg_DFE') return amount;

  return null; // Incompatible without chemical context
}

/**
 * Calculates the percentage of reference daily value.
 * Strictly respects `hasDailyValuePercent: false` (e.g. for Total Sugars, Omega-3, Trans Fat, Caffeine, Fluoride).
 */
export function calculateDailyValuePercent(
  amount: number | null, 
  unit: NutrientUnit, 
  nutrientKey: string
): number | null {
  if (amount === null || isNaN(amount) || amount < 0) return null;

  const config = getNutrientReference(nutrientKey);
  if (!config || !config.hasDailyValuePercent || config.referenceValue === null || config.referenceValue <= 0) {
    return null;
  }

  const normalized = normalizeNutrientUnit(amount, unit, config.defaultUnit);
  if (normalized === null) return null;

  const pct = (normalized / config.referenceValue) * 100;
  return Math.round(pct * 10) / 10;
}

/**
 * Evaluates the clinical/dietary status of an intake amount relative to its reference configuration.
 */
export function evaluateNutrientStatus(
  amount: number | null, 
  unit: NutrientUnit, 
  config: NutrientReferenceConfig,
  hasEnoughData = true
): { status: EvaluatedNutrientStatus; label: string; guidance: string } {
  if (amount === null || !hasEnoughData) {
    return {
      status: 'insufficient_data',
      label: 'Insufficient Data',
      guidance: 'Data coverage is below the minimum threshold to evaluate this nutrient.'
    };
  }

  const normalized = normalizeNutrientUnit(amount, unit, config.defaultUnit);
  if (normalized === null || config.referenceValue === null) {
    return {
      status: 'informational',
      label: 'Recorded',
      guidance: 'Nutrient intake recorded for informational monitoring.'
    };
  }

  // Maximum-oriented limit (e.g. Sodium, Added Sugars, Saturated Fat, Cholesterol, Caffeine)
  if (config.direction === 'maximum_limit') {
    if (normalized > config.referenceValue) {
      return {
        status: 'above_limit',
        label: 'Above Recommended Limit',
        guidance: `Intake exceeds the recommended maximum reference of ${config.referenceValue}${config.defaultUnit}.`
      };
    }
    if (normalized >= config.referenceValue * 0.85) {
      return {
        status: 'near_limit',
        label: 'Near Limit',
        guidance: `Intake is approaching the upper boundary of ${config.referenceValue}${config.defaultUnit}.`
      };
    }
    return {
      status: 'within_limit',
      label: 'Within Limit',
      guidance: `Intake is well within the recommended threshold.`
    };
  }

  // Minimum-oriented target (e.g. Vitamins, Minerals, Fiber)
  if (config.direction === 'minimum_target') {
    if (normalized >= config.referenceValue) {
      return {
        status: 'target_met',
        label: 'Target Met',
        guidance: `Daily reference intake target (${config.referenceValue}${config.defaultUnit}) was achieved.`
      };
    }
    if (normalized >= config.referenceValue * 0.7) {
      return {
        status: 'near_target',
        label: 'Near Target',
        guidance: `Intake reached ${Math.round((normalized / config.referenceValue) * 100)}% of the reference target.`
      };
    }
    return {
      status: 'below_target',
      label: 'Below Logged Target',
      guidance: 'Intake appears below the reference target based on available meal data.'
    };
  }

  return {
    status: 'informational',
    label: 'Informational',
    guidance: 'Monitored without strict minimum or maximum reference thresholds.'
  };
}

/**
 * Safely scales a nutrient value by a serving multiplier.
 */
export function scaleNutrientValue(val: NutrientValue, multiplier: number): NutrientValue {
  if (val.amount === null || isNaN(val.amount)) {
    return { ...val, amount: null, dailyValuePercent: null };
  }

  const safeMultiplier = Math.max(0, multiplier);
  const scaledAmount = Math.round(val.amount * safeMultiplier * 100) / 100;
  const dv = calculateDailyValuePercent(scaledAmount, val.unit, val.key);

  return {
    ...val,
    amount: scaledAmount,
    dailyValuePercent: dv
  };
}

/**
 * Safely scales an entire micronutrient profile by a serving multiplier.
 */
export function scaleMicronutrientProfile(
  profile: MicronutrientProfile, 
  multiplier: number
): MicronutrientProfile {
  return {
    servingBasis: profile.servingBasis ? {
      ...profile.servingBasis,
      amount: Math.round(profile.servingBasis.amount * multiplier * 100) / 100
    } : undefined,
    vitamins: profile.vitamins.map(v => scaleNutrientValue(v, multiplier)),
    minerals: profile.minerals.map(m => scaleNutrientValue(m, multiplier)),
    otherNutrients: profile.otherNutrients.map(o => scaleNutrientValue(o, multiplier))
  };
}

/**
 * Selects top 4-6 nutrient highlights for quick card preview.
 * Excludes nulls and nutrients without substantial intake.
 */
export function selectNutrientHighlights(
  profile: MicronutrientProfile | undefined, 
  maxCount = 6
): NutrientValue[] {
  if (!profile) return [];

  const all: NutrientValue[] = [
    ...profile.vitamins,
    ...profile.minerals,
    ...profile.otherNutrients
  ].filter(n => n.amount !== null && n.amount > 0);

  // Priority ranking: High % DV first, then key essential minerals/vitamins
  const priorityKeys = new Set(['vitamin_d', 'vitamin_b12', 'vitamin_c', 'calcium', 'iron', 'magnesium', 'potassium', 'fiber', 'omega_3']);

  all.sort((a, b) => {
    const aDv = a.dailyValuePercent || 0;
    const bDv = b.dailyValuePercent || 0;
    if (aDv !== bDv) return bDv - aDv;
    const aPri = priorityKeys.has(a.key) ? 1 : 0;
    const bPri = priorityKeys.has(b.key) ? 1 : 0;
    return bPri - aPri;
  });

  return all.slice(0, maxCount);
}

/**
 * Aggregates daily micronutrients across all meals logged on a given date.
 * Note: Excludes demo fixture records if source === 'demo' unless explicitly previewed.
 */
export function aggregateDailyMicronutrients(
  meals: MealItem[], 
  options = { includeDemo: true }
): DailyMicronutrientSummaryResult {
  const filteredMeals = options.includeDemo 
    ? meals 
    : meals.filter(m => !m.micronutrients?.vitamins.some(v => v.source === 'demo'));

  const totalMealsInDay = filteredMeals.length;
  const mealsWithData = filteredMeals.filter(m => m.micronutrients !== undefined);
  const coveragePercentage = totalMealsInDay > 0 
    ? Math.round((mealsWithData.length / totalMealsInDay) * 100) 
    : 0;

  const nutrientMap = new Map<string, { 
    totalAmount: number; 
    unit: NutrientUnit; 
    mealsCount: number;
    sourceTypes: Set<string>;
  }>();

  mealsWithData.forEach(meal => {
    const prof = meal.micronutrients!;
    const list = [...prof.vitamins, ...prof.minerals, ...prof.otherNutrients];

    list.forEach(n => {
      if (n.amount === null || isNaN(n.amount) || n.amount < 0) return;

      const existing = nutrientMap.get(n.key);
      const config = getNutrientReference(n.key);
      const targetUnit = config ? config.defaultUnit : n.unit;

      const normalized = normalizeNutrientUnit(n.amount, n.unit, targetUnit);
      if (normalized === null) return;

      if (!existing) {
        nutrientMap.set(n.key, {
          totalAmount: normalized,
          unit: targetUnit,
          mealsCount: 1,
          sourceTypes: new Set(n.source ? [n.source] : [])
        });
      } else {
        existing.totalAmount += normalized;
        existing.mealsCount += 1;
        if (n.source) existing.sourceTypes.add(n.source);
      }
    });
  });

  const aggregatedList: AggregatedNutrientItem[] = [];

  nutrientMap.forEach((val, key) => {
    const config = getNutrientReference(key);
    if (!config) return;

    const roundedAmount = Math.round(val.totalAmount * 100) / 100;
    const dv = calculateDailyValuePercent(roundedAmount, val.unit, key);
    const evalResult = evaluateNutrientStatus(roundedAmount, val.unit, config, true);

    aggregatedList.push({
      key,
      name: config.name,
      shortName: config.shortName,
      category: config.category,
      totalAmount: roundedAmount,
      unit: val.unit,
      dailyValuePercent: dv,
      referenceValue: config.referenceValue,
      referenceKind: config.referenceKind,
      direction: config.direction,
      mealsReportingCount: val.mealsCount,
      status: evalResult.status,
      statusLabel: evalResult.label
    });
  });

  // Sort by displayOrder from reference dictionary
  aggregatedList.sort((a, b) => {
    const ca = getNutrientReference(a.key)?.displayOrder || 999;
    const cb = getNutrientReference(b.key)?.displayOrder || 999;
    return ca - cb;
  });

  return {
    nutrients: aggregatedList,
    totalMealsInDay,
    mealsWithMicronutrients: mealsWithData.length,
    coveragePercentage,
    hasSufficientCoverage: mealsWithData.length > 0
  };
}

/**
 * Calculates period micronutrient trends across 7, 30, or 90 days.
 * 
 * Rules:
 * - Minimum coverage threshold: at least 3 meals reporting data in the period to establish a status.
 * - Demo data is strictly excluded from user historical insights.
 * - Strict neutral phrasing (no "deficient").
 */
export function calculateMicronutrientTrends(
  meals: MealItem[], 
  dateKeys: string[],
  options = { minMealsThreshold: 3 }
): MicronutrientTrendsSummary {
  const dateSet = new Set(dateKeys);

  // Exclude demo records from real user insights
  const periodMeals = meals.filter(m => {
    if (!dateSet.has(m.date)) return false;
    // Check if meal is tagged with demo data
    const isDemo = m.micronutrients?.vitamins.some(v => v.source === 'demo');
    return !isDemo;
  });

  const totalLoggedMeals = periodMeals.length;
  const mealsWithNutrients = periodMeals.filter(m => m.micronutrients !== undefined);
  const overallCoverage = totalLoggedMeals > 0 
    ? Math.round((mealsWithNutrients.length / totalLoggedMeals) * 100) 
    : 0;

  const hasMinimumOverallCoverage = mealsWithNutrients.length >= options.minMealsThreshold;

  // Aggregate by nutrient across days
  const nutrientAgg = new Map<string, {
    totalAmount: number;
    unit: NutrientUnit;
    mealsReporting: number;
    daysWithIntake: Set<string>;
    daysTargetMet: Set<string>;
  }>();

  // Group meals by date
  const dayMap = new Map<string, MealItem[]>();
  periodMeals.forEach(m => {
    const list = dayMap.get(m.date) || [];
    list.push(m);
    dayMap.set(m.date, list);
  });

  // For each day, aggregate intake per nutrient
  dayMap.forEach((dayMeals, dateKey) => {
    const dailyNutrientSum = new Map<string, { amount: number; unit: NutrientUnit }>();

    dayMeals.forEach(meal => {
      if (!meal.micronutrients) return;
      const list = [
        ...meal.micronutrients.vitamins,
        ...meal.micronutrients.minerals,
        ...meal.micronutrients.otherNutrients
      ];

      list.forEach(n => {
        if (n.amount === null || isNaN(n.amount) || n.amount < 0) return;
        const config = getNutrientReference(n.key);
        const targetUnit = config ? config.defaultUnit : n.unit;
        const norm = normalizeNutrientUnit(n.amount, n.unit, targetUnit);
        if (norm === null) return;

        const cur = dailyNutrientSum.get(n.key) || { amount: 0, unit: targetUnit };
        cur.amount += norm;
        dailyNutrientSum.set(n.key, cur);

        const agg = nutrientAgg.get(n.key) || {
          totalAmount: 0,
          unit: targetUnit,
          mealsReporting: 0,
          daysWithIntake: new Set<string>(),
          daysTargetMet: new Set<string>()
        };
        agg.mealsReporting += 1;
        nutrientAgg.set(n.key, agg);
      });
    });

    // Check if daily target was met for this day
    dailyNutrientSum.forEach((val, key) => {
      const config = getNutrientReference(key);
      const agg = nutrientAgg.get(key);
      if (!config || !agg) return;

      agg.totalAmount += val.amount;
      agg.daysWithIntake.add(dateKey);

      if (config.referenceValue !== null && config.referenceValue > 0) {
        if (config.direction === 'minimum_target' && val.amount >= config.referenceValue) {
          agg.daysTargetMet.add(dateKey);
        } else if (config.direction === 'maximum_limit' && val.amount <= config.referenceValue) {
          agg.daysTargetMet.add(dateKey);
        }
      }
    });
  });

  const allConfigs = getAllNutrientReferences();
  const trendItems: NutrientTrendItem[] = [];

  allConfigs.forEach(config => {
    const data = nutrientAgg.get(config.key);
    const mealsReporting = data?.mealsReporting || 0;
    const hasEnoughCoverage = mealsReporting >= options.minMealsThreshold;

    const daysCount = dateKeys.length;
    const avgDaily = (data && daysCount > 0) 
      ? Math.round((data.totalAmount / daysCount) * 100) / 100 
      : null;

    const evalResult = evaluateNutrientStatus(avgDaily, config.defaultUnit, config, hasEnoughCoverage);

    const coveragePct = totalLoggedMeals > 0 
      ? Math.round((mealsReporting / totalLoggedMeals) * 100) 
      : 0;

    trendItems.push({
      key: config.key,
      name: config.name,
      shortName: config.shortName,
      category: config.category,
      avgDailyIntake: hasEnoughCoverage ? avgDaily : null,
      unit: config.defaultUnit,
      referenceValue: config.referenceValue,
      direction: config.direction,
      daysMeetingTarget: data?.daysTargetMet.size || 0,
      daysEvaluated: daysCount,
      dataCoveragePercent: coveragePct,
      totalMealsReporting: mealsReporting,
      status: evalResult.status,
      statusLabel: evalResult.label,
      guidanceText: evalResult.guidance
    });
  });

  // Highlight categories
  const frequentlyBelowTarget = trendItems.filter(t => t.status === 'below_target' || t.status === 'above_limit');
  const consistentlyMeetingTarget = trendItems.filter(t => t.status === 'target_met' || t.status === 'within_limit');

  return {
    periodDays: dateKeys.length,
    totalLoggedMeals,
    mealsWithMicronutrientData: mealsWithNutrients.length,
    overallCoveragePercent: overallCoverage,
    hasMinimumCoverage: hasMinimumOverallCoverage,
    nutrients: trendItems,
    frequentlyBelowTarget,
    consistentlyMeetingTarget
  };
}
