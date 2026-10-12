import type { SpecialProgramToolId } from '../types/index.ts';

/**
 * Optional host overrides for the built-in tool dialogs. These callbacks
 * intentionally receive no profile, diary or workout data.
 */
export interface SpecialProgramToolCallbacks {
  onHiddenFatScanner: () => void;
  onProteinSplitter: () => void;
  onProteinRadar: () => void;
  onFatGauge: () => void;
  onPhaseCycle: () => void;
  onRecompMatrix: () => void;
}

const callbackNames = {
  'hidden-fat-scanner': 'onHiddenFatScanner',
  'protein-splitter': 'onProteinSplitter',
  'protein-radar': 'onProteinRadar',
  'fat-gauge': 'onFatGauge',
  'phase-cycle': 'onPhaseCycle',
  'recomp-matrix': 'onRecompMatrix',
} as const satisfies Record<SpecialProgramToolId, keyof SpecialProgramToolCallbacks>;

interface CallbackRegistration {
  token: symbol;
  callback: () => void;
}

// Memory only: never persist callbacks or make network requests from this layer.
const registrations = new Map<SpecialProgramToolId, CallbackRegistration[]>();

/**
 * Register any subset of the six actions after the private app store is ready.
 * For example, registerSpecialProgramToolCallbacks({ onFatGauge: openFatGauge }).
 * The latest registration for an action wins. Unsubscribe removes only this
 * registration, so independent tool modules can mount and unmount safely.
 */
export function registerSpecialProgramToolCallbacks(
  callbacks: Partial<SpecialProgramToolCallbacks>,
): () => void {
  const token = Symbol('special-program-tool-callbacks');

  for (const toolId of Object.keys(callbackNames) as SpecialProgramToolId[]) {
    const callback = callbacks[callbackNames[toolId]];
    if (typeof callback !== 'function') continue;

    const toolRegistrations = registrations.get(toolId) ?? [];
    toolRegistrations.push({ token, callback });
    registrations.set(toolId, toolRegistrations);
  }

  return () => {
    for (const [toolId, toolRegistrations] of registrations) {
      const remaining = toolRegistrations.filter((entry) => entry.token !== token);
      if (remaining.length) registrations.set(toolId, remaining);
      else registrations.delete(toolId);
    }
  };
}

/**
 * The caller must check the current Special Program unlock state first.
 * Return false when no override is registered so the UI opens its built-in tool.
 */
export function runSpecialProgramToolCallback(toolId: SpecialProgramToolId): boolean {
  const toolRegistrations = registrations.get(toolId);
  const registration = toolRegistrations?.at(-1);
  if (!registration) return false;

  registration.callback();
  return true;
}

/** Clear tool closures immediately when the vault locks or the app disposes. */
export function resetSpecialProgramToolCallbacks(): void {
  registrations.clear();
}
