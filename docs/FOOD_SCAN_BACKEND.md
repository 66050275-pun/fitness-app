# Food photo analysis and Hidden Fat integration

Scope: `66050275-pun/fitness-app`. The client flow is implemented. Backend deployment, authentication, provider selection and API credentials remain pending the owner's instructions. No endpoint is configured and the default build sends no food photos over the network.

## Client flow

1. Take or choose a JPEG/PNG/WebP photo using the platform picker. The camera option is a browser/native picker hint, rather than a fabricated camera feed.
2. Locally decode, resize to at most 1,600px per side and re-encode as JPEG. Reject input files over 12 MiB, unreasonable decoded dimensions and prepared payloads over 4 MiB. Re-encoding removes original EXIF metadata and the original filename; visible content in the photo remains visible.
3. After a backend is configured, show its label and EN/TH photo-processing notice. Require explicit confirmation before sending that photo. Replacing a photo resets consent. Changing the backend registration requires fresh consent.
4. Invoke the registered transport with the prepared Blob, selected language and AbortSignal. The frontend aborts on cancel, leaving the flow or vault lock, ignores late responses and times out after 45 seconds. A backend must honor cancellation where practical and enforce its own limits.
5. Validate the returned JSON and open a review of the entire portion. Missing nutrition/confidence stays `null`; no confidence, ingredients, glycemic index or micronutrients are invented.
6. Confirm one reviewed meal in the actual local day's diary. Scan IDs prevent duplicate confirmation, and a rejected persistence queue restores the pending draft. Accepted queue writes use the existing vault status/retry controls rather than re-logging.

Manual nutrition entry is available before backend setup and after analysis errors. It uses the same review/accounting flow and is labeled manual. Blank macro values remain unknown; calories, a name and a portion description are required to save.

## Transport registration

`src/services/foodAnalysisBackend.ts` exports `registerFoodAnalysisBackend` and these contracts:

```ts
interface FoodAnalysisRequest {
  photo: Blob;
  language: 'en' | 'th';
  signal: AbortSignal;
}

interface FoodAnalysisBackend {
  label: string;
  photoProcessingNotice: { en: string; th: string };
  analyze(request: FoodAnalysisRequest): Promise<unknown>;
}
```

Register the transport from trusted application initialization before the scan UI renders. Its implementation will call the agreed NutriAI backend with the agreed authentication and payload format. Provider credentials belong on the server. The client has no provider API-key field, arbitrary endpoint input or automatic upload.

Before connecting it, agree the backend URL, authentication, upload format, provider/model, photo retention and processing notice, quota/rate limits and server-side request/response validation. The current Streamlit Python host builds/embeds static assets; this change does not introduce a recognition server there.

## Backend response

Use the `FoodAnalysisResult` interface in `src/types/index.ts`. Nutrition is for the entire returned portion. Numbers must be finite/non-negative; use `null` for unknown values. Nutrition bounds are 20,000 kcal, 2,000g per macro and 10,000g serving weight. Confidence is 0–1. The transport receives the desired language so names, notes and assumptions can match the UI.

Example response, for explaining the contract:

```json
{
  "foodName": "Pork basil rice with fried egg",
  "servingDescription": "1 plate, approximately 350 g",
  "servingWeightGrams": 350,
  "calories": 612,
  "protein": 30,
  "carbs": 60,
  "fat": 28,
  "ingredients": ["Rice", "Pork", "Egg", "Basil"],
  "overallConfidence": 0.78,
  "warnings": ["Oil quantity and portion size are approximate."],
  "cookingFat": {
    "estimatedGrams": 10,
    "rangeMinGrams": 6,
    "rangeMaxGrams": 14,
    "confidence": 0.55,
    "sources": ["Cooking oil"],
    "assumptions": ["Cooking oil is included in the 28 g total fat."]
  }
}
```

`cookingFat` and `micronutrients` are optional. A known cooking-fat estimate requires a known total fat and cannot exceed it. Ranges must be ordered and contain the estimate. Micronutrients use the existing `MicronutrientProfile` units; only supplied values appear, with AI attribution.

Ask the provider to estimate likely cooking method/oil/coconut/dressing contributions, describe assumptions and uncertainty, and **include them in total fat and total energy**. A photo supplies estimates rather than a measurement of oil used; an unknown contribution must remain unknown.

## Accounting and persistence

- Cooking fat is a subset of `fat`, not a second food log. In the example, saving unchanged logs **28 g fat once**, including the **10 g** cooking estimate.
- Special Program users can change a known included estimate. Changing **10 → 13 g** changes total fat **28 → 31 g** and calories **612 → 639 kcal**. Repeating the same choice adds nothing. Other food macros remain unchanged.
- When no included amount is known, the user's first included amount identifies part of the existing total. It cannot silently increase the total. Further changes to a known amount use the difference rule. Clearing an included amount removes its classification while retaining current nutrition totals.
- The portion description is editable, with explicit instructions to update totals if the portion changes. Micronutrients retain their original analysis basis and are not automatically rescaled.
- Schema 9 adds optional `MealItem.scanAnalysis`: scan ID, source, original nutrition/portion/cooking-fat estimates, confidence/warnings, reviewed included cooking grams and edited fields. The meal snapshot stores reviewed nutrition; legacy aggregate zeros are only a display/aggregation fallback for unknown values.
- Photo bytes/object URLs, consent, transport state and unfinished review strings are ephemeral. They are not included in encrypted snapshots/backups. Navigation away and vault lock release them; processing already accepted by a future server is subject to its agreed retention/cancellation policy.
- Fat Gauge, Protein Radar and diary totals read the ordinary meal snapshot. The optional standalone extra-fat calculator remains for fat genuinely missing from another logged meal, with a visible instruction to avoid applying it to already-reviewed scan totals.

## Code map

- `foodAnalysisBackend.ts`: trusted transport registration; no default request.
- `aiFoodAnalysisAdapter.ts`: runtime response validation and conversion.
- `foodPhotoService.ts`: local image preparation.
- `foodScanService.ts`: review validation, delta accounting and metadata sanitization.
- `screens/foodScanController.ts`: picker, consent, cancellation, draft edits, confirmation and privacy lifecycle.
- `ScannerScreen.ts` / `FoodResultScreen.ts`: themed EN/TH UI.
- `HiddenFatScanner.ts` / `MealDetailModal.ts`: scan entry, today's results and saved analysis history.
- `appState.ts` / `storagePersistence.ts`: one-entry diary persistence and schema migration.
