import type { DietProgram, UserProfile, WeightGoalDraft, WeightGoalType } from '../types/index.ts';

export function normalizeDietProgram(value: unknown): DietProgram {
  return value === 'mini_cut' || value === 'lean_bulk' ? value : 'standard';
}

/** One source of truth: only a saved special program unlocks the tools. */
export function isSpecialProgramUnlocked(profile: Pick<UserProfile, 'dietProgram'>): boolean {
  return normalizeDietProgram(profile.dietProgram) !== 'standard';
}

export function createWeightGoalDraft(profile: Partial<UserProfile>): WeightGoalDraft {
  const dietProgram = normalizeDietProgram(profile.dietProgram);
  const weightGoalType: WeightGoalType = dietProgram === 'mini_cut' ? 'lose'
    : dietProgram === 'lean_bulk' ? 'gain'
      : profile.weightGoalType === 'lose' || profile.weightGoalType === 'gain' ? profile.weightGoalType : 'maintain';
  const rawRate = profile.weeklyGoalRateKg;
  const magnitude = typeof rawRate === 'number' && Number.isFinite(rawRate) ? Math.abs(rawRate) : 0;
  const rate = [0, 0.25, 0.5, 0.75].reduce((a, b) => Math.abs(b - magnitude) < Math.abs(a - magnitude) ? b : a);
  const target = profile.targetWeightKg;
  const date = profile.targetDate;
  return {
    dietProgram,
    weightGoalType,
    targetWeightKg: typeof target === 'number' && Number.isFinite(target) && target >= 20 && target <= 500
      ? Math.round(target * 10) / 10 : null,
    targetDate: typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    weeklyGoalRateKg: weightGoalType === 'lose' ? -rate : weightGoalType === 'gain' ? rate : 0,
  };
}
