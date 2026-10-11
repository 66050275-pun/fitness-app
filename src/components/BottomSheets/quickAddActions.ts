/**
 * App-owned actions for the center navigation button.
 * Labels stay as translation keys; rendering uses the currently selected language.
 * Routing belongs to window.selectQuickAddAction so the menu remains presentation-only.
 */
export type QuickAddActionId =
  | 'scan-food'
  | 'scan-barcode'
  | 'search-food'
  | 'quick-log'
  | 'create-food'
  | 'log-weight';

export interface QuickAddAction {
  readonly id: QuickAddActionId;
  readonly icon: string;
  readonly label: string;
  readonly description: string;
  readonly badge?: 'Simulation' | 'Prototype';
}

/** Six real destinations, displayed left-to-right as a two-row, three-column grid. */
export const QUICK_ADD_ACTIONS: readonly QuickAddAction[] = [
  {
    id: 'scan-food',
    icon: 'photo_camera',
    label: 'Scan Food',
    description: 'Identify a meal with your camera',
    badge: 'Simulation',
  },
  {
    id: 'scan-barcode',
    icon: 'barcode_scanner',
    label: 'Scan Barcode',
    description: 'Scan a packaged food label',
    badge: 'Prototype',
  },
  {
    id: 'search-food',
    icon: 'search',
    label: 'Search Food',
    description: 'Find food from the nutrition database',
  },
  {
    id: 'quick-log',
    icon: 'edit_note',
    label: 'Quick Log',
    description: 'Enter calories and macros manually',
  },
  {
    id: 'create-food',
    icon: 'add_box',
    label: 'Create Food',
    description: 'Create foods with custom portions (e.g. scoops, bowls, slices)',
  },
  {
    id: 'log-weight',
    icon: 'monitor_weight',
    label: 'Log Weight',
    description: 'Record current body weight',
  },
];
