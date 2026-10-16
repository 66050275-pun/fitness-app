/** Resolve Vite's local image assets inside the original Streamlit srcdoc iframe. */
export function exerciseImageUrl(path: string): string {
  if (path.startsWith('data:') || import.meta.env.DEV || window.parent === window) return path;
  const filename = /(?:^|\/)assets\/([A-Za-z0-9_-]+\.png)$/.exec(path)?.[1];
  if (!filename) return path;
  try {
    const frame = window.parent.document.querySelector<HTMLIFrameElement>('iframe[title*="nutriai_food_bridge"]');
    if (frame?.src) {
      const base = new URL(frame.src, window.parent.location.href);
      // Only the existing app-hosted component serves images; never a third-party image CDN.
      if (base.origin === window.parent.location.origin && ['https:', 'http:'].includes(base.protocol))
        return new URL(`exercise-assets/${filename}`, base).href;
    }
  } catch { /* Standalone and restricted embeds use their normal local asset path. */ }
  return path;
}
