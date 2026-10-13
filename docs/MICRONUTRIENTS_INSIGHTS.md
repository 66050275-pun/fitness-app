# Detailed nutrients and existing Insights integration

Reference date: 2026-10-13 (Asia/Bangkok).

## Full food-scan contract

One Maxplus vision request identifies the meal; six small text-only requests together request **all 40 existing app nutrients**: 13 vitamins plus choline in the vitamin section, 15 minerals, and 11 other nutrients/lipids. Calories, protein, carbohydrates and total fat are separate primary fields, so a scan reviews **44 nutrition fields** in total.

`src/data/foodAnalysisNutrients.json` is the shared AI contract for Python and TypeScript. It mirrors every key, category and canonical unit in `nutrientReferenceValues.ts`; the regression check detects drift. The backend requests every row across six batches, then validates, merges and fills any omitted row with `amount: null` and `confidence: null`. No numeric nutrient values are manufactured by completion.

Each supplied nutrient has `key`, `name`, `amount`, `unit`, `confidence`, `source: ai_estimate` and a short `note` (up to 160 characters for batch output) describing the estimate's basis or reason for an unknown value. All amounts refer to the whole original pictured portion. The prompt asks for ingredient quantities, preparation/cooking-loss assumptions and uncertainty about fortification, sauces and oil. Estimates use the model's food-composition knowledge, without claiming a live database lookup or a laboratory measurement. Every row is requested, but numeric completeness or accuracy cannot be guaranteed from a photo.

Plain mass units can be normalized (g/mg/mcg). Nutrient-specific RAE/DFE/NE/alpha-TE equivalents require the correct unit; arbitrary IU conversion is rejected. Duplicate keys, incorrect categories, non-finite/negative values and unrecognized nutrient keys are rejected. Daily-value percentages are calculated by the app's existing reference rules, not supplied by the model.

| Category | Key | Nutrient | Canonical unit |
| --- | --- | --- | --- |
| vitamins | `vitamin_a` | Vitamin A | `mcg_RAE` |
| vitamins | `vitamin_c` | Vitamin C | `mg` |
| vitamins | `vitamin_d` | Vitamin D | `mcg` |
| vitamins | `vitamin_e` | Vitamin E | `mg_alpha_TE` |
| vitamins | `vitamin_k` | Vitamin K | `mcg` |
| vitamins | `vitamin_b1` | Vitamin B1 (Thiamin) | `mg` |
| vitamins | `vitamin_b2` | Vitamin B2 (Riboflavin) | `mg` |
| vitamins | `vitamin_b3` | Vitamin B3 (Niacin) | `mg_NE` |
| vitamins | `vitamin_b5` | Vitamin B5 (Pantothenic Acid) | `mg` |
| vitamins | `vitamin_b6` | Vitamin B6 (Pyridoxine) | `mg` |
| vitamins | `vitamin_b7` | Vitamin B7 (Biotin) | `mcg` |
| vitamins | `vitamin_b9` | Vitamin B9 (Folate) | `mcg_DFE` |
| vitamins | `vitamin_b12` | Vitamin B12 (Cobalamin) | `mcg` |
| vitamins | `choline` | Choline | `mg` |
| minerals | `calcium` | Calcium | `mg` |
| minerals | `iron` | Iron | `mg` |
| minerals | `magnesium` | Magnesium | `mg` |
| minerals | `phosphorus` | Phosphorus | `mg` |
| minerals | `potassium` | Potassium | `mg` |
| minerals | `sodium` | Sodium | `mg` |
| minerals | `zinc` | Zinc | `mg` |
| minerals | `copper` | Copper | `mg` |
| minerals | `manganese` | Manganese | `mg` |
| minerals | `selenium` | Selenium | `mcg` |
| minerals | `iodine` | Iodine | `mcg` |
| minerals | `chromium` | Chromium | `mcg` |
| minerals | `molybdenum` | Molybdenum | `mcg` |
| minerals | `chloride` | Chloride | `mg` |
| minerals | `fluoride` | Fluoride | `mg` |
| otherNutrients | `fiber` | Dietary Fiber | `g` |
| otherNutrients | `total_sugars` | Total Sugars | `g` |
| otherNutrients | `added_sugars` | Added Sugars | `g` |
| otherNutrients | `cholesterol` | Cholesterol | `mg` |
| otherNutrients | `saturated_fat` | Saturated Fat | `g` |
| otherNutrients | `trans_fat` | Trans Fat | `g` |
| otherNutrients | `monounsaturated_fat` | Monounsaturated Fat | `g` |
| otherNutrients | `polyunsaturated_fat` | Polyunsaturated Fat | `g` |
| otherNutrients | `omega_3` | Omega-3 Fatty Acids | `g` |
| otherNutrients | `omega_6` | Omega-6 Fatty Acids | `g` |
| otherNutrients | `caffeine` | Caffeine | `mg` |

## Recording and display

- Food Result shows the count of known nutrient estimates out of 40 and opens the existing View All Nutrients dialog. The dialog displays known amounts, calculated daily values, per-nutrient confidence and estimation notes. Unknown rows remain accessible in its existing unavailable section.
- Confirming a scan saves the profile in the same encrypted portion snapshot and diary entry as calories/macros. Provider/model attribution and cooking-fat review history remain attached to that meal. Photos and unfinished drafts remain transient.
- Editing a portion description or cooking-fat classification does not invent new vitamin/mineral quantities. The existing original-portion notice remains visible; detailed nutrients keep their original analysis basis.
- Diary and Insights read the same snapshot, including source/notes. Real zero values count as reported data; all-null profiles do not increase coverage. Demo values are excluded from real Insights.
- Insights displays every supported nutrient using the existing category filters/cards. Numeric averages can be shown even before the three-meal assessment threshold; the assessment remains Insufficient Data. A nutrient's daily average uses only dates with a recorded value, with recorded-day and meal-coverage counts. Unreported dates do not become zero intake.

## Existing Analytics / Insights

The existing overview, calorie/macro charts, fitness trends, consistency metrics, nutrient cards and Activity & Nutrition Analysis section are retained. No new analytics page, route, analytics store or data export is introduced.

- Every confirmed food source feeds the ordinary diary totals: catalog/database, quick log, custom food, AI scan and the explicitly logged manual cooking-fat additions. Unconfirmed AI results and unsaved plans do not affect charts.
- Nutrition totals use portion snapshots. Decimal macros remain intact; explicit unknowns cannot become legacy zeros. The chart explains incomplete entries and shows known recorded totals.
- Protein adherence and chart legends use the saved target rather than 145 g. Water adherence compares the exact saved milliliter target with recorded 250 ml glasses.
- Calorie bars/inspection and adherence use `getEffectiveNutritionGoals(date)`, including scheduled Mini Cut refeed calories/carbs. The Mini Cut fat ceiling matches Fat Gauge and Diary: lower of the saved fat target and 0.6 g/kg of current saved weight.
- Refeed allowances are goals, never calories consumed. Included cooking fat is a subset of the scanned meal's total; it is never added again. A 10 → 13 g included-fat edit changes total fat 28 → 31 g and calories 612 → 639 kcal. A separately logged 10 g missing-oil estimate contributes another 90 kcal, giving 729 kcal and 41 g fat across the two entries.
- Goal comparisons use the **current** saved profile/program/weight and current cycle dates, matching Diary. The app does not have historical goal snapshots; changing or stopping a cycle can therefore change historical target comparisons, while logged food values stay intact.

The existing analysis section gains six program summaries for saved Mini Cut / Lean Bulk goals:

| Tool | Data used in Insights |
| --- | --- |
| Hidden Fat Scanner | Reviewed scans, included cooking-fat totals/unknown counts, tagged manual extras; intake counted once |
| Protein Splitter | Saved daily target and 4/5-interval allocation; clearly a plan rather than consumed food |
| Protein Radar | Logged meal groups across the selected range, below-30-g benchmark and incomplete-protein counts |
| Fat Gauge | Current ceiling, complete/incomplete logged days and known overages across the selected range |
| Phase & Cycle | Current cycle state/day/week and scheduled refeed dates in the selected range |
| Recomp Matrix | Same latest-seven vs previous-seven comparison as the tool, with missing-data rules and comparable estimated strength |

Each summary opens its existing tool dialog; each tool can dismiss to Insights through the existing modal transition lifecycle. Saving/deleting diary entries, changing targets or cycle preferences uses normal store notifications and updates these calculations. Standard goals keep the tools locked. All new app-owned labels support EN and TH; provider text uses the language requested at analysis time.

## Prior verification and current limits

Before this batching change, offline checks covered the full 40-key/unit/category inventory; partial response completion; null vs real zero; duplicate/unit rejection; confidence/notes serialization; snapshot/coverage averaging; saved protein/refeed/water adherence; cooking-fat delta accounting; and six tool summaries in EN/TH. The Python check mocks the provider transport and confirms every nutrient key/unit is requested. Run the scoped checks with:

```bash
node tests/food-analysis-insights.test.ts
python -m unittest discover -s tests -p test_food_analysis.py -v
npm run build
```

Before this batching change, a scoped Chromium check also passed using a fresh synthetic vault: 40 nutrient rows, confidence/notes, confirmation into the diary and existing Insights, all six tool dialogs and return links, refeed-day inspection, visible macro bars, and no horizontal overflow at 320/390px in EN/TH and light/dark themes. This exercised the local client; it did not exercise the live Streamlit transport.

No paid Maxplus request, real food photo or production vault data is used by these checks. Live vision output and the deployed Streamlit bridge still require owner Secrets, an image-capable model and a real scan. The batched workflow uses a 2,500-token primary image reply plus up to six 1,400-token text replies. The daily limit still counts logical scans, so a full scan may make seven provider calls. The whole workflow is bounded to 210 seconds inside a 240-second client deadline. See [batch behavior, partial results and percentage progress](FOOD_SCAN_BACKEND.md#batched-analysis-and-percentage-progress).
