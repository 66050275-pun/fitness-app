/**
 * App-owned extension menu definitions for the six local planning tools.
 * Labels and descriptions are translation keys in the app's EN/TH dictionary.
 */
import type { SpecialProgramToolId } from '../../types/index.ts';
export type { SpecialProgramToolId } from '../../types/index.ts';

export interface SpecialProgramAction {
  readonly id: SpecialProgramToolId;
  readonly icon: string;
  readonly label: string;
  readonly description: string;
}

/** Display order is shared by the unlocked menu and its locked preview. */
export const SPECIAL_PROGRAM_ACTIONS: readonly SpecialProgramAction[] = [
  {
    id: 'hidden-fat-scanner',
    icon: 'manage_search',
    label: 'Hidden Fat Scanner',
    description: 'Review cooking-fat estimates from food scans before logging.',
  },
  {
    id: 'protein-splitter',
    icon: 'account_tree',
    label: 'Protein Splitter',
    description: 'Split your daily protein target across four or five meals.',
  },
  {
    id: 'protein-radar',
    icon: 'radar',
    label: 'Protein Radar',
    description: 'See today’s logged protein across meal groups.',
  },
  {
    id: 'fat-gauge',
    icon: 'speed',
    label: 'Fat Gauge',
    description: 'Track your fat allowance and the Mini Cut weight-based ceiling.',
  },
  {
    id: 'phase-cycle',
    icon: 'cycle',
    label: 'Phase & Cycle',
    description: 'Set phase dates and weekly high-carb refeed targets.',
  },
  {
    id: 'recomp-matrix',
    icon: 'monitoring',
    label: 'Recomp Matrix',
    description: 'Compare weight trends with comparable workout strength.',
  },
];

/** Resolve only an app-owned ID before rendering or dispatching a callback. */
export function getSpecialProgramAction(id: SpecialProgramToolId | null): SpecialProgramAction | undefined {
  return SPECIAL_PROGRAM_ACTIONS.find((action) => action.id === id);
}
