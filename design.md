# NutriAI design reference

This file records the current theme of `fitness-app`. Read it before changing the UI. Keep new screens and components consistent with these patterns, and update this reference when an intentional design change is made.

Reference date: 2026-10-24. Shared semantic tokens live in `src/ui/theme.css`; Tailwind utilities live in `tailwind.config.js`, and shared controls and screen styling live in `src/index.css`.

## Visual direction

- A calm, green wellness app for nutrition tracking and fitness, designed for phone browsers.
- One centered app column, full width on phones and at most **430px** on larger screens.
- Pale green backgrounds, rounded cards, clear headings, subtle borders and soft shadows. Dark mode uses deep green surfaces with readable light text.
- Use the same visual language from the PIN lock screen through onboarding, the dashboard, profile settings, exercise catalog and workout screens.
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
| Information / `--ui-info` | `#006a60` | `#6df8e5` |
| Caution / `--ui-caution` | `#926300` | `#fbbf24` |
| Error / `--ui-error` | `#ba1a1a` | `#ffb4ab` |
| Error background / `--ui-error-soft` | `#ffdad6` | `#44241f` |
| Active muscle / `--ui-muscle-active` | `#ef4444` | `#fb6767` |
| Inactive muscle / `--ui-muscle-rest` | `#bdcec4` | `#586f62` |

Brand accents in Tailwind:

- `primary`: **#006d36**; `primary-container`: **#35c76f**; `on-primary`: **#ffffff**.
- `tertiary`: **#006a60**; `tertiary-container`: **#25c3b1**, used for existing teal accents.
- Existing gradient: `primary` to `primary-container`.
- Solid primary buttons retain dark green with white labels in both themes. The lighter dark-mode `--ui-primary` is for foregrounds and related controls.
- Use `--ui-action`, `--ui-action-hover`, `--ui-action-pressed` and `--ui-on-action` for filled actions. Keep `--ui-primary` for foreground accents. Control boundaries use `--ui-control-border` (`#6d7b6d` light / `#829b8b` dark); quieter card separators keep `--ui-border`.
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
- Drawers open as centered dialogs with **24px** corners on all sides, a clear title, a close control and a bounded scrollable body. Use `.ui-dialog-layer`, `.ui-dialog-panel` and `.ui-dialog-body`; keep headers and action bars outside the scroll body where practical.
- **Quick Add** is a bottom sheet above the navigation bar: a **2-row × 3-column** grid of six icon-and-label actions, rounded top corners, a subtle shadow and a dimmed, blurred backdrop. Keep the center Add button available to close the menu, and disable the other navigation buttons until dismissal. Other dialogs retain their centered placement.
- Put the seventh **More** action in a separate full-width row below that grid. It opens the Special Program menu through the same exit/entry lifecycle; show one sheet at a time. Back returns from a tool dialog to the extension grid, then to Quick Add. The backdrop, X and center button close the menu.
- The extension grid has six actions: Hidden Fat Scanner, Protein Splitter, Protein Radar, Fat Gauge, Phase & Cycle, and Recomp Matrix. Use a lock preview and a fixed **Activate in Goal Settings** footer for standard goals. Open each functional tool in a centered, scrollable dialog using the shared lifecycle. Keep the center close button clear of the panel.
- Quick Add slides up and fades in over **220ms**, then slides down and fades out over **180ms**. Keep its mounted content and background scroll lock until exit completes. Respect Reduce Motion and cancel pending actions immediately when the vault locks. Food scanning shows **Setup pending** until a backend is registered; barcode decoding retains its **Prototype** badge.
- Fit dialogs to the visible viewport, including keyboard and browser bar changes. Reserve the privacy status bar, 12px edge gutters and safe areas. Streamlit uses a viewport-height iframe, with scrolling inside the app rather than in the host page.
- Show one active dialog at a time; hide and disable any underlying dialog during a drilldown or confirmation, then restore it on close. Preserve form text, focus, selection and internal scroll across data updates. Lock background scrolling while a dialog is open and restore it on close. Escape and the device Back button dismiss the active dialog before navigating; keep the privacy Lock control available.
- Shared light card shadow: `0 4px 20px -2px rgba(23,32,27,0.04)`; dark equivalent uses `rgba(0,0,0,0.15)`.
- Preserve the existing fixed bottom navigation, centered action button and sticky headers. Keep content clear of fixed controls.
- The shared app header uses a two-row layout: a real 48px Profile button, wrapping greeting and 48px actions above the date. Put the diary date picker and Show today action in the date row with visible focus. Greet according to local morning/afternoon/evening; show a localized positive-day streak as text with a decorative icon.
- Bottom navigation has four destinations around the 56px center Add toggle. Keep 12px wrapping labels, at least 48px-wide / 60px-tall destination targets, and a tinted icon pill plus filled glyph and bold label for the current page. The center action uses the solid action color for a readable white icon. Opening Quick Add disables the other destinations and changes the center label to Close.
- `NavigationLayout` measures the actual bottom bar with `ResizeObserver`, including changes from wrapped translations, fonts and safe areas. The app shell reserves that height plus 24px only on screens showing the bar, including the coach composer. It disconnects on lock; no previous screen DOM is retained. Existing dialog positioning uses the same `--ui-bottom-nav-height` value.
- Account for `safe-area-inset-top` and `safe-area-inset-bottom`. The privacy status bar reserves **44px plus the top safe area**; sticky page headers sit below it.
- Preserve normal document scrolling. The app shell uses `overflow-x: clip` and `overflow-y: visible`.

## Controls and interaction

- Use a clear green primary action; secondary actions use a tinted panel or border. Destructive actions use the error color with an explicit label.
- Reuse `.ui-primary-button` where appropriate: full width, at least 52px tall, 16px bold heading font, wrapping labels and subtle press scale of 0.99. Hover/pressed styling applies only to enabled controls; hover is limited to pointers that support it.
- Use `.ui-icon-button` for circular Back/Close controls: 48 × 48px, a visible control boundary and a localized accessible name. Hide the decorative glyph with `aria-hidden="true"`.
- Use `.ui-field` for text/number/select fields: at least 48px tall, 16px font, 14px corners and a visible boundary. Keep labels and help/error associations in markup. Set `aria-invalid="true"` when validation fails; retain each screen's padding and lifecycle. Vault and onboarding adopt these shared controls first.
- `.ui-primary-button`, `.ui-icon-button` and `.ui-field` use the shared focus color and a separating surface ring. Disabled controls show an unavailable cursor; mark an actual busy button with `aria-busy="true"` to show progress. Existing Reduce Motion rules cover the shared transitions.
- Keep enabled, selected, disabled, saving and error states visually distinct. Icon-only controls need localized accessible labels.
- Preserve the visible 2px primary focus outline with 3px offset, keyboard access, browser zoom and heading focus after navigation.
- Use text labels alongside important status colors and progress indicators. Active navigation uses `aria-current="page"`.
- Form updates should preserve entered text, focus and caret position. Expanded exercise details should remain open during edits.
- Format numeric readouts with `formatDisplayNumber` from `src/utils/safeNumbers.ts`: at most two decimal places for macros and training values, whole calories in summary cards, and up to four decimals where micronutrients need that precision. Formatting affects presentation only; editable inputs and stored values keep their precision.
- Numeric cards must allow wrapping and shrinking with `min-width: 0`. Put macro targets on a separate line, let long Thai labels wrap, and rearrange compact grids on narrow phones. Show the full value rather than clipping it or replacing it with an ellipsis.

## Home dashboard

- Use the shared header, a 48px Nutrition/Fitness navigation control and a readable Customize action. Render visible widgets in their saved **DOM order** so reading and keyboard order match the visual order. Show an explanatory empty state when every widget is hidden.
- Dashboard cards use the common 24px radius, quiet borders, 20px padding and shared light/dark surfaces. Card titles are 16px, ordinary copy 14px and supporting labels 12px. Keep long Thai meal names and numeric values available without truncation.
- The energy ring represents food calories against the effective daily target. Label that percentage and show the balance formula separately: target minus food plus exercise. Distinguish remaining from over-budget energy in text. Put food, exercise and balance in a semantic summary that stacks at narrow card widths.
- Show macros as full-width rows with the amount and target on separate readings. Format values through `formatDisplayNumber`; clamp visual bars while retaining the actual percentage text. All-missing amounts remain unavailable, and partial nutrition explicitly states missing-entry counts. Keep Mini Cut fat ceilings and refeed allowances drawn from the same existing services as Diary/Insights.
- Hydration shows recorded ml against the **exact saved ml target**, with 48px labeled plus/minus controls for the selected date, a 250 ml increment explanation and a disabled minus control at zero. The old 12-glass logging cap is removed; a goal is a reference rather than a limit on what can be recorded. Storage remains in the existing per-date 250 ml glass units.
- Label the local coach summary **Demo Coach** and use data from the selected day. Meal rows keep escaped names, full nutrition values and labeled 48px delete controls; deletion returns focus to the meal section heading.
- Keep Customize Home in the shared centered dialog, with scrolling body, 48px move controls, stable IDs and a labeled visibility toggle. Show each widget's position and visible/hidden state. Use the existing dialog lifecycle to preserve focus and scroll.
- Dashboard render helpers and scoped styling live in `src/components/Dashboard/`; the stylesheet is bundled through the main entry with the existing Streamlit CSS output.

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
- Workout presets are native buttons with wrapping muscle names and descriptions. Program/workout controls expose their selected state. Routine setup uses labeled 48px back, remove, set and rep controls; the setup description reflects the operations actually available.
- My Program keeps a seven-column calendar with labeled month navigation, a selected-date marker and a status legend. Let month summaries and routine text wrap; use readable controls and two-column metrics in existing centered planner dialogs. Day labels include the full date and workout status when compact cells cannot display the full name.
- Keep artwork, fonts and translation resources local to the app. Artwork loads as separate PNG assets from the existing app-hosted Streamlit component route (or ordinary local Vite/Capacitor assets), with no external image CDN. Keep fonts and translations bundled; preserve the original app/vault iframe origin.

### Expanded exercise picker

- Include **254 illustrated entries**: 253 compatible repetition-based library movements and the existing incline-fly variation. Preserve existing exercise names/aliases so saved history and programs still match. Do not add duration/distance/stretching records to the reps-only picker.
- Keep the picker in workout setup, using shared green cards and 16px search/select fields. Provide EN/TH local search, muscle/equipment filters, a clear result counter and 12 results per page in a bounded scroll area. Filters stay in memory and reset on lock; searching sends nothing to a service.
- Keep 48px Add controls, mark already-added movements, retain the user's filter/page/list position when adding, and show a localized confirmation. Expanded details show two unchanged poses, muscles, default sets/reps/rest and the exact source/CC BY-SA credit. Retain the global thumbnail attribution too.
- The picker uses wrapping text, readable filter labels and a single filter column on narrow screens. Offer Clear filters when no results match, and restore focus to an available page control or search when pagination reaches a boundary.
- Use lazy PNG loading so the initial JavaScript does not contain the whole illustration library. `scripts/generate_exercise_art.py` builds imports and per-frame credits from the pinned package. The server copies public build images to an ignored component asset folder. CSP permits same-origin images along with data/blob sources; keep third-party images blocked.
- Bodyweight, assisted and resistance-band entries can log repetitions, with automatic load increases disabled. Keep ordinary loaded-movement progression/history behavior and the 19-region muscle schematic. The map shows reviewed major movers/common assists rather than every generic source stability tag.

### Rest interval clock

- Completing a set opens a focused, centered clock using the shared viewport and dialog infrastructure. Keep the privacy bar and Lock control visible.
- Use a large 2D circular dial with fine radial ticks, green remaining progress, a prominent tabular **mm:ss** readout and the localized finish time. Apply the existing light/dark surface colors and heading font.
- Put **+30 seconds** below the dial and large circular Pause/Resume and Skip Rest controls at the bottom. Preserve readable labels and scroll the body on short screens while keeping controls accessible.
- Back closes the clock while the rest continues; the compact workout timer reopens it. Skip ends the rest. Rest Pause affects the rest countdown; the workout's Pause freezes both timers. Resume Workout resumes the session while preserving any separate rest pause.
- Give the clock's Back, +30, Pause/Resume and Skip controls stable IDs, visible focus and comfortable touch targets. Keep labels and assistant advice readable on narrow and short screens, with scrollable content and reachable footer actions.
- Derive the rest countdown from its local deadline rather than interval callback counts. Update the dial in place without restarting transitions or moving focus, and close it when the rest finishes. Timer state stays in memory and is cleared when the vault locks.

### Workout assistant

- Show the next-set suggestion in the rest clock's scrollable body and above the active set log. Use the same green surfaces, readable reason, formatted load and reps, and explicit Apply/Applied status.
- Automatically fill only an incomplete set that the user has not edited. Preserve manual entries and completed sets. Undoing the source set restores an untouched automatic fill; manual changes are retained.
- Distinguish target reps from actual reps. Load inputs accept 0.25 kg steps to accommodate 1.25 kg increments.
- During an active session, use wrapping header rows, 16px weight/repetition inputs and a 48px set completion toggle with a localized label and pressed state. Keep elapsed/rest timer IDs and existing handlers stable during updates.
- The workout summary and history use wrapping metrics and 48px actions. Describe calories as an estimate from lifted volume and duration. Personal record occurrences are native buttons, and the linked record session is labeled as workout details rather than necessarily the latest session.
- Before starting, explain loads drawn from saved history. Use a stable rep bracket and increase only after every prescribed set reaches its upper bound at the same positive load. Bodyweight, timed and assisted movements do not receive automatic weight increases.
- Suggestions and Epley estimates are local calculations. Recompute their wording when the language changes; do not store localized reasons in workout history.

## Food catalog and online search

- Bundle Thai dish estimates for offline search in both English and Thai, with gram-based regular/large/small portions. Clearly label estimated recipe nutrition; changing ingredients needs a separate recipe, rather than a size option.
- Keep local search immediate, with a visible 16px search field, a labeled 48px clear control and pressed-state collection buttons. Selecting a collection clears the cross-catalog query; typing keeps focus and the keyboard in the search field.
- Place Open Food Facts Thailand inside an **Online products** disclosure so local results remain prominent. Searching still requires the visible **Search online** action and explains that the search text is sent to that provider.
- Show distinct loading, unavailable and no-result states. Retain the Open Food Facts product link and ODbL attribution on imported foods. Unknown nutrients display as unavailable and remain null.
- Query text and unsaved results remain in memory. Logged product definitions and diary snapshots use the existing encrypted browser vault; locking cancels outstanding requests.

## Diary and manual food entry

- Use the shared green surfaces, 20px screen gutters and 16px card gaps. Diary date buttons have at least 48px targets and a horizontally scrollable week strip. Center a newly selected date horizontally without moving the page vertically; preserve strip scroll during updates to the same date/week.
- Show calories, macros and exact hydration targets for the selected date. Reuse effective refeed goals and the Mini Cut fat ceiling. Preserve unknown/partial nutrition states instead of implying complete totals.
- Group logged meals by Breakfast, Lunch, Dinner and Snack. Open details with a native button; Delete and Add Again are separate sibling controls. Let long names, portions and complete formatted values wrap. Use text badges for AI estimates and demos; nutrient availability does not imply verified data.
- Preview six recorded micronutrients, with a native disclosure for every remaining recorded nutrient. Show meal coverage and explain that values may include AI estimates and missing nutrients do not count as zero.
- Quick Log uses labeled 16px fields, 48px meal-selection radios and native date/time controls. Nutrition refers to the entire entered portion. Optional blank macros remain null; an explicitly entered zero remains zero. Validate positive quantities, supported units, non-negative nutrition and valid dates/times with linked summary and inline feedback.
- Preserve Quick Log fields, checked controls, focus and caret across same-route renders using an opt-in DOM snapshot. Do not persist drafts or retain their values across navigation or vault lock. Disable entry while saving or locking.
- Keep portion math precise and canonical within the same measurement dimension (mass to grams, volume to milliliters). Saving to My Foods from Quick Log must not open a second portion dialog or create another meal. After submission, open Diary on the actual logged date and retain the vault's existing persistence-status reporting.
- Set Portion, Meal Detail and Custom Food reuse readable fields and 48px controls inside the existing centered, scrollable dialog lifecycle. Portion quick options expose their pressed state and conversion errors are associated with the quantity input.

## Goal Settings and Special Program

- Standard **Cut / Maintain / Bulk** map to existing `lose / maintain / gain` weight directions. **Mini Cut / Lean Bulk** are saved program choices, with the corresponding lose/gain direction. Derive unlock status from the saved `dietProgram`, rather than persisting a separate boolean that can disagree with it.
- Keep selections, target weight/date and weekly pace in a memory draft until **Save Goal Settings**. Back discards the draft. Saving a standard goal locks the extension menu; saving a special goal unlocks it. Legacy profiles default to standard.
- An activation CTA opens Goal Settings and returns to the extension menu on Save or Back. Show the saved program separately from the current draft selection.
- Program choice uses the existing encrypted profile persistence. Tool registration, navigation and drafts remain in memory and clear when the vault locks. Keep all new labels/descriptions bilingual.
- The six tools read real diary, goal, weight and workout data. Hidden Fat Scanner opens the food photo/review flow and lists today's reviewed scans. Cooking-fat estimates are a subset of the scanned meal's total fat. Keep the optional manual extra-fat calculator clearly separated and explain that it is only for missing fat; its tagged Add/Remove entries include fat energy in the encrypted diary.
- Protein Splitter divides the rounded saved target into four or five intervals; show when 30 g per interval is infeasible. Protein Radar groups today's food logs by meal type and distinguishes missing and unknown values. The 30 g protein benchmark does not measure leucine.
- Fat Gauge uses the lower of the saved fat goal and **0.6 g/kg** during Mini Cut, with green below 80%, amber at 80–100%, and red above the ceiling. Unknown fat or missing weight prevents a confirmed Safe label. The dashboard and diary display the same ceiling; saved baseline targets remain intact.
- Phase & Cycle saves a start date and duration (**3–6 weeks Mini Cut; 3–24 weeks Lean Bulk**). Mini Cut schedules days 7, 14, etc., with **300–500 additional kcal** from carbs. Effective targets change for those dates without logging food or overwriting base goals. Show active/upcoming/completed states; changing the saved program clears an incompatible cycle.
- Recomp Matrix compares the latest seven calendar days with the previous seven. Require three distinct weigh-in days per window and at least one comparable supported loaded exercise. Use daily-mean weight and median paired best estimated 1RM change; show volume as context. Exclude timed, assisted and bodyweight movements. Optimal Recomp is a trend label, not measured fat loss or muscle gain.
- All charts are original inline SVG with readable numeric/list/table equivalents. Tool settings and schedules use encrypted storage; unsaved form inputs stay in the dialog and clear on lock.
- The Special Program grid and locked preview use wrapping labels, clear boundaries and 48px actions; on very narrow screens they reflow from three columns to two. The activation button stays in the dialog footer. Tool content uses a bounded scroll area and shared focus indicators.
- In Hidden Fat Scanner, let preset labels and amount controls reflow when the dialog is narrow. Split large values and gauge thresholds into smaller columns or rows without hiding values or changing calculations. Keep per-tool controls and menu actions stable across updates.
- The phase form shows inline errors and a focusable linked summary after invalid submission. Recheck without moving focus while editing, preserve the existing saved-cycle constraints and accept whole extra-calorie values from 300 through 500. Clear validation state on lock or leaving the tool.

## Initial onboarding and target review

- Start with a welcoming **Introduction (step 0)**, followed by four setup steps in the same green, **430px maximum-width** app column: fitness objective; body metrics; daily activity; personalized target review. The introduction uses original bundled SVG artwork, three short feature descriptions and a clear Let’s set your goals action.
- Show the localized step label above a segmented progress bar and a four-item step list (Objective, Body metrics, Activity, Review). Mark the current step with `aria-current="step"`, and completed steps with checkmarks. These indicators describe progress; Back and Continue control navigation.
- Use native radio inputs inside whole-card labels for objective and activity selection, with one named group per step. Let the browser provide arrow-key/Space behavior; put focus, selected, invalid and disabled styling on the card via its input state. Keep selected input IDs stable through in-place renders.
- Keep field labels/help and card descriptions at 14px or larger, inputs at 16px, and the introductory heading description at 16px. Show the permitted body-metric ranges as associated help. Preserve the existing calculators, validation bounds, optional-target behavior and manual-energy path.
- After a failed Continue, focus a linked error summary at the top of the main content, with clearance below the privacy bar. Keep every inline error and `aria-invalid` state; summary links focus the corresponding control and can return to an earlier invalid step. Editing updates feedback without moving focus, and unchanged summaries retain their links.
- Keep a localized Introduction or **Step X of 4** label and four-segment progress bar at the top. Back preserves answers, including returning from step 1 to the introduction. Use shared screen transitions and a sticky bottom primary action with safe-area padding; errors remain visible beside the action and affected field.
- Present six objectives as selectable icon cards: **Lose Weight, Build Muscle, Maintain Weight, General Fitness, Mini Cut and Lean Bulk**. Give the last two a Special Program badge. A selection remains a draft; only final confirmation saves the matching `primaryObjective` and `dietProgram` and unlocks the extension menu for a special program.
- Body metrics use canonical **cm / kg** inputs, an integer age (**15–100**), height (**100–250 cm**) and current/optional target weight (**30–250 kg**). Show the target-weight difference immediately. Collect age without inventing a birth date; retain an existing birth date only when it agrees with the entered age. Existing display-unit preferences remain intact.
- Offer Male, Female and Other. Mifflin–St Jeor uses the entered metrics and one of its defined male/female equations. Other requires a manual calorie target and shows no guessed BMR or TDEE.
- Review standard-goal TDEE with a **400 kcal deficit** for Lose Weight, a **250 kcal surplus** for Build Muscle, and maintenance calories for Maintain Weight or General Fitness. Standard macro targets remain **30% protein / 40% carbs / 30% fat**. Allow a whole-number calorie adjustment and reset to the estimate; explain targets that need review and block a special-plan budget that cannot fit its protein and fat.
- Mini Cut uses a **25% deficit**, with configured floors of **1,200 kcal for female** and **1,500 kcal for male/Other**, **2.3 g/kg protein**, and fat at **0.65 g/kg with a 35 g minimum**. Lean Bulk onboarding uses the **intermediate +220 kcal** surplus, **1.9 g/kg protein** and approximately **25% of calories from fat**. Both use the remaining energy for carbohydrates. Floors are planning defaults, without a guarantee of individual suitability; Other still supplies calories manually rather than receiving a guessed TDEE.
- Display hydration at **38 ml/kg for Mini Cut**, **35 ml/kg for Lean Bulk** and **32.5 ml/kg for standard goals**, all rounded to **50 ml**. Mini Cut review shows a **4-week recommendation**, **6-week maximum** and an **optional maintenance-calorie day every 7 days**. Lean Bulk shows the **0.25–0.5% bodyweight/week** gain range. These are planning summaries, not a running phase schedule.
- Save draft answers through the encrypted vault without replacing focused inputs. Get Started validates and recalculates the final profile and targets, waits for durable storage, then opens Dashboard. Show saving and retry states accurately; a failed write keeps the review available.
- Restart Goal Setup opens the introduction and pre-fills a draft while retaining the confirmed profile, goals and histories until final confirmation. Returning users can choose Keep my current goals to discard that draft. First-time users complete setup before entering the main app; recording their initial weight is idempotent across save retries. Version-2 four-step and older six-step drafts retain their resume position where valid; completed users remain completed.
- Accepting an Activity Level calorie suggestion for a saved Mini Cut or Lean Bulk recomputes calories, macros and hydration together through the shared service. Keep the saved objective and diet-program identifiers aligned across onboarding, Goal Settings and reload.

### Local nutrition plan service

Use `src/services/nutritionPlanService.ts` for the six public planning functions. They calculate results without network calls or storage writes; translated notes are generated for display rather than saved as user data.

| Function | Planning rule |
| --- | --- |
| `calculateMiniCutCalories` | TDEE × 0.75, rounded to whole calories and the configured gender floor |
| `calculateMiniCutMacros` | Rounded 2.3 g/kg protein, rounded 0.65 g/kg fat with a 35 g minimum, remaining carbohydrates |
| `getMiniCutPlanDetails` | Mini Cut targets plus 4-week recommendation, 6-week maximum and optional 7-day maintenance interval |
| `calculateLeanBulkCalories` | Beginner **+300**, intermediate **+220**, advanced **+150 kcal**; intermediate is the default |
| `calculateLeanBulkMacros` | Rounded 1.9 g/kg protein, approximately 25% calorie share from rounded fat grams, remaining carbohydrates |
| `adjustLeanBulkCalorieSurplus` | Suggest **+120 kcal** below or **−120 kcal** above the inclusive **0.25–0.5% bodyweight/week** gain range; leave the calorie target unchanged for gains within that range |

- Calculate remaining carbohydrate grams by rounding down so the macro total stays within the calorie budget. An infeasible protein/fat budget returns an explicit error for review.
- The Lean Bulk adjustment is a pure recommendation and does not watch the weight diary, change saved targets or write weight entries. Its lower bound is the app's **800 kcal input minimum**, rather than an individual nutrition recommendation. Applying a suggestion requires an explicit caller action.

## Food photo and Hidden Fat review

- Use the shared green surfaces, 48px controls, 16px editable text and rounded cards within the 430px app shell. A real selected photo replaces the empty photo card; remove fabricated recognition/confidence/ingredient/nutrient defaults.
- Scanner and review use the same sticky food-entry header, 20px main gutters, 16px card gaps and semantic light/dark tokens as Diary. Reflow photo/review controls into one column on narrow phones. Keep privacy details in a native disclosure and explain why an analysis action is unavailable.
- Offer **Take photo** and **Choose photo** using the platform file picker, plus manual nutrition entry. Show local image preparation, analysis, cancel/retry and pending-backend states accurately. Confirm photo processing with a localized provider notice before invoking a configured backend.
- Results describe one whole portion. Show estimated calories, protein, carbs and **total fat**, with missing values displayed as unknown. Allow users to edit name, portion description and all totals before confirmation; changing a portion description requires reviewing the totals explicitly.
- Review uses a native form with required name, portion description and calories, plus optional macros. Keep Confirm available so a failed submission can focus a linked error summary and identify individual fields. Recheck shown errors during edits without moving focus. The service remains the save-validation authority; cooking-fat drafts resolve through its existing difference accounting. Disable the form during saving/locking, and clear validation identifiers on scan disposal.
- The existing nutrient dialog uses labeled 16px search, 48px controls, wrapping category buttons with pressed state, readable nutrient amounts and a two-column macro preview. Keep AI notes, confidence, daily-reference semantics and unavailable nutrients visible through the existing categories/disclosure.
- Present Hidden Fat as cooking fat **already included** in total fat. For Special Program users, provide an editable included amount and **Less oil / Original estimate / More oil** choices derived from the returned range or the original estimate. Changes to a known included amount adjust total fat by its difference and energy by **9 kcal/g**. An unknown included amount is identified within the entered total instead of added automatically.
- Show cooking-fat sources, assumptions, uncertainty range and confidence only when supplied. Preserve warnings and original nutrition/portion metadata alongside edited fields. Detailed nutrient data continues to describe the original analyzed portion unless a separate recalculation is supplied.
- Confirmation logs one meal for the actual local day, updates diary-derived tools, consumes only that photo's draft and uses existing save status for durable-storage completion. API retries and alternative identities never log meals. Persist confirmed nutrition in the encrypted vault. Navigation keeps the in-memory queue; Clear, page close and vault lock discard photos, choices, consent and unfinished edits. Saved/skipped items release their photo immediately.
- All app-owned copy is EN/TH. Backend names, foods, ingredients and analysis notes are escaped text; request the selected language from Maxplus.
- Maxplus uses the owner’s server-side Streamlit Secrets and a configured image-capable model. Show consent with the accurate provider notice for the selected queue; adding photos resets consent. Keep provider/credential/quota/vision/timeout errors actionable, and retain manual entry. If the owner sets a separate service access code, show a 16px password field in the same green card; the code is ephemeral and distinct from the vault PIN.
- The small Streamlit API component runs invisibly alongside the original app iframe; its RPC fragment polls independently. Keep the app in its original `st.iframe` to preserve its storage origin, scrolling, privacy bar, focus and viewport behavior. Public configuration contains provider/model/notices and readiness; service credentials remain on the server.

## English and Thai

- The selected language applies throughout the app: lock screen, navigation, settings, forms, calendars, validation, exercise names, muscle labels and demo replies.
- Use `tr`, `trHtml` and the existing localized label helpers with `src/i18n/messages.json`. Escape dynamic values when rendering HTML.

## Insights and profile

- Keep the existing Insights sections and calculations. Give the period, chart and nutrient-category controls wrapping 48px targets, localized labels and selected states. Chart bars remain scrollable; a native disclosure lists each day's recorded amounts, effective targets and unknown-value counts so dense 30/90-day charts have a readable alternative.
- The chart detail panel announces the selected day's values and returns focus to its bar when closed. Respect the selected date range and the existing daily refeed and fat-ceiling targets; unknown nutrients are not presented as confirmed zero values.
- Profile menu rows wrap long Thai/English labels, descriptions and status text. Use 48px Back/Edit controls, escaped text and stable IDs; keep the grouped menu and existing destinations.
- App Settings exposes theme/unit selection as pressed buttons and accessibility preferences as named switches with their current state. Fields in profile subpages use at least 16px text and visible focus; preserve their existing validation and data flows.
- Help Center uses a labeled search field, native FAQ disclosures and current explanations of AI estimates, PIN-protected local storage, consent and backup behavior.
- Preserve user-entered names, notes, custom food descriptions and messages. Keep brand names, artwork credits and scientific abbreviations in their original form.
- Update the document language to `en` or `th`. Display dates with `en-US` or `th-TH-u-ca-gregory-nu-latn`; stored date keys remain `YYYY-MM-DD`.
- Language selection is available at the PIN gate and Profile → App Settings → Language. Only the non-sensitive language code is kept outside the encrypted vault for startup presentation.

## Privacy and honest product states

- Treat the PIN gate, save indicator, Lock control and background privacy shield as part of the same green app theme.
- The lock screen uses six animated dots and a 3 × 4 circular numeric keypad with letter groups, zero and backspace. The sixth digit submits automatically. Creation asks for the PIN twice; mismatches shake and return to the first step. Keep touch targets at 64–72px, use green filled dots, and respect reduced motion.
- Show verification and persistent lockout countdowns in place. Keypad and language controls are disabled during cryptographic work. Existing passphrase vaults display a migration form before choosing a PIN, preserving their data and explaining original-backup credentials.
- Keep brand and language selection in one wrapping row above the PIN card. Present a compact lock/context row, the main prompt, creation Step 1/2, the auto-submit instruction and six dots before the keypad. Use 64px keys on short screens and 72px keys where room permits; keep ordinary document scrolling available.
- Use explicit busy states and readable error/countdown surfaces. Announce digit progress only when its count changes, focus the prompt when confirmation starts, and keep the encrypted-backup file control keyboard reachable with a visible focus indicator. Privacy and backup explanations use readable 12–14px text in the same theme.
- Distinguish saving, saved and failed states accurately; show actionable storage errors without claiming success.
- Keep the existing encrypted browser vault and encrypted backup flow. Explain relevant limitations when users make decisions about backup, restore or clearing data.
- Label scanner and coach preview functionality truthfully. UI copy should match the current capabilities, including the absence of automatic device sync and password recovery.
- Theme, language and motion changes must preserve the privacy behavior described in `docs/PRIVACY_AUDIT.md`.

## Implementation references

- `src/ui/theme.css`: light/dark semantic colors, action states, font families, control dimensions, radii, shadows and motion tokens. Imported before `src/index.css` through `src/main.ts`.
- `tailwind.config.js`: legacy palette utilities, spacing, radii and shadows; font utilities refer to the shared theme variables. Keep the current Tailwind 3 syntax when using skill recommendations written for newer versions.
- `src/index.css`: shared controls, privacy surfaces, imagery, muscle map and reduced motion.
- `index.html`: mobile viewport and 430px app shell.
- `src/components/Navigation/`: header and bottom navigation patterns.
- `src/components/Dashboard/` and `src/screens/DashboardScreen.ts`: card renderers, scoped styles, selected-day data and widget ordering.
- `src/components/Food/DiarySections.ts`, `FoodEntryHeader.ts`, `foodEntry.css` and `src/screens/diaryViewport.ts`: diary cards, date controls, food-entry headers and scoped presentation.
- `src/screens/QuickLogScreen.ts` and `quickLogController.ts`: manual-entry fields, validation, unit normalization, optional My Foods save and selected-date completion.
- `src/screens/FoodSearchScreen.ts` and food modals in `src/components/Modals/`: local/online collection controls, portion choices and food-detail forms.
- `src/security/vaultUI.ts`: PIN gate, status and shield.
- `src/components/Fitness/` and `src/screens/FitnessScreen.ts`: artwork and workout presentation.
- `src/components/Fitness/exerciseCatalog.css` and `fitnessPlanner.css`: scoped catalog, calendar and planner-dialog presentation.
- `src/components/Fitness/restTimer.css` and `workoutHistory.css`: scoped rest-clock and workout/record detail presentation; the existing clock lifecycle remains in `RestTimerDialog.ts`.
- `src/components/PhasicTools/phasicTools.css`, `PhaseCycleTracker.ts` and `phasicToolController.ts`: responsive special-program controls, field feedback and existing tool persistence lifecycle.
- `src/components/Insights/insightsProfile.css`, `src/screens/InsightsScreen.ts` and `src/components/Profile/`: existing insights layout, daily-value disclosure, profile navigation and settings presentation.
- `src/ui/screenTransitions.ts`: navigation motion and scroll restoration.
- `src/ui/navigationLayout.ts`: bottom-navigation measurement, content clearance and cleanup on lock.
- `src/ui/dialogs.ts`: active dialog, focus, background scrolling and form preservation.
- `src/screens/onboarding/OnboardingScreen.ts`, `onboardingController.ts` and `src/utils/onboardingGoals.ts`: four-step presentation, input lifecycle and shared target validation/calculation.
- `src/services/nutritionPlanService.ts`: local Mini Cut and Lean Bulk calorie, macro, duration and adjustment rules.
- `src/screens/ScannerScreen.ts`, `FoodResultScreen.ts`, `foodScanController.ts` and `src/services/foodScanService.ts`: photo preparation, nutrition review, included-fat accounting and ephemeral scan lifecycle.
- `src/components/FoodScan/`: shared scanner header, queue/status cards, review-field feedback, activity pill, measured widget clearance and scoped `foodScan.css`. `src/components/Modals/NutrientDetailModal.ts` retains the detailed nutrient view and dialog lifecycle.
- `src/services/foodAnalysisBackend.ts`, `aiFoodAnalysisAdapter.ts`, `streamlitFoodAnalysis.ts` and `docs/FOOD_SCAN_BACKEND.md`: trusted backend registration, Maxplus session transport and validated analysis contract.
- `backend/` and `streamlit_component/index.html`: server credentials, provider/schema validation, request budget and a small invisible RPC component.
- `src/i18n/`: bilingual presentation helpers and messages.

## UI/UX improvement series

Track the ten incremental PRs in [docs/UI_UX_ROADMAP.md](docs/UI_UX_ROADMAP.md). Each part extends this reference using UI UX Pro Max guidance and the app's existing green direction. Send each part for review before starting the next, unless the user requests the full series together.

## Detailed nutrients and Insights data (2026-10-13)

- Keep the existing Insights layout and category filters. Display the complete supported nutrient list with recorded-day/meal coverage and clear AI estimate attribution; all-null profiles contribute no coverage. The nutrient dialog shows per-row confidence and estimate notes. Unknown values remain unavailable.
- Keep calorie/macro charts connected to the same portion snapshots as Diary. Use saved protein goals, exact hydration targets, day-specific refeed calories/carbs and the current Mini Cut fat ceiling.
- Add six tool summaries within the existing Activity & Nutrition Analysis section for saved special programs. Open the existing tool dialog from a summary, and use the shared exit transition to return from a tool to Insights. Plans and scheduled allowances are not logged food. Recomp retains its labeled seven-day comparison.

### Food-scan batch progress

- While analyzing, show a readable percentage, green progress bar and localized stage/batch counter on each active photo card. Use completed workflow milestones; do not simulate progress with a timer. Keep Stop reachable on narrow screens.
- Update mounted meters in place so progress events do not move focus or reset animation. Respect Reduce Motion. Progress is transient and clears on error, cancellation, queue clearing or vault lock; app navigation preserves it.
- Show the whole queue's stage percentage and ready/choice/error counts alongside individual photo progress. Explain that handled errors/skipped photos count toward workflow progress and that 100% does not guarantee a successful result or a saved meal.
- A missing detailed nutrient batch must not discard a valid primary meal. Show its warning and unavailable nutrients in the existing result review, then save one combined meal only after confirmation.

### Multiple photos, food choices and activity pill

- Add up to **five photos** through a multi-select gallery or successive camera captures, with one dish/portion per photo. Use rounded photo cards, optional 16px dish-name inputs, individual progress/retry/manual controls and **Skip this photo / duplicate dish**. Avoid automatically merging all pictures of a table into one calorie total.
- For uncertain recognition, show **1–3 alternative menu cards** with escaped names, portions and short reasons. Ask which ONE portion to log. Selecting one computes only its detailed nutrients; none fitting supports a named retry/manual entry. Keep unrecognizable non-food images honest rather than forcing fictional options.
- Analyze returns to Home with a green, rounded **activity pill** below the vault bar, showing queue percentage and counts for ready results, required choices and errors. Tap opens the queue; Stop cancels pending analysis. Use 48px controls, and mount the pill outside animated screens, below dialogs and the privacy bar. Measure its real height with a lifecycle-managed `ResizeObserver` so wrapping translations reserve enough header space; disconnect and clear the geometry on removal/lock. Keep stable action IDs for focus recovery during status changes.
- Work continues across screens in the open, unlocked app, with no automatic navigation when results arrive. The ordinary privacy shield and idle lock remain active. This is not a native OS background service.
- Each photo keeps independent result/edit state; reviewing or saving one must preserve other pending photos. The existing review screen shows its photo position, other ready results and a Back to photo queue action. Do not persist raw images, queue state or candidate options. Confirmed meals continue to feed the same Diary, Insights and Special Program tools.
- Treat a different reviewed photo and a different scanner mode as separate screen transitions so navigation restores the appropriate heading/scroll. After choosing, retrying, stopping, skipping or clearing, recover focus at the affected queue item or a remaining action.
