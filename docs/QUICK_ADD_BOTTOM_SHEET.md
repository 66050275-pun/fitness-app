# Center button and Quick Add bottom sheet

The existing app uses **TypeScript + Tailwind CSS + Vite**, with HTML-rendering
components. The menu follows that structure and uses the app's green light/dark
theme and existing English/Thai translations.

## Connect the existing center button

`src/components/Navigation/BottomNav.ts` already has this click handler:

```html
<button id="nav-fab-quick-add" onclick="window.toggleQuickAdd()">
  <span class="material-symbols-outlined">add</span>
</button>
```

Keep that handler. `window.toggleQuickAdd` in `src/main.ts` opens the existing
`quickAddOpen` store state, or calls the animated close handler if already open.
The real button stays available while the menu is open; other navigation controls
are disabled. Its `aria-expanded`, `aria-controls` and `aria-haspopup` attributes
describe the popup to assistive technology.

## Edit the six actions

The typed `QUICK_ADD_ACTIONS` list in
`src/components/BottomSheets/quickAddActions.ts` is the single place for menu data:

| ID | Icon | Label |
| --- | --- | --- |
| `scan-food` | `photo_camera` | Scan Food |
| `scan-barcode` | `barcode_scanner` | Scan Barcode |
| `search-food` | `search` | Search Food |
| `quick-log` | `edit_note` | Quick Log |
| `create-food` | `add_box` | Create Food |
| `log-weight` | `monitor_weight` | Log Weight |

The presentation component maps the list to a grid. Each item has an icon, a
localized label, an accessible description and an optional capability badge.
Scanner items retain their Simulation and Prototype labels.

Each item invokes `window.selectQuickAddAction(actionId)`. Its switch in
`src/main.ts` connects the six IDs to existing app screens and forms. To use a
different menu, update the ID union, the data list, the dispatcher and translations
together. Keep labels as translation keys and routing out of the component.

## Dismissal and motion

- Tapping the center button again, the backdrop or the X closes the sheet.
- Escape and the device Back event use the shared dialog close binding.
- The shared dialog controller keeps the menu mounted during its slide-down and
  fade-out, then closes the store state. An action opens its destination after
  the exit completes. Repeated taps during exit do not run duplicate actions.
- Focus stays within the sheet, the center button and the privacy Lock control.
  Closing restores the opener and background scroll position.
- Other dialogs continue to use the shared centered layout. The Quick Add CSS
  overrides only `.ui-bottom-sheet-layer` and `.ui-bottom-sheet-panel`.
- The sheet follows the visible Streamlit/phone viewport, reserves the privacy
  status bar, and measures the bottom bar to avoid covering it. On short screens,
  the grid scrolls within the sheet.
- App and system Reduce Motion settings dismiss immediately. Locking the vault
  cancels pending actions and clears the dialog lifecycle immediately.

No menu state or animation metadata is persisted. Food and weight entries still
use the existing encrypted browser vault.
