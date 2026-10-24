# NutriAI UI/UX improvement series

Ten incremental pull requests, requested on 2026-10-24. Each part is reviewed before the next begins. The sequence numbers below are rollout parts, not GitHub PR numbers.

## Design basis

Use `design.md` as the app reference, with UI UX Pro Max for focused guidance. NutriAI is a TypeScript/Vite mobile web app with Tailwind **3**, a 430px app column, bundled Inter / Plus Jakarta Sans, Material Symbols, Thai/English localization and green light/dark themes. Adapt newer Tailwind examples to the installed version.

Apply each change to existing components and data flows. Keep the vault origin and encrypted persistence, nutrition calculations, AI review workflow, exercise attribution and current Insights structure while improving their presentation.

## Sequence

| Part | Area | Reviewable scope | Status |
| --- | --- | --- | --- |
| 1/10 | Shared design foundations | Central semantic theme tokens; consistent primary actions, icon controls and fields; initial adoption in vault/onboarding/Quick Add | Prepared for review |
| 2/10 | App shell and navigation | Shared header, bottom navigation, readable labels, touch targets and clearance for fixed controls | Planned |
| 3/10 | PIN and onboarding | Lock-screen hierarchy, introduction and setup cards, progress, field help and inline feedback | Planned |
| 4/10 | Home dashboard | Daily energy, macros, hydration and widget hierarchy; readable values on narrow phones | Planned |
| 5/10 | Diary and manual logging | Meal sections, food search, portions, Quick Log and empty/save states | Planned |
| 6/10 | AI food scanning | Multi-photo queue, uncertainty choices, nutrient review, progress and in-app activity pill | Planned |
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

## Review record

Record the PR link and build result for each part as it becomes available. Browser/device review remains separate from compilation; do not describe a build as visual verification. Automated tests are run only when requested by the user.

Part 1: `npm run build` passed (TypeScript + Vite); `git diff --check` passed. The existing Vite chunk-size warning remains. No automated tests or browser/device checks were run. Publication to `main` is pending review.
