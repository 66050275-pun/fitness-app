import { tr } from '../i18n/index.ts';
import type { FoodAnalysisProgress } from '../types/index.ts';

export function normalizeFoodScanProgress(value: unknown): FoodAnalysisProgress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const p = value as Record<string, unknown>;
  const stages: readonly string[] = ['preparing', 'meal', 'nutrients', 'combining', 'complete'];
  if (typeof p.percent !== 'number' || !Number.isInteger(p.percent) || p.percent < 0 || p.percent > 100
    || typeof p.stage !== 'string' || !stages.includes(p.stage)
    || typeof p.totalBatches !== 'number' || !Number.isInteger(p.totalBatches) || p.totalBatches < 1 || p.totalBatches > 20
    || typeof p.completedBatches !== 'number' || !Number.isInteger(p.completedBatches) || p.completedBatches < 0 || p.completedBatches > p.totalBatches) return null;
  return { percent: p.percent, stage: p.stage as FoodAnalysisProgress['stage'],
    completedBatches: p.completedBatches, totalBatches: p.totalBatches };
}

/** The percentage is a completed-workflow milestone, not a clock or an upload-byte estimate. */
export function foodScanProgressLabel(progress: FoodAnalysisProgress): string {
  switch (progress.stage) {
    case 'preparing': return tr('Preparing photo locally…');
    case 'meal': return tr('Identifying the meal and primary nutrition…');
    case 'nutrients': return tr('Nutrient batches processed: {0} of {1}.', progress.completedBatches, progress.totalBatches);
    case 'combining': return tr('Combining and checking results…');
    case 'complete': return tr('Analysis ready for review.');
  }
}
