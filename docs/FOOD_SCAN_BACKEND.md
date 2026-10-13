# Food photo analysis and Hidden Fat integration

Scope: `66050275-pun/fitness-app`. Maxplus server integration is implemented following `66050275-pun/subject-ai` at commit `96f83e50c93887cb9075bf28ae1077ef49893b58` (read-only reference). The owner selected **Streamlit Secrets** credentials, rather than browser API-key entry. Actual provider credentials/model access and live vision compatibility must be configured/confirmed by the owner. Without complete server configuration the scanner remains available for manual entry and sends no food photos to Maxplus.

## Enable Maxplus on Streamlit

In **fitness-app's** Streamlit Cloud app, open **Settings → Secrets** and set:

```toml
MAXPLUS_API_KEY = "your-actual-maxplus-key"
MAXPLUS_MODEL = "an-actual-image-capable-model-id"
MAXPLUS_BASE_URL = "https://api.maxplus-ai.cc/v1"
MAXPLUS_DAILY_SCAN_LIMIT = 20
```

Use the exact model ID from your Maxplus account. It must accept OpenAI-style image input (`image_url`); listing a model alone does not prove vision support or quota. No default model, automatic model selection or automatic paid retry is assumed. Subject AI's source likewise states that live Maxplus compatibility was unverified. Keys entered in its browser are not stored in that repository and cannot be imported from it.

The complete template is `.streamlit/secrets.toml.example`. For local Streamlit, use the ignored `.streamlit/secrets.toml` or matching server environment variables. Never use a `VITE_*` key or commit real credentials. Refresh the app after saving Secrets; reboot it if Streamlit has not loaded the new settings.

Optional protections and notices:

- `MAXPLUS_ACCESS_CODE`: a separate service code of 16–256 characters. If set, callers enter it in the scan screen before analysis. It is not the vault PIN, is not written to local storage and clears on vault lock/page close. The server checks it with a constant-time comparison.
- `MAXPLUS_DAILY_SCAN_LIMIT`: 1–1,000 scan attempts per **Asia/Bangkok** calendar day, default 20, shared by this server process. It includes rejected photos after admission, can reset on a process restart, and is not a provider billing guarantee. Configure spending limits in Maxplus too.
- Each browser session permits one in-flight request, at least five seconds between attempts, and at most ten attempts/hour. The owner budget also bounds four active requests across sessions.
- `MAXPLUS_PHOTO_NOTICE_EN` and `MAXPLUS_PHOTO_NOTICE_TH`: optional accurate processing/retention notices; supply both together. Default copy explains NutriAI → Maxplus → model-service processing without promising a provider retention policy.

## Maxplus API method taken from Subject AI

- Official default base: `https://api.maxplus-ai.cc/v1`, with owner-configured paths limited to that HTTPS host. Credentials, ports, queries, fragments, arbitrary hosts and redirects are rejected.
- Bearer authentication is added only by Python on the server.
- `GET {base}/models` reads `data[].id` via the server-side `list_models` helper; it is not called automatically on page load and generates no model answer.
- `POST {base}/chat/completions` uses `model`, `messages` and `max_tokens`. The food request includes a text instruction and a locally/server re-encoded JPEG as an OpenAI-style `image_url` data URL.
- Structured output is requested in the prompt, with no required `response_format` parameter. Parse `choices[0].message.content` (text or text blocks), then validate the food schema with strict Pydantic models before returning it. Unknown nutrition remains null, cooking fat must be included in total fat, and truncation/invalid JSON is an error.
- Bound upstream responses and use a 60-second server read timeout within the client's 75-second deadline. Map authentication, billing, quota, model/image support, timeout and response errors to safe EN/TH messages; never echo provider bodies, keys or photos.

## Streamlit transport

`streamlit_component/index.html` is a small, invisible handshaking component based on Subject AI's session bridge pattern. It runs alongside the existing `st.iframe`, forwarding only the typed food-analysis RPC. The application stays in its original srcdoc iframe and original storage origin, with its existing scrolling/viewport behavior; catalog fetches keep their existing CSP destination.

The Python `BrowserSession` is held in `st.session_state`, with request-ID deduplication, frame binding, acknowledgement, per-session events and cancellation. No separate Uvicorn port, public proxy endpoint, global photo/result cache or frontend provider key is introduced. The RPC fragment reruns/polls independently of the app iframe and discards acknowledged upload payloads in the bridge. Server jobs release their payloads/results after completion/acknowledgement; remaining session/widget memory is subject to Streamlit's session lifetime.

The backend is registered in the client only when the public configuration is ready. Public config includes provider/model, processing notice and service-code requirement; never the API key or service code. Changing its version resets client consent. Plain `npm run dev` has no Streamlit parent and retains manual entry; use `python -m streamlit run streamlit_app.py` for the connected server flow.

## Client flow

1. Take or choose a JPEG/PNG/WebP photo using the platform picker. The camera option is a browser/native picker hint, rather than a fabricated camera feed.
2. Locally decode, resize to at most 1,600px per side and re-encode as JPEG. Reject input files over 12 MiB, unreasonable decoded dimensions and prepared payloads over 4 MiB. Re-encoding removes original EXIF metadata and the original filename; visible content in the photo remains visible.
3. After a backend is configured, show its label and EN/TH photo-processing notice. Require explicit confirmation before sending that photo. Replacing a photo resets consent. Changing the backend registration requires fresh consent.
4. Invoke the registered transport with the prepared Blob, selected language and AbortSignal. The frontend aborts on cancel, leaving the flow or vault lock, ignores late responses and times out after 75 seconds. A backend must honor cancellation where practical and enforce its own limits.
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

The built-in registration is now `initializeStreamlitFoodAnalysis` in `src/services/streamlitFoodAnalysis.ts`. It uses a session-scoped Streamlit RPC to Python; the provider URL and credentials never become browser request destinations or headers. Other future trusted transports can still use the same registration contract.

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

`cookingFat` remains optional. The prompt requests `micronutrients` with all 40 app-supported nutrient rows; omitted rows are completed as unknown (`null`), never zero. A known cooking-fat estimate requires a known total fat and cannot exceed it. Ranges must be ordered and contain the estimate. Micronutrients use the existing `MicronutrientProfile` units; known values appear with AI attribution, confidence and a brief estimation note; unknown rows remain available without numeric estimates. See [the complete inventory and Insights integration](MICRONUTRIENTS_INSIGHTS.md).

Ask the provider to estimate likely cooking method/oil/coconut/dressing contributions, describe assumptions and uncertainty, and **include them in total fat and total energy**. A photo supplies estimates rather than a measurement of oil used; an unknown contribution must remain unknown.

## Accounting and persistence

- Cooking fat is a subset of `fat`, not a second food log. In the example, saving unchanged logs **28 g fat once**, including the **10 g** cooking estimate.
- Special Program users can change a known included estimate. Changing **10 → 13 g** changes total fat **28 → 31 g** and calories **612 → 639 kcal**. Repeating the same choice adds nothing. Other food macros remain unchanged.
- When no included amount is known, the user's first included amount identifies part of the existing total. It cannot silently increase the total. Further changes to a known amount use the difference rule. Clearing an included amount removes its classification while retaining current nutrition totals.
- The portion description is editable, with explicit instructions to update totals if the portion changes. Micronutrients retain their original analysis basis and are not automatically rescaled.
- Schema 9 adds optional `MealItem.scanAnalysis`: scan ID, source, original nutrition/portion/cooking-fat estimates, confidence/warnings, reviewed included cooking grams and edited fields. The meal snapshot stores reviewed nutrition; server-controlled provider/model provenance is preserved in optional metadata, and legacy aggregate zeros are only a display/aggregation fallback for unknown values.
- Photo bytes/object URLs, consent, transport state and unfinished review strings are ephemeral. They are not included in encrypted snapshots/backups. Navigation away and vault lock release them and cancel the bridge request. A server/provider request already accepted may still complete or be billed; Maxplus/model-service retention follows their policies.
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
- `streamlitFoodAnalysis.ts` / `streamlit_component/index.html`: client registration and typed session RPC.
- `backend/settings.py`: server-only key/model/settings plus public capability metadata.
- `backend/maxplus.py`: official-host model listing and vision chat-completion requests.
- `backend/food_analysis.py`: strict server response schema and included-fat validation.
- `backend/streamlit_transport.py`: session jobs, cancellation, deduplication and bounded owner request budget.
