import { tr, trHtml } from '../../i18n/index.ts';
import { getProteinRadar, type ProteinMealBreakdown, type ProteinRadar } from '../../services/phasicRecompService.ts';
import { store } from '../../store/appState.ts';
import { getTodayKey } from '../../utils/dateUtils.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';
import { escapeHtml } from '../../utils/sanitize.ts';

function statusLabel(group: ProteinMealBreakdown): string {
  if (group.benchmarkStatus === 'empty') return 'Not logged';
  if (group.benchmarkStatus === 'unknown') return 'Protein incomplete';
  if (group.benchmarkStatus === 'below') return 'Below 30 g benchmark';
  return 'Benchmark met';
}

function statusColor(group: ProteinMealBreakdown): string {
  if (group.benchmarkStatus === 'empty' || group.benchmarkStatus === 'unknown') return 'var(--ui-muted)';
  return group.belowBenchmark ? '#b45309' : 'var(--ui-primary)';
}

/** Missing groups remain undrawn; unknown nutrients are not represented as zero. */
function renderRadarChart(radar: ProteinRadar): string {
  const center = 140;
  const radius = 88;
  const vectors = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  const points = radar.groups.map((group, index) => {
    const value = Math.max(0, Math.min(1, group.progressRatio));
    const vector = vectors[index];
    return { x: center + vector.x * radius * value, y: center + vector.y * radius * value };
  });
  const completeGroups = radar.groups.every(group => group.entryCount > 0 && group.unknownEntryCount === 0);

  return `
    <svg viewBox="0 0 280 280" class="w-full max-w-[280px] mx-auto" aria-hidden="true" focusable="false">
      ${[0.33, 0.66, 1].map(ratio => `<polygon points="${center},${center - radius * ratio} ${center + radius * ratio},${center} ${center},${center + radius * ratio} ${center - radius * ratio},${center}" fill="none" stroke="var(--ui-border)" stroke-width="${ratio === 1 ? 2 : 1}" ${ratio === 1 ? '' : 'stroke-dasharray="3 4"'} />`).join('')}
      ${vectors.map(vector => `<line x1="${center}" y1="${center}" x2="${center + vector.x * radius}" y2="${center + vector.y * radius}" stroke="var(--ui-border)" stroke-width="1" />`).join('')}
      ${completeGroups ? `<polygon points="${points.map(point => `${point.x},${point.y}`).join(' ')}" fill="var(--ui-primary-soft)" stroke="var(--ui-primary)" stroke-width="2" />` : ''}
      ${radar.groups.map((group, index) => {
        const point = points[index];
        const vector = vectors[index];
        const labelX = center + vector.x * (radius + 25);
        const labelY = center + vector.y * (radius + 25) + 5;
        return `
          <text x="${labelX}" y="${labelY}" text-anchor="middle" font-family="Inter, sans-serif" font-size="15" font-weight="700" fill="var(--ui-text)">${escapeHtml(formatDisplayNumber(index + 1, 0))}</text>
          ${group.entryCount && group.knownProteinGrams > 0 ? `
            <line x1="${center}" y1="${center}" x2="${point.x}" y2="${point.y}" stroke="${statusColor(group)}" stroke-width="5" stroke-linecap="round" ${group.unknownEntryCount ? 'stroke-dasharray="4 5"' : ''} />
            <circle cx="${point.x}" cy="${point.y}" r="5" fill="${group.unknownEntryCount ? 'var(--ui-card)' : statusColor(group)}" stroke="${statusColor(group)}" stroke-width="2" />
          ` : ''}
        `;
      }).join('')}
      <circle cx="${center}" cy="${center}" r="4" fill="var(--ui-primary)" />
    </svg>
  `;
}

function renderMealGroup(group: ProteinMealBreakdown, index: number): string {
  const progressPercent = Math.min(100, Math.max(0, group.progressRatio * 100));
  const amount = group.entryCount === 0
    ? trHtml('Not logged')
    : group.unknownEntryCount > 0
      ? trHtml('{0} g known', formatDisplayNumber(group.knownProteinGrams))
      : trHtml('{0} g', formatDisplayNumber(group.knownProteinGrams));
  const badgeClass = group.benchmarkStatus === 'met'
    ? 'text-primary dark:text-primary-fixed bg-primary/10 dark:bg-primary-fixed/10'
    : group.benchmarkStatus === 'below'
      ? 'text-amber-800 dark:text-amber-300 bg-amber-500/10'
      : 'phasic-tool-muted bg-surface-container dark:bg-dark-surface-card-high';

  return `
    <li class="phasic-tool-card flex flex-col gap-3">
      <div class="flex items-start gap-3">
        <span class="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary-fixed/10 text-primary dark:text-primary-fixed flex items-center justify-center font-heading font-bold shrink-0" aria-hidden="true">${formatDisplayNumber(index + 1, 0)}</span>
        <div class="min-w-0 flex-1">
          <h3 class="font-heading font-bold text-base">${trHtml(group.mealType)}</h3>
          <p class="phasic-tool-muted text-sm mt-1">${group.entryCount ? trHtml('{0} logged entries', formatDisplayNumber(group.entryCount, 0)) : trHtml('No entries in this meal group.')}</p>
        </div>
        <p class="font-heading font-bold text-base text-right shrink-0 max-w-[45%] break-words">${amount}</p>
      </div>
      <div class="h-2 rounded-full overflow-hidden bg-surface-container dark:bg-dark-surface-card-high" ${group.entryCount ? `role="progressbar" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${Math.min(30, group.knownProteinGrams)}" aria-label="${trHtml('{0}: {1} g known protein toward the 30 g benchmark', tr(group.mealType), formatDisplayNumber(group.knownProteinGrams))}"` : 'aria-hidden="true"'}>
        <div class="h-full rounded-full ${group.belowBenchmark ? 'bg-amber-600' : 'bg-primary dark:bg-primary-fixed'}" style="width:${progressPercent}%"></div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm font-semibold rounded-full px-3 py-1 ${badgeClass}">${trHtml(statusLabel(group))}</span>
        ${group.entryCount && group.unknownEntryCount === 0 ? `<span class="phasic-tool-muted text-sm">${trHtml('{0}% of known daily protein', formatDisplayNumber(group.distributionRatio * 100, 0))}</span>` : ''}
      </div>
      ${group.unknownEntryCount > 0 ? `<p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('{0} entries have unknown protein. This is a partial total.', formatDisplayNumber(group.unknownEntryCount, 0))}</p>` : ''}
    </li>
  `;
}

/** The chart and accessible list both read the actual local diary for today. */
export function renderProteinRadar(): string {
  const today = getTodayKey();
  const goals = store.getEffectiveNutritionGoals(today);
  const radar = getProteinRadar(store.getMealsForDate(today), today, goals.proteinTarget);
  const dailyProgressPercent = Math.min(100, Math.max(0, radar.progressRatio * 100));

  return `
    <div class="flex flex-col gap-4">
      <p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('Logged protein by meal group')}</p>
      <section class="phasic-tool-card">
        <p class="phasic-tool-muted text-sm">${trHtml('Known protein today')}</p>
        <p class="font-heading font-extrabold text-3xl mt-2 break-words">${trHtml('{0} / {1} g', formatDisplayNumber(radar.knownTotalGrams), formatDisplayNumber(radar.targetGrams))}</p>
        <div class="h-2 mt-3 rounded-full overflow-hidden bg-surface-container dark:bg-dark-surface-card-high" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${dailyProgressPercent}" aria-label="${trHtml('Known daily protein progress')}">
          <div class="h-full rounded-full bg-primary dark:bg-primary-fixed" style="width:${dailyProgressPercent}%"></div>
        </div>
        ${radar.unknownEntryCount ? `<p class="phasic-tool-muted text-sm mt-3 leading-relaxed">${trHtml('Unknown nutrients are excluded. Today’s actual protein may be higher.')}</p>` : ''}
      </section>

      <figure class="phasic-tool-card">
        ${renderRadarChart(radar)}
        <figcaption class="phasic-tool-muted text-sm leading-relaxed">${trHtml('The outer ring marks 30 g per meal group. Spokes show known protein; missing groups stay undrawn. Values above 30 g remain visible below.')}</figcaption>
      </figure>

      <ol class="flex flex-col gap-3" aria-label="${trHtml('Today’s protein distribution')}">
        ${radar.groups.map(renderMealGroup).join('')}
      </ol>
      <div class="phasic-tool-note text-sm leading-relaxed">
        ${trHtml('A meal group can include several foods or snacks. The 30 g protein benchmark does not measure leucine or prove muscle growth.')}
      </div>
      ${radar.groups.every(group => group.entryCount === 0) ? `<p class="phasic-tool-muted text-sm leading-relaxed">${trHtml('Log today’s meals in the diary to build your protein radar.')}</p>` : ''}
    </div>
  `;
}
