import { tr, trHtml } from '../../i18n/index.ts';
import { exerciseLabel } from '../../i18n/fitnessLabels.ts';
import { store } from '../../store/appState.ts';
import { calculateRecompMatrix, type RecompMatrix, type RecompStatus } from '../../services/phasicRecompService.ts';
import { RECOMP_STATUS_LABELS as STATUS_LABELS } from '../../utils/phasicInsightCalculations.ts';
import { getTodayKey, parseLocalDateKey } from '../../utils/dateUtils.ts';
import { getLocale } from '../../i18n/index.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';
import { escapeHtml } from '../../utils/sanitize.ts';

const STATUS_NOTES: Record<RecompStatus, string> = {
  insufficient_data: 'Log weight on at least 3 days in each seven-day window and complete comparable loaded exercises in both windows.',
  optimal_recomp: 'Weight is trending down while comparable exercise strength is maintained or higher.',
  strength_declining: 'Comparable estimated strength declined. Review recovery and training alongside your weight trend.',
  building_strength: 'Comparable estimated strength increased. Check the weight trend alongside your goal.',
  weight_rising: 'The weight trend is rising while comparable strength is broadly maintained.',
  stable: 'Weight and comparable strength are broadly stable over these windows.',
};

function signed(value: number | null, precision = 2): string {
  return `${typeof value === 'number' && value > 0 ? '+' : ''}${formatDisplayNumber(value, precision)}`;
}

function dateLabel(key: string): string {
  return parseLocalDateKey(key).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' });
}

function renderMatrix(data: RecompMatrix): string {
  const point = data.point;
  // Keep the display bounded; full numeric changes always appear outside the SVG.
  const weightScale = Math.max(1, Math.min(5, Math.abs(point?.x ?? 0) * 1.2));
  const strengthScale = Math.max(5, Math.min(20, Math.abs(point?.y ?? 0) * 1.2));
  const left = 38;
  const top = 24;
  const width = 250;
  const height = 160;
  const mapX = (value: number) => left + (Math.max(-weightScale, Math.min(weightScale, value)) + weightScale) / (weightScale * 2) * width;
  const mapY = (value: number) => top + (strengthScale - Math.max(-strengthScale, Math.min(strengthScale, value))) / (strengthScale * 2) * height;
  const weightBoundary = mapX(-data.thresholds.weightStablePercent);
  const strengthBoundary = mapY(data.thresholds.strengthMaintainedFloorPercent);
  const pointColor = data.status === 'optimal_recomp' ? 'var(--ui-primary)'
    : data.status === 'strength_declining' ? 'var(--ui-error)' : 'var(--ui-text)';
  const clipped = point !== null && (Math.abs(point.x) > weightScale || Math.abs(point.y) > strengthScale);
  const chartDescription = point
    ? tr('Weight change {0}%; comparable strength change {1}%. {2}.', signed(point.x), signed(point.y), tr(STATUS_LABELS[data.status]))
    : tr('Matrix has no point until there is enough comparable weight and strength data.');

  return `
    <section class="phasic-tool-card space-y-3">
      <p class="font-bold">${trHtml('Weight trend vs comparable strength')}</p>
      <div class="flex flex-wrap justify-between gap-2 phasic-tool-muted text-sm"><span>${trHtml('Weight down')}</span><span>${trHtml('Weight up')}</span></div>
      <svg class="w-full" viewBox="0 0 320 218" role="img" aria-label="${escapeHtml(chartDescription)}">
        <rect x="${left}" y="${top}" width="${width}" height="${height}" rx="12" fill="var(--ui-panel-high)" />
        <rect x="${left}" y="${top}" width="${weightBoundary - left}" height="${strengthBoundary - top}" rx="10" fill="var(--ui-primary)" opacity="0.15" />
        <rect x="${left}" y="${strengthBoundary}" width="${width}" height="${top + height - strengthBoundary}" fill="var(--ui-error)" opacity="0.08" />
        <line x1="${mapX(0)}" y1="${top}" x2="${mapX(0)}" y2="${top + height}" stroke="var(--ui-muted)" stroke-width="1" opacity="0.5" />
        <line x1="${left}" y1="${mapY(0)}" x2="${left + width}" y2="${mapY(0)}" stroke="var(--ui-muted)" stroke-width="1" opacity="0.5" />
        <line x1="${weightBoundary}" y1="${top}" x2="${weightBoundary}" y2="${top + height}" stroke="var(--ui-primary)" stroke-dasharray="4 4" opacity="0.8" />
        <line x1="${left}" y1="${strengthBoundary}" x2="${left + width}" y2="${strengthBoundary}" stroke="var(--ui-primary)" stroke-dasharray="4 4" opacity="0.8" />
        <text x="${left - 4}" y="${top + 4}" text-anchor="end" fill="var(--ui-muted)" font-size="11">+${formatDisplayNumber(strengthScale, 0)}%</text>
        <text x="${left - 4}" y="${mapY(0) + 4}" text-anchor="end" fill="var(--ui-muted)" font-size="11">0</text>
        <text x="${left - 4}" y="${top + height}" text-anchor="end" fill="var(--ui-muted)" font-size="11">−${formatDisplayNumber(strengthScale, 0)}%</text>
        <text x="${left}" y="${top + height + 20}" text-anchor="start" fill="var(--ui-muted)" font-size="11">−${formatDisplayNumber(weightScale, 1)}%</text>
        <text x="${mapX(0)}" y="${top + height + 20}" text-anchor="middle" fill="var(--ui-muted)" font-size="11">0</text>
        <text x="${left + width}" y="${top + height + 20}" text-anchor="end" fill="var(--ui-muted)" font-size="11">+${formatDisplayNumber(weightScale, 1)}%</text>
        ${point ? `<circle cx="${mapX(point.x)}" cy="${mapY(point.y)}" r="8" fill="${pointColor}" stroke="var(--ui-card)" stroke-width="3" />` : ''}
      </svg>
      <p class="phasic-tool-muted text-sm">${trHtml('Vertical axis: change in estimated strength. Green area: weight down with strength maintained or increased.')}</p>
      ${clipped ? `<p class="phasic-tool-muted text-sm">${trHtml('The point reaches the chart boundary. Exact changes are shown below.')}</p>` : ''}
      ${!point ? `<p class="phasic-tool-note">${trHtml('Matrix has no point until there is enough comparable weight and strength data.')}</p>` : ''}
    </section>
  `;
}

/** Uses recorded body weight and matched exercise performance; it does not infer body composition. */
export function renderRecompMatrix(): string {
  const state = store.getState();
  const data = calculateRecompMatrix(state.weightHistory, state.workoutHistory, getTodayKey());
  const color = data.status === 'optimal_recomp' ? 'var(--ui-primary)'
    : data.status === 'strength_declining' ? 'var(--ui-error)' : 'var(--ui-text)';

  return `
    <div class="space-y-4">
      <p class="phasic-tool-muted">${trHtml('Compare the latest seven days with the previous seven days using your weight diary and completed workouts.')}</p>
      <section class="phasic-tool-card space-y-2">
        <h3 class="font-heading font-extrabold text-xl" style="color:${color}">${trHtml(STATUS_LABELS[data.status])}</h3>
        <p class="phasic-tool-muted">${trHtml(STATUS_NOTES[data.status])}</p>
      </section>
      ${renderMatrix(data)}
      <div class="phasic-responsive-pair grid grid-cols-2 gap-3">
        <section class="phasic-tool-card min-w-0 space-y-2">
          <h3 class="font-bold">${trHtml('Previous seven days')}</h3>
          <p class="phasic-tool-muted text-sm">${trHtml('{0} to {1}', dateLabel(data.previousWindow.startDate), dateLabel(data.previousWindow.endDate))}</p>
          <p class="font-heading font-extrabold text-xl break-words">${formatDisplayNumber(data.previousWeightAverageKg)} <span class="text-sm">${trHtml('kg')}</span></p>
          <p class="phasic-tool-muted text-sm">${trHtml('{0} weigh-in days', formatDisplayNumber(data.previousWeightDayCount, 0))}</p>
        </section>
        <section class="phasic-tool-card min-w-0 space-y-2">
          <h3 class="font-bold">${trHtml('Latest seven days')}</h3>
          <p class="phasic-tool-muted text-sm">${trHtml('{0} to {1}', dateLabel(data.currentWindow.startDate), dateLabel(data.currentWindow.endDate))}</p>
          <p class="font-heading font-extrabold text-xl break-words">${formatDisplayNumber(data.currentWeightAverageKg)} <span class="text-sm">${trHtml('kg')}</span></p>
          <p class="phasic-tool-muted text-sm">${trHtml('{0} weigh-in days', formatDisplayNumber(data.currentWeightDayCount, 0))}</p>
        </section>
      </div>
      <section class="phasic-tool-card space-y-3">
        <div class="flex flex-wrap items-start justify-between gap-2"><span class="font-bold">${trHtml('Average weight change')}</span><strong>${signed(data.weightChangeKg)} ${trHtml('kg')} (${signed(data.weightChangePercent)}%)</strong></div>
        <div class="flex flex-wrap items-start justify-between gap-2"><span class="font-bold">${trHtml('Comparable strength change')}</span><strong>${signed(data.strengthChangePercent)}%</strong></div>
        <p class="phasic-tool-muted text-sm">${trHtml('Weight requires at least {0} recorded days per window. Strength uses the median change in matched exercises’ best Epley estimated 1RM.', data.thresholds.minimumWeightDaysPerWindow)}</p>
        <p class="phasic-tool-muted text-sm">${trHtml('Only supported loaded repetition sets are compared; assisted, timed and bodyweight movements are excluded.')}</p>
        ${data.missingWeightData ? `<p class="phasic-tool-note">${trHtml('More weigh-in days are needed before classifying the trend.')}</p>` : ''}
        ${data.missingComparableStrength ? `<p class="phasic-tool-note">${trHtml('Complete the same loaded exercise in both windows. Bodyweight or unmatched exercises cannot provide a comparable 1RM trend.')}</p>` : ''}
      </section>
      <section class="phasic-tool-card space-y-3">
        <h3 class="font-heading font-bold">${trHtml('Comparable exercise strength')}</h3>
        ${data.strengthComparisons.length ? `<table class="w-full table-fixed text-sm">
          <caption class="sr-only">${trHtml('Previous and latest best estimated 1RM by exercise')}</caption>
          <thead><tr><th class="text-left py-2 break-words">${trHtml('Previous')}</th><th class="text-left py-2 break-words">${trHtml('Latest')}</th><th class="text-right py-2 break-words">${trHtml('Change')}</th></tr></thead>
          ${data.strengthComparisons.map(exercise => `<tbody>
            <tr><th colspan="3" scope="rowgroup" class="text-left pt-3 pb-2 break-words">${escapeHtml(exerciseLabel(exercise.exerciseName))}</th></tr>
            <tr><td class="pb-3 pr-2 break-words">${formatDisplayNumber(exercise.previousEstimated1RMKg)} ${trHtml('kg')}</td><td class="pb-3 pr-2 break-words">${formatDisplayNumber(exercise.currentEstimated1RMKg)} ${trHtml('kg')}</td><td class="pb-3 text-right break-words">${signed(exercise.changePercent)}%</td></tr>
          </tbody>`).join('')}
        </table>` : `<p class="phasic-tool-muted">${trHtml('No comparable loaded exercises yet.')}</p>`}
      </section>
      <section class="phasic-tool-card space-y-3">
        <h3 class="font-heading font-bold">${trHtml('Workout volume context')}</h3>
        <dl class="space-y-3">
          <div><dt class="phasic-tool-muted">${trHtml('Previous seven days')}</dt><dd class="font-bold break-words">${data.previousWorkoutCount > 0 ? trHtml('{0} kg·reps across {1} workouts', formatDisplayNumber(data.previousVolumeKg, 0), formatDisplayNumber(data.previousWorkoutCount, 0)) : trHtml('No supported loaded workouts')}</dd></div>
          <div><dt class="phasic-tool-muted">${trHtml('Latest seven days')}</dt><dd class="font-bold break-words">${data.currentWorkoutCount > 0 ? trHtml('{0} kg·reps across {1} workouts', formatDisplayNumber(data.currentVolumeKg, 0), formatDisplayNumber(data.currentWorkoutCount, 0)) : trHtml('No supported loaded workouts')}</dd></div>
        </dl>
        <p class="phasic-tool-muted text-sm">${trHtml('Volume sums completed sets: external load × actual reps. Exercise selection and set count can change volume, so it is context rather than the strength score.')}</p>
      </section>
      <p class="phasic-tool-note">${trHtml('Optimal Recomp is a training trend label, not a measurement of fat loss or muscle gain. Weight varies with hydration, and estimated 1RM is not a tested maximum.')}</p>
      <p class="phasic-tool-muted text-sm">${trHtml('Planning thresholds: weight down more than {0}%; strength maintained within {1}% of the previous window.', formatDisplayNumber(data.thresholds.weightStablePercent), formatDisplayNumber(Math.abs(data.thresholds.strengthMaintainedFloorPercent)))}</p>
    </div>
  `;
}
