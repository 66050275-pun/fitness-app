export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** JSON encodes the JavaScript value; HTML escaping protects the attribute boundary. */
export function htmlJsArg(value: unknown): string { return escapeHtml(JSON.stringify(value ?? '')); }
