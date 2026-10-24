# NutriAI UI/UX improvement series

Ten incremental pull requests, requested on 2026-10-24. Each part is reviewed before the next begins. The sequence numbers below are rollout parts, not GitHub PR numbers.

## Design basis

Use `design.md` as the app reference, with UI UX Pro Max for focused guidance. NutriAI is a TypeScript/Vite mobile web app with Tailwind **3**, a 430px app column, bundled Inter / Plus Jakarta Sans, Material Symbols, Thai/English localization and green light/dark themes. Adapt newer Tailwind examples to the installed version.

Apply each change to existing components and data flows. Keep the vault origin and encrypted persistence, nutrition calculations, AI review workflow, exercise attribution and current Insights structure while improving their presentation.

## Sequence

| Part | Area | Reviewable scope | Status |
| --- | --- | --- | --- |
| 1/10 | Shared design foundations | Central semantic theme tokens; consistent primary actions, icon controls and fields; initial adoption in vault/onboarding/Quick Add | Approved and merged: [PR #11](https://github.com/66050275-pun/fitness-app/pull/11) |
| 2/10 | App shell and navigation | Shared header, bottom navigation, readable labels, touch targets and clearance for fixed controls | Approved and merged: [PR #12](https://github.com/66050275-pun/fitness-app/pull/12) |
| 3/10 | PIN and onboarding | Lock-screen hierarchy, introduction and setup cards, progress, field help and inline feedback | Approved and merged: [PR #13](https://github.com/66050275-pun/fitness-app/pull/13) |
| 4/10 | Home dashboard | Daily energy, macros, hydration and widget hierarchy; readable values on narrow phones | Approved and merged: [PR #14](https://github.com/66050275-pun/fitness-app/pull/14) |
| 5/10 | Diary and manual logging | Meal sections, food search, portions, Quick Log and empty/save states | Approved and merged: [PR #15](https://github.com/66050275-pun/fitness-app/pull/15) |
| 6/10 | AI food scanning | Multi-photo queue, uncertainty choices, nutrient review, progress and in-app activity pill | Prepared for review |
| 7/10 | Fitness planning and catalog | Program cards, routine setup, exercise search/filter controls, imagery and anatomy hierarchy | Planned |
| 8/10 | Workout session and history | Set entry, rest clock, assistant suggestions, completion summary and records | Planned |
| 9/10 | Special Program tools | Extension menu, locked preview, six tool dialogs and clear phase/target feedback | Planned |
| 10/10 | Insights and profile | Existing charts/data labels, settings/help rows, long Thai labels and remaining cross-screen presentation inconsistencies | Planned |

## Part 1 details

- Move the existing light/dark palette into `src/ui/theme.css`. Add action-state, font and control tokens without changing the brand palette.
- Connect Tailwind font utilities to the same font tokens.
- Give `.ui-primary-button` a readable 16px label, wrapping, enabled-only interaction states and visible focus separation.
- Introduce `.ui-icon-button` (48px) and `.ui-field` (48px, 16px text). Adopt them in existing Quick Add Back/Close buttons, onboarding Back/fields and vault language/legacy-passphrase fields.
- Distinguish disabled controls from controls explicitly marked busy. Existing reduced-motion rules continue to cover transitions.

## Part 2 details

- Give the shared header a separate date row, wrapping identity text, a semantic Profile button and stable IDs for focus restoration. Use the shared 48px action controls and localize time-appropriate greetings, streak wording and theme actions.
- Refactor the existing four bottom destinations into one rendering helper around the centered Add toggle. Keep the routes and click handlers; use wrapping 12px labels, generous targets and a stable selected-state pill instead of scaling destinations.
- Keep the center Add button available while Quick Add is open; disable the other destinations using native button state alongside the dialog's existing inert handling.
- Measure the real navigation height with a lifecycle-managed `ResizeObserver`, reserve content clearance and keep the full-height coach composer above the bar. Clear measurements and disconnect on vault lock.
- Preserve focused navigation controls during same-route navigation markup updates. Existing Back behavior, screen transitions and reduced-motion handling continue through the shared lifecycle.

## Review record

Record the PR link and build result for each part as it becomes available. Browser/device review remains separate from compilation; do not describe a build as visual verification. Automated tests are run only when requested by the user.

Part 1: [PR #11](https://github.com/66050275-pun/fitness-app/pull/11) approved and merged to `main` at `84524e2ba29394173e99b4c494c2a30f1c221c0d`. Its tree matches the build-checked version. `npm run build` and `git diff --check` passed; the existing Vite chunk-size warning remains. No automated tests or browser/device checks were run.

Part 2: [PR #12](https://github.com/66050275-pun/fitness-app/pull/12) approved and merged at `e00694f8288c99cf267307b252819d1492b44b4f`, with its tree matching the build-checked version. `npm run build` and `git diff --check` passed. The existing Vite chunk-size warning remains. No automated tests or browser/device checks were run.

Part 3: [PR #13](https://github.com/66050275-pun/fitness-app/pull/13) approved and merged at `8729ca47f77d3978dd60c3db2f208579b12b9ac9`, with its tree matching the build-checked version. `npm run build` and `git diff --check` passed. The existing Vite chunk-size warning remains. No automated tests or browser/device checks were run.

Part 4: [PR #14](https://github.com/66050275-pun/fitness-app/pull/14) approved and merged at `aa5fedaafed5184920dffffab2e07cae71f3ee2d`, with its tree matching the build-checked version. `npm run build` (strict TypeScript + Vite) and `git diff --check` passed. The existing Vite chunk-size warning remains. No automated tests or browser/device checks were run. Long numbers/names, unknown nutrition, widget ordering/visibility/focus, hydration logging above 12 glasses and TH/EN light/dark layouts still need browser/device review.

Part 5: [PR #15](https://github.com/66050275-pun/fitness-app/pull/15) approved and merged at `b079c62d53967a2aebbe5f923976e80cea615a70`, with its tree matching the build-checked version. `npm run build` (strict TypeScript + Vite) and `git diff --check` passed. The existing Vite chunk-size warning remains. No automated tests or browser/device checks were run. Narrow-phone TH/EN light/dark layouts, mobile date/time controls, keyboard/focus behavior, draft preservation during updates, portion reuse and encrypted save/retry behavior still need browser/device review.

Part 6: Prepared for review. `npm run build` (strict TypeScript + Vite) and `git diff --check` passed. The existing Vite chunk-size warning remains. No automated tests, browser/device checks or live-provider calls were run. Phone layouts in TH/EN and both themes, keyboard/error-summary focus, per-photo draft switching, wrapped activity-pill clearance, modal transitions and save/lock recovery still need browser/device review. Publication to `main` is pending approval.

## Part 3 details

- Compact the PIN gate header; clarify creation/confirmation steps and automatic six-digit submission. Keep the numeric keypad, existing cryptographic functions, lockouts, migration and encrypted restore flow.
- Improve typography, keypad boundaries, short-screen key sizing and busy/error/countdown surfaces. Keep the backup file input keyboard reachable and avoid repeated unchanged digit-progress announcements.
- Add a localized four-step progress list and readable introduction cards, body-metric range help and semantic macro summaries.
- Replace objective/activity buttons claiming radio roles with native grouped radios and state-based whole-card styling.
- Add a focusable, linked validation summary alongside existing inline errors. Retain focus during edits and unchanged feedback; clear validation bookkeeping on lock.
- Preserve goal models, calorie/macro/hydration calculations, validation limits and encrypted save/retry behavior.

## Part 4 details

- Extract themed dashboard card helpers and scoped styles; render visible widgets in saved DOM order, with a useful all-hidden state.
- Clarify daily energy, its food-progress ring and net-balance formula. Keep complete formatted numbers and responsive statistic layouts.
- Present macros in readable rows with real targets, accessible progress descriptions and explicit unknown/partial-data states. Reuse existing Mini Cut and refeed calculations.
- Show hydration against the exact saved ml target, with labeled 48px controls and selected-date persistence. Remove the hardcoded 12-glass cap that blocked recording above 3,000 ml; keep the same 250 ml increments and storage format.
- Make the local coach's demo status clear and improve long meal rows, empty states, delete labels and focus recovery.
- Improve Customize Home touch targets, order/visibility feedback and stable control IDs using the existing centered dialog lifecycle.
- Recover focus when a move control becomes disabled at a list boundary or the water-minus control reaches zero.

## Part 5 details

- Extract shared food-entry headers, themed styles and Diary sections. Keep effective refeed calories, the Mini Cut fat ceiling, exact hydration targets and unknown/partial nutrition visible.
- Give the week strip labeled 48px controls and preserve its horizontal scroll during same-date updates without scrolling the page vertically.
- Group meals by meal type. Use native detail buttons with separate Delete/Add Again controls, wrapping labels, honest AI/demo badges and focus recovery after deletion.
- Show nutrient-data coverage and expand beyond the first six micronutrients using a native disclosure. Explain AI estimates and missing values without implying verification.
- Improve food-search labels, collection pressed states, recent-food buttons and explicit online-search disclosure while retaining Open Food Facts provenance and attribution.
- Rebuild Quick Log with readable fields, native meal radios/date/time controls, linked validation and opt-in same-route draft preservation. Clear the rendered form on navigation/lock; block interaction during saving or locking.
- Preserve unknown macros as null and retain input precision. Normalize portions within their measurement dimension, keep nutrition tied to the entire entered portion and open Diary on the logged date.
- Let Quick Log save a food definition without opening an extra Set Portion dialog. Existing Custom Food callers retain their normal portion flow.
- Apply shared readable fields and 48px controls to Set Portion, Meal Detail and Custom Food without replacing the dialog lifecycle. Add accessible portion choices and conversion-error feedback.

## Part 6 details

- Align Scanner and Food Review with the shared food-entry header, themed cards, 16px fields and 48px controls. Explain consent/backend availability and retain explicit photo-processing notices and manual entry.
- Add readable icon/text statuses and a whole-queue stage meter alongside individual photo progress. Show ready/choice/error counts and clarify that handled failures/skips count toward workflow progress.
- Keep uncertainty choices, dish clues, named retries, manual fallback and duplicate-skip actions within each photo card. Give actions stable IDs and recover focus after queue actions.
- Convert review into a native form with required-field help, inline errors and a focusable linked summary. Keep the existing service validation, unknown macros, cooking-fat difference calculations and one-meal confirmation flow.
- Preserve each photo's in-memory draft while switching results. Treat the selected review ID and scanner mode as route identity for heading focus and scroll behavior.
- Measure the activity pill's actual height for header clearance; use readable percentages and stable open/stop focus during updates. Disconnect its observer and clear measurements on disposal/lock.
- Improve the existing nutrient dialog with a visible search label, wrapping pressed-state category buttons, 48px controls and readable per-nutrient data. Preserve AI confidence, estimates, unknown values, daily references and the existing dialog lifecycle.
- Update EN/TH copy and design references. Backend requests, credentials, nutrient schemas and persistent data models retain their existing contracts.
