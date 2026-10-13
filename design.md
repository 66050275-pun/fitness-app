# NutriAI design reference

This file records the current theme of `fitness-app`. Read it before changing the UI. Keep new screens and components consistent with these patterns, and update this reference when an intentional design change is made.

Reference date: 2026-10-13. The actual tokens live in `tailwind.config.js` and `src/index.css`.

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
- Drawers open as centered dialogs with **24px** corners on all sides, a clear title, a close control and a bounded scrollable body. Use `.ui-dialog-layer`, `.ui-dialog-panel` and `.ui-dialog-body`; keep headers and action bars outside the scroll body where practical.
- **Quick Add** is a bottom sheet above the navigation bar: a **2-row × 3-column** grid of six icon-and-label actions, rounded top corners, a subtle shadow and a dimmed, blurred backdrop. Keep the center Add button available to close the menu, and disable the other navigation buttons until dismissal. Other dialogs retain their centered placement.
- Put the seventh **More** action in a separate full-width row below that grid. It opens the Special Program menu through the same exit/entry lifecycle; show one sheet at a time. Back returns from a tool dialog to the extension grid, then to Quick Add. The backdrop, X and center button close the menu.
- The extension grid has six actions: Hidden Fat Scanner, Protein Splitter, Protein Radar, Fat Gauge, Phase & Cycle, and Recomp Matrix. Use a lock preview and a fixed **Activate in Goal Settings** footer for standard goals. Open each functional tool in a centered, scrollable dialog using the shared lifecycle. Keep the center close button clear of the panel.
- Quick Add slides up and fades in over **220ms**, then slides down and fades out over **180ms**. Keep its mounted content and background scroll lock until exit completes. Respect Reduce Motion and cancel pending actions immediately when the vault locks. Food scanning shows **Setup pending** until a backend is registered; barcode decoding retains its **Prototype** badge.
- Fit dialogs to the visible viewport, including keyboard and browser bar changes. Reserve the privacy status bar, 12px edge gutters and safe areas. Streamlit uses a viewport-height iframe, with scrolling inside the app rather than in the host page.
- Show one active dialog at a time; hide and disable any underlying dialog during a drilldown or confirmation, then restore it on close. Preserve form text, focus, selection and internal scroll across data updates. Lock background scrolling while a dialog is open and restore it on close. Escape and the device Back button dismiss the active dialog before navigating; keep the privacy Lock control available.
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
- Format numeric readouts with `formatDisplayNumber` from `src/utils/safeNumbers.ts`: at most two decimal places for macros and training values, whole calories in summary cards, and up to four decimals where micronutrients need that precision. Formatting affects presentation only; editable inputs and stored values keep their precision.
- Numeric cards must allow wrapping and shrinking with `min-width: 0`. Put macro targets on a separate line, let long Thai labels wrap, and rearrange compact grids on narrow phones. Show the full value rather than clipping it or replacing it with an ellipsis.

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

### Rest interval clock

- Completing a set opens a focused, centered clock using the shared viewport and dialog infrastructure. Keep the privacy bar and Lock control visible.
- Use a large 2D circular dial with fine radial ticks, green remaining progress, a prominent tabular **mm:ss** readout and the localized finish time. Apply the existing light/dark surface colors and heading font.
- Put **+30 seconds** below the dial and large circular Pause/Resume and Skip Rest controls at the bottom. Preserve readable labels and scroll the body on short screens while keeping controls accessible.
- Back closes the clock while the rest continues; the compact workout timer reopens it. Skip ends the rest. Rest Pause affects the rest countdown; the workout's Pause freezes both timers. Resume Workout resumes the session while preserving any separate rest pause.
- Derive the rest countdown from its local deadline rather than interval callback counts. Update the dial in place without restarting transitions or moving focus, and close it when the rest finishes. Timer state stays in memory and is cleared when the vault locks.

### Workout assistant

- Show the next-set suggestion in the rest clock's scrollable body and above the active set log. Use the same green surfaces, readable reason, formatted load and reps, and explicit Apply/Applied status.
- Automatically fill only an incomplete set that the user has not edited. Preserve manual entries and completed sets. Undoing the source set restores an untouched automatic fill; manual changes are retained.
- Distinguish target reps from actual reps. Load inputs accept 0.25 kg steps to accommodate 1.25 kg increments.
- Before starting, explain loads drawn from saved history. Use a stable rep bracket and increase only after every prescribed set reaches its upper bound at the same positive load. Bodyweight, timed and assisted movements do not receive automatic weight increases.
- Suggestions and Epley estimates are local calculations. Recompute their wording when the language changes; do not store localized reasons in workout history.

## Food catalog and online search

- Bundle Thai dish estimates for offline search in both English and Thai, with gram-based regular/large/small portions. Clearly label estimated recipe nutrition; changing ingredients needs a separate recipe, rather than a size option.
- Keep local search immediate. Open Food Facts Thailand search requires the visible **Search online** action and explains that the search text is sent to that provider.
- Show distinct loading, unavailable and no-result states. Retain the Open Food Facts product link and ODbL attribution on imported foods. Unknown nutrients display as unavailable and remain null.
- Query text and unsaved results remain in memory. Logged product definitions and diary snapshots use the existing encrypted browser vault; locking cancels outstanding requests.

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

## Initial onboarding and target review

- Start with a welcoming **Introduction (step 0)**, followed by four setup steps in the same green, **430px maximum-width** app column: fitness objective; body metrics; daily activity; personalized target review. The introduction uses original bundled SVG artwork, three short feature descriptions and a clear Let’s set your goals action.
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
- Offer **Take photo** and **Choose photo** using the platform file picker, plus manual nutrition entry. Show local image preparation, analysis, cancel/retry and pending-backend states accurately. Confirm photo processing with a localized provider notice before invoking a configured backend.
- Results describe one whole portion. Show estimated calories, protein, carbs and **total fat**, with missing values displayed as unknown. Allow users to edit name, portion description and all totals before confirmation; changing a portion description requires reviewing the totals explicitly.
- Present Hidden Fat as cooking fat **already included** in total fat. For Special Program users, provide an editable included amount and **Less oil / Original estimate / More oil** choices derived from the returned range or the original estimate. Changes to a known included amount adjust total fat by its difference and energy by **9 kcal/g**. An unknown included amount is identified within the entered total instead of added automatically.
- Show cooking-fat sources, assumptions, uncertainty range and confidence only when supplied. Preserve warnings and original nutrition/portion metadata alongside edited fields. Detailed nutrient data continues to describe the original analyzed portion unless a separate recalculation is supplied.
- Confirmation logs one meal for the actual local day, updates diary-derived tools, consumes the draft and uses the existing save status for durable-storage completion. API retries do not log meals. Persist results in the encrypted vault; discard image bytes, object URLs, consent and unfinished edits when leaving the scan flow or locking the vault.
- All app-owned copy is EN/TH. Backend names, foods, ingredients and analysis notes are escaped text; request the selected language from Maxplus.
- Maxplus uses the owner’s server-side Streamlit Secrets and a configured image-capable model. Show consent with the accurate provider notice before each selected photo is analyzed. Keep provider/credential/quota/vision/timeout errors actionable, and retain manual entry. If the owner sets a separate service access code, show a 16px password field in the same green card; the code is ephemeral and distinct from the vault PIN.
- The small Streamlit API component runs invisibly alongside the original app iframe; its RPC fragment polls independently. Keep the app in its original `st.iframe` to preserve its storage origin, scrolling, privacy bar, focus and viewport behavior. Public configuration contains provider/model/notices and readiness; service credentials remain on the server.

## English and Thai

- The selected language applies throughout the app: lock screen, navigation, settings, forms, calendars, validation, exercise names, muscle labels and demo replies.
- Use `tr`, `trHtml` and the existing localized label helpers with `src/i18n/messages.json`. Escape dynamic values when rendering HTML.
- Preserve user-entered names, notes, custom food descriptions and messages. Keep brand names, artwork credits and scientific abbreviations in their original form.
- Update the document language to `en` or `th`. Display dates with `en-US` or `th-TH-u-ca-gregory-nu-latn`; stored date keys remain `YYYY-MM-DD`.
- Language selection is available at the PIN gate and Profile → App Settings → Language. Only the non-sensitive language code is kept outside the encrypted vault for startup presentation.

## Privacy and honest product states

- Treat the PIN gate, save indicator, Lock control and background privacy shield as part of the same green app theme.
- The lock screen uses six animated dots and a 3 × 4 circular numeric keypad with letter groups, zero and backspace. The sixth digit submits automatically. Creation asks for the PIN twice; mismatches shake and return to the first step. Keep touch targets at 64–72px, use green filled dots, and respect reduced motion.
- Show verification and persistent lockout countdowns in place. Keypad and language controls are disabled during cryptographic work. Existing passphrase vaults display a migration form before choosing a PIN, preserving their data and explaining original-backup credentials.
- Distinguish saving, saved and failed states accurately; show actionable storage errors without claiming success.
- Keep the existing encrypted browser vault and encrypted backup flow. Explain relevant limitations when users make decisions about backup, restore or clearing data.
- Label scanner and coach preview functionality truthfully. UI copy should match the current capabilities, including the absence of automatic device sync and password recovery.
- Theme, language and motion changes must preserve the privacy behavior described in `docs/PRIVACY_AUDIT.md`.

## Implementation references

- `tailwind.config.js`: palette, spacing, radii, fonts and shadows.
- `src/index.css`: shared light/dark variables, privacy surfaces, imagery, muscle map and reduced motion.
- `index.html`: mobile viewport and 430px app shell.
- `src/components/Navigation/`: header and bottom navigation patterns.
- `src/security/vaultUI.ts`: PIN gate, status and shield.
- `src/components/Fitness/` and `src/screens/FitnessScreen.ts`: artwork and workout presentation.
- `src/ui/screenTransitions.ts`: navigation motion and scroll restoration.
- `src/ui/dialogs.ts`: active dialog, focus, background scrolling and form preservation.
- `src/screens/onboarding/OnboardingScreen.ts`, `onboardingController.ts` and `src/utils/onboardingGoals.ts`: four-step presentation, input lifecycle and shared target validation/calculation.
- `src/services/nutritionPlanService.ts`: local Mini Cut and Lean Bulk calorie, macro, duration and adjustment rules.
- `src/screens/ScannerScreen.ts`, `FoodResultScreen.ts`, `foodScanController.ts` and `src/services/foodScanService.ts`: photo preparation, nutrition review, included-fat accounting and ephemeral scan lifecycle.
- `src/services/foodAnalysisBackend.ts`, `aiFoodAnalysisAdapter.ts`, `streamlitFoodAnalysis.ts` and `docs/FOOD_SCAN_BACKEND.md`: trusted backend registration, Maxplus session transport and validated analysis contract.
- `backend/` and `streamlit_component/index.html`: server credentials, provider/schema validation, request budget and a small invisible RPC component.
- `src/i18n/`: bilingual presentation helpers and messages.

## Detailed nutrients and Insights data (2026-10-13)

- Keep the existing Insights layout and category filters. Display the complete supported nutrient list with recorded-day/meal coverage and clear AI estimate attribution; all-null profiles contribute no coverage. The nutrient dialog shows per-row confidence and estimate notes. Unknown values remain unavailable.
- Keep calorie/macro charts connected to the same portion snapshots as Diary. Use saved protein goals, exact hydration targets, day-specific refeed calories/carbs and the current Mini Cut fat ceiling.
- Add six tool summaries within the existing Activity & Nutrition Analysis section for saved special programs. Open the existing tool dialog from a summary, and use the shared exit transition to return from a tool to Insights. Plans and scheduled allowances are not logged food. Recomp retains its labeled seven-day comparison.
