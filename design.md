# NutriAI design reference

This file records the current theme of `fitness-app`. Read it before changing the UI. Keep new screens and components consistent with these patterns, and update this reference when an intentional design change is made.

Reference date: 2026-10-10. The actual tokens live in `tailwind.config.js` and `src/index.css`.

## Visual direction

- A calm, green wellness app for nutrition tracking and fitness, designed for phone browsers.
- One centered app column, full width on phones and at most **430px** on larger screens.
- Pale green backgrounds, rounded cards, clear headings, subtle borders and soft shadows. Dark mode uses deep green surfaces with readable light text.
- Use the same visual language from the passphrase screen through onboarding, the dashboard, profile settings, exercise catalog and workout screens.
- Green gradients and restrained glows emphasize primary actions and progress. Keep ordinary forms and informational cards quiet.

## Colors

Use existing Tailwind tokens or the shared `--ui-*` variables. The shared variables automatically follow the `.dark` theme.

| Role / CSS variable | Light | Dark |
| --- | --- | --- |
| App background / `--ui-surface` | `#effdf4` | `#121e19` |
| Card / `--ui-card` | `#ffffff` | `#1a2c24` |
| Inset panel / `--ui-panel` | `#e9f7ee` | `#233930` |
| Raised panel / `--ui-panel-high` | `#e3f1e8` | `#2e483d` |
| Main text / `--ui-text` | `#121e19` | `#effdf4` |
| Secondary text / `--ui-muted` | `#3d4a3e` | `#b5c8bc` |
| Border / `--ui-border` | `#bccabb` | `#2e483d` |
| Primary foreground / `--ui-primary` | `#006d36` | `#72fd9e` |
| Primary tint / `--ui-primary-soft` | `#e3f8e9` | `#233930` |
| Text on primary tint / `--ui-primary-label` | `#004d24` | `#b2f6c7` |
| Error / `--ui-error` | `#ba1a1a` | `#ffb4ab` |
| Error background / `--ui-error-soft` | `#ffdad6` | `#44241f` |
| Active muscle / `--ui-muscle-active` | `#ef4444` | `#fb6767` |
| Inactive muscle / `--ui-muscle-rest` | `#bdcec4` | `#586f62` |

Brand accents in Tailwind:

- `primary`: **#006d36**; `primary-container`: **#35c76f**; `on-primary`: **#ffffff**.
- `tertiary`: **#006a60**; `tertiary-container`: **#25c3b1**, used for existing teal accents.
- Existing gradient: `primary` to `primary-container`.
- Solid primary buttons retain dark green with white labels in both themes. The lighter dark-mode `--ui-primary` is for foregrounds and related controls.
- Red denotes errors or the anatomical muscle highlight. Keep these meanings clear with accompanying text or a legend.

## Type and icons

- **Inter** for body text and form labels, weights 400–700.
- **Plus Jakarta Sans** for headings, display numbers and prominent button labels, weights 500–800.
- Fonts are bundled through `@fontsource`; their current Latin subsets use system sans-serif fallbacks for Thai.
- Use the bundled **Material Symbols Outlined** icon set. The base icon size is 24px; contextual sizes generally range from 16px to 30px.
- Maintain a clear hierarchy: page heading, section heading, body, then supporting text. Allow Thai labels to wrap naturally.
- New essential instructions and controls should remain easy to read on a phone. Avoid shrinking labels to make a layout fit.

## Layout, shapes and elevation

- Standard screen gutter: **20px** (`screen-gutter`). Standard card gap: **16px** (`card-gap`).
- Use the existing spacing scale: 4, 8, 12, 16, 20, 24 and 32px for most layouts.
- Main cards: **24px** corners (`rounded-2xl` / `--ui-radius`), generally 16–24px internal padding.
- Primary buttons: typically 16–24px corners. Inputs: approximately 14px corners. Chips and segmented controls use pill shapes.
- Bottom sheets use **28–32px** top corners, a clear title and a bounded scrollable body.
- Shared light card shadow: `0 4px 20px -2px rgba(23,32,27,0.04)`; dark equivalent uses `rgba(0,0,0,0.15)`.
- Preserve the existing fixed bottom navigation, centered action button and sticky headers. Keep content clear of fixed controls.
- Account for `safe-area-inset-top` and `safe-area-inset-bottom`. The privacy status bar reserves **44px plus the top safe area**; sticky page headers sit below it.
- Preserve normal document scrolling. The app shell uses `overflow-x: clip` and `overflow-y: visible`.

## Controls and interaction

- Use a clear green primary action; secondary actions use a tinted panel or border. Destructive actions use the error color with an explicit label.
- Reuse `.ui-primary-button` where appropriate: full width, at least 52px tall, bold heading font, subtle press scale of 0.99.
- Keep enabled, selected, disabled, saving and error states visually distinct. Icon-only controls need localized accessible labels.
- Preserve the visible 2px primary focus outline with 3px offset, keyboard access, browser zoom and heading focus after navigation.
- Use text labels alongside important status colors and progress indicators. Active navigation uses `aria-current="page"`.
- Form updates should preserve entered text, focus and caret position. Expanded exercise details should remain open during edits.

## Navigation and motion

Use `src/ui/screenTransitions.ts` for screen changes, including profile subpages, onboarding and workout steps.

- Incoming screen fade: **180ms**, `ease-out`.
- Incoming main content slide: **14px**, **220ms**, `cubic-bezier(0.2,0.8,0.2,1)`.
- Forward content enters from the right; Back content enters from the left and restores the previous scroll position.
- Ordinary data edits and workout timer ticks do not restart screen transitions.
- Keep screen, navigation and overlays in their separate mount points. Avoid transforming an ancestor of fixed controls.
- Shared CSS interaction timing is **180ms**, with `cubic-bezier(0.2,0.8,0.2,1)`.
- Respect both the app's Reduce Motion setting and `prefers-reduced-motion` for JavaScript and CSS animations.
- Locking and the privacy shield take effect immediately. Clear sensitive view markup and transition history when locked.

## Fitness imagery and anatomy

- Exercise illustrations use the same framed presentation in setup, the catalog and the active workout. Their background is `--ui-art-background` (**#164e43**); retain the image aspect ratio with `object-fit: contain`.
- Artwork is bundled locally from `@bryllim/workout-guide@1.0.0`. Preserve the unchanged images, visible Bryl Lim / Everkinetic credits and **CC BY-SA 4.0** notices. Exact source attribution lives in `docs/exercise-art/`.
- Before Start Workout, show the original **2D full-body front and back** schematic in one themed card, with clear gaps between the **19 muscle groups**.
- Red highlights the union of major movers and common assisting muscles for all exercises currently in the draft program. Adding or removing exercises updates the highlighted regions.
- Keep inactive regions muted, provide a legend and allow users to inspect the muscles for each exercise. Unknown movements remain explicitly unmapped.
- The map communicates affected regions; it does not represent intensity or a personalized medical assessment.
- Keep artwork, fonts and translation resources local to the app bundle.

## English and Thai

- The selected language applies throughout the app: lock screen, navigation, settings, forms, calendars, validation, exercise names, muscle labels and demo replies.
- Use `tr`, `trHtml` and the existing localized label helpers with `src/i18n/messages.json`. Escape dynamic values when rendering HTML.
- Preserve user-entered names, notes, custom food descriptions and messages. Keep brand names, artwork credits and scientific abbreviations in their original form.
- Update the document language to `en` or `th`. Display dates with `en-US` or `th-TH-u-ca-gregory-nu-latn`; stored date keys remain `YYYY-MM-DD`.
- Language selection is available at the passphrase gate and Profile → App Settings → Language. Only the non-sensitive language code is kept outside the encrypted vault for startup presentation.

## Privacy and honest product states

- Treat the passphrase gate, save indicator, Lock control and background privacy shield as part of the same green app theme.
- Distinguish saving, saved and failed states accurately; show actionable storage errors without claiming success.
- Keep the existing encrypted browser vault and encrypted backup flow. Explain relevant limitations when users make decisions about backup, restore or clearing data.
- Label scanner and coach preview functionality truthfully. UI copy should match the current capabilities, including the absence of automatic device sync and password recovery.
- Theme, language and motion changes must preserve the privacy behavior described in `docs/PRIVACY_AUDIT.md`.

## Implementation references

- `tailwind.config.js`: palette, spacing, radii, fonts and shadows.
- `src/index.css`: shared light/dark variables, privacy surfaces, imagery, muscle map and reduced motion.
- `index.html`: mobile viewport and 430px app shell.
- `src/components/Navigation/`: header and bottom navigation patterns.
- `src/security/vaultUI.ts`: passphrase gate, status and shield.
- `src/components/Fitness/` and `src/screens/FitnessScreen.ts`: artwork and workout presentation.
- `src/ui/screenTransitions.ts`: navigation motion and scroll restoration.
- `src/i18n/`: bilingual presentation helpers and messages.
