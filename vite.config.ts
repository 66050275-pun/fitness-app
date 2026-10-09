import { defineConfig } from "vite";

export default defineConfig({
  // Keep built asset URLs relative so the app also works inside Streamlit's component iframe.
  base: "./",
  build: { assetsInlineLimit: 2 * 1024 * 1024 },
  plugins: [{
    name: 'private-preview-policy',
    apply: 'build',
    transformIndexHtml(html) {
      // Inline handlers are retained by this prototype; all dynamic arguments are encoded.
      const policy = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; worker-src 'none'";
      return html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`);
    },
  }],
});
