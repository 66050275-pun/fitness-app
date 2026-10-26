import { tr, trHtml } from '../../i18n/index.ts';
import { store } from '../../store/appState.ts';
import { getFatGauge } from '../../services/phasicRecompService.ts';
import { getTodayKey } from '../../utils/dateUtils.ts';
import { formatDisplayNumber } from '../../utils/safeNumbers.ts';
import { escapeHtml } from '../../utils/sanitize.ts';

/** The meter is a visual aid; the full values and status remain readable text. */
export function renderFatGauge(): string {
  const state = store.getState();
  const today = getTodayKey();
  const goals = store.getEffectiveNutritionGoals(today);
  if (!Number.isFinite(goals.fatTarget) || goals.fatTarget <= 0) {
    return `<p class="phasic-tool-note" role="status">${trHtml('Set a valid current weight and daily fat target in Profile to calculate the ceiling.')}</p>`;
  }
  const gauge = getFatGauge(store.getMealsForDate(today), today, goals.fatTarget,
    state.userProfile.dietProgram ?? 'standard', state.userProfile.currentWeightKg);
  const incomplete = gauge.unknownEntryCount > 0 || gauge.missingWeight;
  const statusLabel = gauge.state === 'exceeded' ? tr('Limit exceeded')
    : incomplete ? tr('Incomplete fat data')
    : gauge.state === 'caution' ? tr('Caution') : tr('Safe');
  const color = gauge.state === 'exceeded' ? 'var(--ui-error)'
    : incomplete ? 'var(--ui-muted)'
    : gauge.state === 'caution' ? 'var(--phasic-caution, #926300)' : 'var(--ui-primary)';
  const progress = Math.max(0, Math.min(1, gauge.progressRatio));
  const angle = Math.PI * (1 - progress);
  const needleX = 110 + 67 * Math.cos(angle);
  const needleY = 110 - 67 * Math.sin(angle);
  const caption = tr('{0} g known fat of a {1} g ceiling', formatDisplayNumber(gauge.consumedKnownGrams), formatDisplayNumber(gauge.ceilingGrams));

  return `
    <div class="space-y-4">
      <p class="phasic-tool-muted">${trHtml('Today’s fat intake, including saved cooking-fat estimates.')}</p>
      <section class="phasic-tool-card text-center">
        <svg viewBox="0 0 220 135" class="w-full max-w-[280px] mx-auto" role="img" aria-label="${escapeHtml(caption)}">
          <path d="M 22 110 A 88 88 0 0 1 198 110" fill="none" stroke="var(--ui-panel-high)" stroke-width="17" stroke-linecap="round" />
          <path d="M 22 110 A 88 88 0 0 1 198 110" fill="none" stroke="var(--ui-primary)" stroke-width="6" pathLength="100" stroke-dasharray="80 100" />
          <path d="M 22 110 A 88 88 0 0 1 198 110" fill="none" stroke="var(--phasic-caution, #926300)" stroke-width="6" pathLength="100" stroke-dasharray="20 100" stroke-dashoffset="-80" />
          <path d="M 22 110 A 88 88 0 0 1 198 110" fill="none" stroke="${color}" stroke-width="12" pathLength="100" stroke-dasharray="${progress * 100} 100" stroke-linecap="round" />
          <line x1="110" y1="110" x2="${needleX}" y2="${needleY}" stroke="${color}" stroke-width="4" stroke-linecap="round" />
          <circle cx="110" cy="110" r="7" fill="${color}" />
        </svg>
        <p class="font-heading text-3xl font-extrabold break-words" style="color:${color}">${formatDisplayNumber(gauge.consumedKnownGrams)} <span class="text-base font-medium">${trHtml('g')}</span></p>
        <p class="phasic-tool-muted mt-1">${trHtml('Daily ceiling: {0} g', formatDisplayNumber(gauge.ceilingGrams))}</p>
        <p class="font-bold mt-3" style="color:${color}">${escapeHtml(statusLabel)}</p>
        <p class="phasic-tool-muted mt-1">${gauge.overageGrams > 0
          ? trHtml('{0} g over the ceiling', formatDisplayNumber(gauge.overageGrams))
          : trHtml('{0} g remaining from known entries', formatDisplayNumber(gauge.remainingGrams))}</p>
      </section>
      <div class="phasic-gauge-thresholds grid grid-cols-3 gap-2 text-center text-sm" role="group" aria-label="${trHtml('Fat gauge thresholds')}">
        <div class="phasic-tool-card !p-3 min-w-0"><p class="font-bold" style="color:var(--ui-primary)">${trHtml('Safe')}</p><p class="phasic-tool-muted">${trHtml('Below 80%')}</p></div>
        <div class="phasic-tool-card !p-3 min-w-0"><p class="font-bold" style="color:var(--phasic-caution, #926300)">${trHtml('Caution')}</p><p class="phasic-tool-muted">${trHtml('80–100%')}</p></div>
        <div class="phasic-tool-card !p-3 min-w-0"><p class="font-bold" style="color:var(--ui-error)">${trHtml('Limit exceeded')}</p><p class="phasic-tool-muted">${trHtml('Above 100%')}</p></div>
      </div>
      ${gauge.unknownEntryCount > 0 ? `<p class="phasic-tool-note" role="status">${trHtml('Some logged foods have unknown fat. The total is a known minimum, so a safe status cannot be confirmed.')}</p>` : ''}
      ${gauge.missingWeight ? `<p class="phasic-tool-note" role="status">${trHtml('Add your current weight in Profile to apply the Mini Cut weight-based cap. The meter currently uses your saved fat target.')}</p>` : ''}
      <p class="phasic-tool-note">${state.userProfile.dietProgram === 'mini_cut'
        ? trHtml('Mini Cut uses the lower of your saved fat target and 0.6 g/kg of current body weight. This ceiling does not change your saved nutrition plan.')
        : trHtml('Lean Bulk uses your saved daily fat target. Cooking-fat estimates are included once through your diary.')}</p>
    </div>
  `;
}
