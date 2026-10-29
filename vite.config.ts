import { defineConfig } from "vite";

export default defineConfig({
  // Keep built asset URLs relative so the app also works inside Streamlit's component iframe.
  base: "./",
  build: { assetsInlineLimit: 2 * 1024 * 1024 },
  experimental: {
    renderBuiltUrl(filename, context) {
      // The Streamlit host embeds this JS inline: import.meta.url is about:srcdoc.
      // Keep PNG URLs as path strings so exerciseImageUrl can choose the app's local asset route.
      if (context.hostType === 'js' && filename.endsWith('.png'))
        return { runtime: JSON.stringify(`./${filename}`) };
    },
  },
  plugins: [{
    name: 'private-preview-policy',
    apply: 'build',
    transformIndexHtml(html) {
      // Inline handlers are retained by this prototype; all dynamic arguments are encoded.
      // Provider product images load only on the explicit online search results.
      const policy = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.openfoodfacts.org/images/products/ https://static.openfoodfacts.org/images/products/; font-src data:; connect-src https://world.openfoodfacts.org/cgi/search.pl; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; worker-src 'none'";
      return html.replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="${policy}">`);
    },
  }],
});
