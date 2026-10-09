# NutriAI mobile preview on Streamlit Community Cloud

This repository is a Vite and TypeScript web app with a Capacitor Android project. The Streamlit entry point wraps the built web app so it can be previewed in a phone browser; it does not turn the project into a native Streamlit app or an Android APK.

## Deploy

1. Push this repository to GitHub.
2. In Streamlit Community Cloud, create an app from `66050275-pun/fitness-app`, branch `main`, with `streamlit_app.py` as the main file.
3. Wait for the first build to finish, then open the generated `*.streamlit.app` URL on a phone.

Streamlit installs Node.js and npm from `packages.txt`. On the first app start, `streamlit_app.py` runs `npm ci` and `npm run build`; later reruns reuse the built files. The initial start can take longer while dependencies install.

The preview uses the same browser-based app and its local browser storage. Capacitor native features are not available in the Streamlit page. Food scanning and AI screens are currently preview flows; the scanner does not use a live camera or call a food-recognition backend.

## Run locally

```bash
npm ci
npm run build
python -m pip install -r requirements.txt
streamlit run streamlit_app.py
```

To run the regular Vite development server instead, use `npm run dev`.
