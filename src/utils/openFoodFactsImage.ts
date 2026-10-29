/** Accept only product thumbnails on Open Food Facts image hosts for this barcode. */
export function safeOpenFoodFactsImageUrl(value: unknown, barcode: string): string | undefined {
  if (typeof value !== 'string' || value.length > 500 || !/^(?:\d{8}|\d{12,14})$/.test(barcode)) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash
      || !['images.openfoodfacts.org', 'static.openfoodfacts.org'].includes(url.hostname)) return undefined;
    const match = /^\/images\/products\/((?:\d{3}\/){3}\d{3,5}|\d{8,14})\/(?:front(?:_[a-z]{2})?\.\d+\.(?:100|200|400)|\d+\.(?:100|200|400))\.(?:jpg|jpeg|png|webp)$/i.exec(url.pathname);
    if (!match) return undefined;
    const normalized = (digits: string) => digits.replace(/\//g, '').replace(/^0+(?=\d)/, '');
    return normalized(match[1]) === normalized(barcode) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
