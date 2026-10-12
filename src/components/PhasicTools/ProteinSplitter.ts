import { trHtml } from '../../i18n/index.ts';
import { splitProteinTarget } from '../../services/phasicRecompService.ts';
import { store } from '../../store/appState.ts';
import { getTodayKey } from '../../utils/dateUtils.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';

const INTERVAL_ICONS = {
  breakfast: 'wb_twilight',
  lunch: 'light_mode',
  workout: 'fitness_center',
  pre_workout: 'fitness_center',
  post_workout: 'exercise',
  dinner: 'dark_mode',
} as const;

/** Uses the saved daily target; a split never raises it to fit a benchmark. */
export function renderProteinSplitter(): string {
  const state = store.getState();
  const goals = store.getEffectiveNutritionGoals(getTodayKey());
  const count = state.phasicTools.proteinMealCount;
  const split = splitProteinTarget(goals.proteinTarget, count);

  return `
    <div class="flex flex-col gap-4">
      <p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('Spread your saved protein target across four or five meal intervals.')}</p>
      <section class="phasic-tool-card text-center">
        <p class="phasic-tool-muted text-sm">${trHtml('Daily protein target')}</p>
        <p class="font-heading font-extrabold text-4xl mt-2 text-primary dark:text-primary-fixed break-words">${trHtml('{0} g', formatDisplayNumber(goals.proteinTarget))}</p>
        <p class="phasic-tool-muted text-sm mt-2">${trHtml('Your saved target stays unchanged.')}</p>
      </section>

      <div class="flex gap-2" role="group" aria-label="${trHtml('Number of protein intervals')}">
        ${([4, 5] as const).map(meals => `
          <button type="button" class="flex-1 min-w-0 min-h-12 px-3 py-3 rounded-xl font-heading font-bold text-sm border ${count === meals ? 'bg-primary text-white border-primary' : 'phasic-tool-secondary'}" aria-pressed="${count === meals}" onclick="window.phasicSetProteinMeals(${meals})">
            ${trHtml('{0} intervals', formatDisplayNumber(meals, 0))}
          </button>
        `).join('')}
      </div>
      ${split.isFeasible
        ? `<p class="phasic-tool-note text-sm leading-relaxed">${trHtml('Each interval reaches the {0} g protein planning benchmark.', formatDisplayNumber(split.minimumPerMealGrams, 0))}</p>`
        : `<p class="phasic-tool-note text-sm leading-relaxed" role="status">${trHtml('Your {0} g target cannot provide {1} g across {2} intervals. This plan divides the actual target without increasing it.', formatDisplayNumber(split.targetGrams), formatDisplayNumber(split.minimumPerMealGrams, 0), formatDisplayNumber(count, 0))}</p>`}

      <ol class="flex flex-col gap-3" aria-label="${trHtml('Suggested protein intervals')}">
        ${split.intervals.map((interval, index) => `
          <li class="phasic-tool-card flex items-center gap-3">
            <span class="w-11 h-11 rounded-full bg-primary/10 dark:bg-primary-fixed/10 text-primary dark:text-primary-fixed flex items-center justify-center shrink-0" aria-hidden="true">
              <span class="material-symbols-outlined">${INTERVAL_ICONS[interval.id]}</span>
            </span>
            <div class="flex-1 min-w-0">
              <p class="phasic-tool-muted text-sm">${trHtml('Interval {0}', formatDisplayNumber(index + 1, 0))}</p>
              <h3 class="font-heading font-bold text-sm mt-0.5">${trHtml(interval.label)}</h3>
              <p class="text-sm mt-1 ${interval.meetsMinimum ? 'text-primary dark:text-primary-fixed' : 'text-amber-800 dark:text-amber-300'}">${interval.meetsMinimum ? trHtml('Benchmark met') : trHtml('Below planning benchmark')}</p>
            </div>
            <p class="font-heading font-extrabold text-xl text-right shrink-0">${trHtml('{0} g', formatDisplayNumber(interval.proteinGrams))}</p>
          </li>
        `).join('')}
      </ol>

      <div class="phasic-tool-card flex items-center justify-between flex-wrap gap-2">
        <p class="font-heading font-bold">${trHtml('Planned daily total')}</p>
        <p class="font-heading font-extrabold text-xl">${trHtml('{0} g', formatDisplayNumber(split.targetGrams))}</p>
      </div>
      <p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('Whole-gram allocations add up to the rounded daily target. Intervals are a plan; no meals are logged automatically.')}</p>
      <p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('The 30 g protein benchmark does not measure leucine. Food sources and individual needs vary.')}</p>
    </div>
  `;
}
