import { defineConfig } from "vite";

export default defineConfig({
  // Keep built asset URLs relative so the app also works inside Streamlit's component iframe.
  base: "./",
});
