/**
 * App-owned extension menu definitions. These are callback destinations, not
 * implementations of food scanning, macro prescriptions or body composition.
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
    description: 'Detect and flag hidden cooking fats in street foods.',
  },
  {
    id: 'protein-splitter',
    icon: 'account_tree',
    label: 'Protein Splitter',
    description: 'Example split: 60 g from shakes plus 110–120 g from whole foods toward a 170–180 g protein target.',
  },
  {
    id: 'protein-radar',
    icon: 'radar',
    label: 'Protein Radar',
    description: 'Find quick low-fat, high-protein options at convenience stores.',
  },
  {
    id: 'fat-gauge',
    icon: 'speed',
    label: 'Fat Gauge',
    description: 'Track a configured daily fat limit, such as 40–45 g, with warning thresholds.',
  },
  {
    id: 'phase-cycle',
    icon: 'cycle',
    label: 'Phase & Cycle',
    description: 'Follow phase progress, such as Mini Cut week 2 of 4, with a countdown and phase switching.',
  },
  {
    id: 'recomp-matrix',
    icon: 'monitoring',
    label: 'Recomp Matrix',
    description: 'Compare body fat percentage and lean mass trends during recomposition.',
  },
];

/** Resolve only an app-owned ID before rendering or dispatching a callback. */
export function getSpecialProgramAction(id: SpecialProgramToolId | null): SpecialProgramAction | undefined {
  return SPECIAL_PROGRAM_ACTIONS.find((action) => action.id === id);
}
