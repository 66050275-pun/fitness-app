import { trHtml } from '../../i18n/index.ts';
import type { SpecialProgramToolId } from '../../types/index.ts';
import { renderHiddenFatScanner } from './HiddenFatScanner';
import { renderProteinSplitter } from './ProteinSplitter';
import { renderProteinRadar } from './ProteinRadar';
import { renderFatGauge } from './FatGauge';
import { renderPhaseCycleTracker } from './PhaseCycleTracker';
import { renderRecompMatrix } from './RecompMatrix';

const renderers: Record<SpecialProgramToolId, () => string> = {
  'hidden-fat-scanner': renderHiddenFatScanner,
  'protein-splitter': renderProteinSplitter,
  'protein-radar': renderProteinRadar,
  'fat-gauge': renderFatGauge,
  'phase-cycle': renderPhaseCycleTracker,
  'recomp-matrix': renderRecompMatrix,
};

/** Built-in tools share the app's dialog lifecycle, back stack and encrypted store. */
export function renderPhasicRecompTool(toolId: SpecialProgramToolId, customHandlerFailed = false): string {
  return `<div class="phasic-tool-content" data-phasic-tool="${toolId}">
    ${customHandlerFailed ? `<p class="phasic-tool-note" role="status">${trHtml('The custom tool could not open. The built-in tool is available below.')}</p>` : ''}
    ${renderers[toolId]()}
  </div>`;
}
