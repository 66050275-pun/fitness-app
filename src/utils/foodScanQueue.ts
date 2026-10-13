import { tr } from '../i18n/index.ts';
import type { FoodScanItem, FoodScanState } from '../types/index.ts';

export const MAX_SCAN_PHOTOS = 5;

export function createFoodScanItem(photoUrl: string | null): FoodScanItem {
  return { id: crypto.randomUUID(), photoUrl, dishHint: '', status: 'ready', progress: null, error: null,
    choices: null, selectedCandidateId: null, result: null, review: null };
}

export function scanItemStatus(item: FoodScanItem): string {
  const labels: Record<FoodScanItem['status'], string> = {
    ready: 'Ready to analyze', queued: 'Waiting in queue', analyzing: 'Analyzing food',
    needs_choice: 'Choose the food', review: 'Ready to review', error: 'Needs attention', saved: 'Logged', skipped: 'Skipped'
  };
  return tr(labels[item.status]);
}

/** Completed milestones across the queue, including failures/skips as handled items. */
export function scanQueuePercent(scan: FoodScanState): number {
  if (!scan.items.length) return 0;
  const total = scan.items.reduce((sum, item) => sum + (
    ['review', 'saved', 'skipped', 'error'].includes(item.status) ? 100
      : item.status === 'needs_choice' || (item.status === 'queued' && item.selectedCandidateId) ? 30
        : item.progress?.percent ?? 0), 0);
  return Math.max(0, Math.min(100, Math.floor(total / scan.items.length)));
}

export function scanActivityLabel(scan: FoodScanState): string {
  const choices = scan.items.filter(item => item.status === 'needs_choice').length;
  if (choices) return tr('Choose food for {0} photo(s)', choices);
  if (scan.running) return tr('Analyzing your food');
  const ready = scan.items.filter(item => item.status === 'review').length;
  if (ready) return tr('{0} result(s) ready to review', ready);
  if (scan.items.some(item => item.status === 'error')) return tr('A photo needs attention');
  return tr('Food analysis paused');
}

export function scanActivityDetail(scan: FoodScanState): string {
  return tr('{0} ready · {1} choose · {2} errors', scan.items.filter(item => item.status === 'review').length,
    scan.items.filter(item => item.status === 'needs_choice').length, scan.items.filter(item => item.status === 'error').length);
}
