# Special Program extension menu

The implementation uses the app's existing **TypeScript + Tailwind CSS + Vite**
stack. It adds a seventh More action to the center button's Quick Add menu.

## State and unlock

`UserProfile.dietProgram` is the saved source of truth:

| Saved choice | Weight direction | Tool menu |
| --- | --- | --- |
| `standard` + Cut | `lose` | Locked preview |
| `standard` + Maintain | `maintain` | Locked preview |
| `standard` + Bulk | `gain` | Locked preview |
| `mini_cut` | `lose` | Unlocked |
| `lean_bulk` | `gain` | Unlocked |

`store.isSpecialProgramUnlocked()` derives the boolean from the saved choice.
The saved program is included in the existing encrypted browser profile. Missing
or unknown program values load as standard. There is no second plaintext store
or independently persisted unlock flag.

`weightGoalDraft` holds unsaved selections and target fields in memory. Save
commits them to the profile; Back discards them. Standard selections reset the
program to standard. The locked menu's activation CTA opens Goal Settings and
returns to the extension menu after Save or Back.

## Components and routing

- `quickAddActions.ts`: existing six actions plus More.
- `QuickAddBottomSheet.ts`: shared sheet shell, header and navigation.
- `specialProgramActions.ts`: typed six-tool list and descriptions.
- `SpecialProgramMenu.ts`: unlocked grid, locked preview and tool previews.
- `specialProgramToolCallbacks.ts`: six optional callback hooks.
- `src/utils/dietPrograms.ts`: draft normalization and derived unlock helper.
- `src/main.ts`: click bindings and the single callback dispatcher.

The existing center button keeps `onclick="window.toggleQuickAdd()"`. More
calls `window.selectQuickAddAction('more')`. Secondary actions call
`window.selectSpecialProgramTool(toolId)`.

The menu state is `quickAddOpen`, `quickAddView` (`primary`, `special`, `tool`)
and `selectedSpecialProgramTool`. The shared dialog controller completes the
outgoing sheet's exit before reopening the next view. Only one backdrop/focus
trap is mounted. It keeps the viewport bounds, scroll lock, center FAB, privacy
Lock and reduced motion behavior.

Back/Escape/device Back returns tool → special → primary → closed. The
backdrop, X and center FAB dismiss the entire menu. Locking cancels delayed
transitions synchronously before storage flush begins, then clears callback
registrations when the app deactivates. A failed save preserves the mounted
dialog and callback registry for recovery.

## Connect the six callback placeholders

Register real tool screens during private app activation, after the store is
initialized. Registration returns an unsubscribe function for module cleanup:

```ts
import { registerSpecialProgramToolCallbacks } from './services/specialProgramToolCallbacks';

const unsubscribe = registerSpecialProgramToolCallbacks({
  onHiddenFatScanner: () => { /* Open your cooking-fat review screen. */ },
  onProteinSplitter: () => { /* Open your protein source tracker. */ },
  onProteinRadar: () => { /* Open your convenience-store food options. */ },
  onFatGauge: () => { /* Open your configurable daily fat tracker. */ },
  onPhaseCycle: () => { /* Open your phase progress and switching controls. */ },
  onRecompMatrix: () => { /* Open your body composition trends. */ },
});

// When this feature module is disposed:
unsubscribe();
```

Unregistered actions open labeled previews. The dispatcher validates the tool ID
and saved unlock state before invoking callbacks, including another check after
the exit animation. Register callbacks again after each vault unlock if the
module stays installed. Callback failures show a retryable tool error.

Callbacks take no personal data arguments. Tool screens can use the existing
private store when implemented. Registry metadata and closures remain memory
only; vault locking calls `resetSpecialProgramToolCallbacks()`.

## Planned tool functions

| Tool | Planned callback destination |
| --- | --- |
| Hidden Fat Scanner | Cooking-fat review for street foods |
| Protein Splitter | Shake versus whole-food protein totals |
| Protein Radar | Convenience-store protein options |
| Fat Gauge | Configurable fat limit and warning thresholds |
| Phase & Cycle | Phase progress, countdown and switching |
| Recomp Matrix | Body fat and lean mass trends |

The numeric examples in previews follow the requested design. They are not
applied to nutrition targets. This change implements access, navigation and
callback placeholders; it does not run scanners or tracking algorithms.
