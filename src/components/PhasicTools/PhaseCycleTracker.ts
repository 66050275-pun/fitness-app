import { getLocale, trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState.ts';
import { getPhaseCycleProgress, type PhaseCycleProgress } from '../../services/phasicRecompService.ts';
import { getTodayKey, parseLocalDateKey } from '../../utils/dateUtils.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';
import { escapeHtml } from '../../utils/sanitize.ts';
import type { PhasicCycle } from '../../types/index.ts';

function dateLabel(key: string): string {
  return parseLocalDateKey(key).toLocaleDateString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderProgress(cycle: PhasicCycle, progress: PhaseCycleProgress): string {
  const effective = store.getEffectiveNutritionGoals(getTodayKey());
  const stateLabel = progress.status === 'upcoming' ? 'Upcoming cycle'
    : progress.status === 'completed' ? 'Cycle completed' : 'Active cycle';
  return `
    <section class="phasic-tool-card space-y-3">
      <div class="flex items-start justify-between gap-3">
        <p class="font-heading font-bold">${trHtml(cycle.program === 'mini_cut' ? 'Mini Cut' : 'Lean Bulk')}</p>
        <span class="text-sm font-bold text-right">${trHtml(stateLabel)}</span>
      </div>
      <p class="font-heading text-2xl font-extrabold">${progress.status === 'upcoming'
        ? trHtml('Starts in {0} days', formatDisplayNumber(progress.daysUntilStart, 0))
        : trHtml('Week {0} of {1}', formatDisplayNumber(progress.weekNumber, 0), formatDisplayNumber(cycle.lengthWeeks, 0))}</p>
      <p class="phasic-tool-muted">${trHtml('Day {0} of {1}', formatDisplayNumber(progress.dayNumber, 0), formatDisplayNumber(progress.totalDays, 0))}</p>
      <div class="h-2 rounded-full overflow-hidden" style="background:var(--ui-panel-high)" role="progressbar" aria-label="${trHtml('Cycle progress')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress.progressRatio * 100)}">
        <div class="h-full rounded-full" style="width:${Math.max(0, Math.min(100, progress.progressRatio * 100))}%;background:var(--ui-primary)"></div>
      </div>
      <p class="phasic-tool-muted">${trHtml('{0} to {1}', dateLabel(progress.startDate), dateLabel(progress.endDate))}</p>
      ${progress.status === 'active' ? `<p class="font-bold">${trHtml('{0} days remaining, including today', formatDisplayNumber(progress.daysRemaining, 0))}</p>` : ''}
      ${progress.isRefeedDay ? `<div class="phasic-tool-note">
        <p class="font-bold">${trHtml('Today is a scheduled refeed day')}</p>
        <p class="mt-1">${trHtml('Today’s allowance: {0} kcal and {1} g carbs', formatDisplayNumber(effective.calorieTarget, 0), formatDisplayNumber(effective.carbsTarget))}</p>
        <p class="mt-1">${trHtml('+{0} kcal from +{1} g carbs', formatDisplayNumber(progress.extraCalories, 0), formatDisplayNumber(progress.extraCarbsGrams))}</p>
      </div>` : ''}
      ${progress.status === 'completed' ? `<p class="phasic-tool-note">${trHtml('This schedule has ended. Your saved nutrition targets remain active until you change goals or save a new cycle.')}</p>` : ''}
    </section>
  `;
}

/** A saved cycle schedules allowances on calendar days without logging consumption. */
export function renderPhaseCycleTracker(): string {
  const state = store.getState();
  const program = state.userProfile.dietProgram;
  if (program !== 'mini_cut' && program !== 'lean_bulk') {
    return `<p class="phasic-tool-note">${trHtml('Choose Mini Cut or Lean Bulk in Goal Settings to use phase tracking.')}</p>`;
  }
  const today = getTodayKey();
  const cycle = state.phasicTools.phaseCycle?.program === program ? state.phasicTools.phaseCycle : null;
  const progress = cycle ? getPhaseCycleProgress(cycle, today, state.nutritionGoals.calorieTarget) : null;
  const startDate = cycle?.startDate ?? today;
  const lengthWeeks = cycle?.lengthWeeks ?? 4;
  const refeedExtraCalories = cycle?.refeedExtraCalories ?? 400;
  const miniCut = program === 'mini_cut';

  return `
    <div class="space-y-4">
      <p class="phasic-tool-muted">${trHtml('Set a cycle for your saved program. Weekly refeeds add a day-specific carbohydrate allowance without changing your baseline targets.')}</p>
      ${cycle && progress ? renderProgress(cycle, progress) : `<p class="phasic-tool-note">${trHtml('No cycle is scheduled yet. Save the dates below to start tracking.')}</p>`}
      <form novalidate class="phasic-tool-card space-y-4" onsubmit="event.preventDefault(); window.phasicSaveCycle()">
        <label class="block space-y-2" for="phasic-cycle-start">
          <span class="font-bold">${trHtml('Cycle start date')}</span>
          <input id="phasic-cycle-start" data-dialog-draft class="phasic-tool-input w-full min-w-0" type="date" value="${escapeHtml(startDate)}" required />
        </label>
        <label class="block space-y-2" for="phasic-cycle-weeks">
          <span class="font-bold">${trHtml('Cycle length in weeks')}</span>
          <input id="phasic-cycle-weeks" data-dialog-draft class="phasic-tool-input w-full" type="number" inputmode="numeric" min="3" max="${miniCut ? 6 : 24}" step="1" value="${lengthWeeks}" required aria-describedby="phasic-cycle-length-note" />
        </label>
        <p id="phasic-cycle-length-note" class="phasic-tool-muted">${miniCut
          ? trHtml('Choose 3–6 weeks for Mini Cut. The schedule stops at the end of the selected cycle.')
          : trHtml('Choose 3–24 weeks for Lean Bulk. Weekly refeed allowances are only scheduled during Mini Cut.')}</p>
        ${miniCut ? `<label class="block space-y-2" for="phasic-cycle-refeed">
          <span class="font-bold">${trHtml('Weekly refeed extra calories')}</span>
          <input id="phasic-cycle-refeed" data-dialog-draft class="phasic-tool-input w-full" type="number" inputmode="numeric" min="300" max="500" step="50" value="${refeedExtraCalories}" required aria-describedby="phasic-cycle-refeed-note" />
        </label>
        <p id="phasic-cycle-refeed-note" class="phasic-tool-muted">${trHtml('Add 300–500 kcal from carbohydrates on days 7, 14 and each following week. This increases the budget; food still needs to be logged.')}</p>` : ''}
        <p id="phasic-cycle-feedback" class="phasic-tool-error" role="alert" tabindex="-1"></p>
        <button class="ui-primary-button" type="submit">${trHtml(cycle ? 'Save cycle changes' : 'Start cycle')}</button>
        ${cycle ? `<button class="phasic-tool-secondary w-full" type="button" onclick="window.phasicStopCycle()">${trHtml(progress?.status === 'completed' ? 'Clear cycle' : 'Stop cycle')}</button>` : ''}
      </form>
      ${cycle && progress && miniCut ? `<section class="space-y-3" aria-label="${trHtml('Weekly refeed schedule')}">
        <h3 class="font-heading font-bold">${trHtml('Weekly refeed schedule')}</h3>
        ${progress.refeedDates.map(key => {
          const allowance = store.getEffectiveNutritionGoals(key);
          const status = key < today ? 'Past refeed date' : key === today ? 'Today' : 'Scheduled';
          return `<div class="phasic-tool-card flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0"><p class="font-bold">${escapeHtml(dateLabel(key))}</p><p class="phasic-tool-muted">${trHtml(status)}</p></div>
            <div class="min-w-0"><p class="font-bold">${trHtml('+{0} kcal · +{1} g carbs', formatDisplayNumber(cycle.refeedExtraCalories, 0), formatDisplayNumber(cycle.refeedExtraCalories / 4))}</p>
            <p class="phasic-tool-muted">${trHtml('Allowance: {0} kcal', formatDisplayNumber(allowance.calorieTarget, 0))}</p></div>
          </div>`;
        }).join('')}
        <p class="phasic-tool-note">${trHtml('Past dates indicate a completed calendar interval, not proof that a refeed was eaten. Protein and fat targets stay unchanged on refeed days.')}</p>
      </section>` : ''}
    </div>
  `;
}
