# NutriAI mobile preview on Streamlit Community Cloud

This repository is a Vite and TypeScript web app with a Capacitor Android project. The Streamlit entry point wraps the built web app so it can be previewed in a phone browser; it does not turn the project into a native Streamlit app or an Android APK.

## Deploy

1. Push this repository to GitHub.
2. In Streamlit Community Cloud, create an app from `66050275-pun/fitness-app`, branch `main`, with `streamlit_app.py` as the main file.
3. Wait for the first build to finish, then open the generated `*.streamlit.app` URL on a phone.

Streamlit installs Node.js and npm from `packages.txt`. On the first app start, `streamlit_app.py` runs `npm ci` and `npm run build`; later reruns reuse the built files. The initial start can take longer while dependencies install.

The preview uses the same browser-based app and its passphrase protected encrypted browser vault. Capacitor native features are not available in the Streamlit page. Food scanning and AI screens are currently preview flows; the scanner does not use a live camera or call a food-recognition backend.

## Run locally

```bash
npm ci
npm run build
python -m pip install -r requirements.txt
streamlit run streamlit_app.py
```

To run the regular Vite development server instead, use `npm run dev`.

## Personal data in the public test build

Before entering profile or health details, create a unique local passphrase of at least 12 characters. The frontend encrypts the profile, health logs, settings, feedback draft and photo with AES-256-GCM before saving them in IndexedDB. Neither the passphrase nor the encryption key is saved or sent to an app server. Existing NutriAI plaintext browser data is migrated before its old copies are removed.

Use the persistent **Lock** button on shared devices. The app also locks after five minutes without interaction and hides the screen while the page is backgrounded. Unsaved forms and active workout sessions are discarded when locked. Watch the save indicator: storage errors are shown, and the app will not claim it saved or completed a lock while changes are unsaved. Export an encrypted backup if saving fails.

There is **no password recovery or automatic device sync**. Export an encrypted backup from **Profile → Data & Privacy** before clearing browser storage, changing browsers, changing the deployment URL or moving phones. Restore on the first unlock screen of a browser without an existing vault, using the original passphrase. Do not use private browsing for records you want to keep.

A public repository contains code; it does not contain each visitor's browser data. Encryption protects stored data while locked, but cannot protect unlocked data from someone using the device, a malicious extension, a compromised device or a malicious future application update. Streamlit and network providers still process ordinary page requests and network metadata. The iframe's network restrictions do not control Streamlit's surrounding page.

See [the component and data-flow audit](docs/PRIVACY_AUDIT.md) for scope, storage, limitations and checks.

## Privacy checks

```bash
npm test
npm run test:privacy
```

The browser checks require Python with `requirements.txt` installed and Playwright Chromium (`npx playwright install chromium`). An existing Chromium executable can be selected with `FITNESS_CHROMIUM_PATH`. The browser script builds the app and creates an ignored fixture from the actual Streamlit iframe. All checks use synthetic data.

## Exercise illustrations

Fitness routine setup, the exercise catalog and the active workout screen include locally bundled illustrations from `@bryllim/workout-guide@1.0.0`. Artwork is CC BY-SA 4.0 by Bryl Lim, with Everkinetic credit where applicable. The code license is separate from the artwork license. Per-image upstream credits and exact source URLs are retained in [the attribution manifest](docs/exercise-art/ATTRIBUTION.json), with the original artwork license and attribution notice alongside it. Images are unchanged and do not make external image requests. The catalog's Dumbbell Incline Fly uses the dumbbell-fly reference, explicitly labelled as an incline-bench variation.

### Workout muscle overview

The setup screen shows an original, bundled front/back SVG schematic with 19 muscle groups. Red regions combine major movers and common assisting muscles from the current draft exercises, including catalog additions; removing an exercise recalculates the union. Expand the exercise list to see the mapping per movement. Unknown names are explicitly excluded rather than guessed. This educational schematic is not an intensity map, an exhaustive stabilizer list, or an individualized biomechanical assessment. Mapping lives in `src/data/exerciseMuscles.ts`; the original SVG lives in `src/components/Fitness/WorkoutMuscleMap.ts`. It needs no external service, image request, or personal information.
