import { trHtml } from '../../i18n/index.ts';
import type { FoodDefinition } from '../../types/index.ts';
import { escapeHtml } from '../../utils/sanitize.ts';

function safeProductUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const hosts = ['world.openfoodfacts.org', 'th.openfoodfacts.org', 'en.openfoodfacts.org', 'openfoodfacts.org'];
    if (url.protocol !== 'https:' || url.username || url.password || !hosts.includes(url.hostname) || !url.pathname.startsWith('/product/')) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

/** Keep recipe estimates distinct from nutrition sourced from a product database. */
export function renderFoodSourceNote(food: FoodDefinition, compact = false): string {
  const provenance = food.dataProvenance;
  if (!provenance) return '';

  if (provenance.provider === 'user_estimate') {
    return `
      <div class="min-w-0 text-[10px] leading-relaxed text-on-surface-variant dark:text-gray-400">
        <span class="font-semibold">${trHtml('Estimated recipe nutrition')}</span>
        ${compact ? '' : `<p class="mt-0.5">${trHtml('Actual nutrition varies with the recipe and portion.')}</p>`}
      </div>
    `;
  }

  if (provenance.provider !== 'open_food_facts') return '';
  const productUrl = safeProductUrl(provenance.url);
  return `
    <div class="min-w-0 text-[10px] leading-relaxed text-on-surface-variant dark:text-gray-400">
      <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        ${productUrl
          ? `<a href="${escapeHtml(productUrl)}" target="_blank" rel="noopener noreferrer" class="font-semibold text-primary dark:text-primary-container underline underline-offset-2">Open Food Facts</a>`
          : '<span class="font-semibold">Open Food Facts</span>'}
        <span aria-hidden="true">·</span>
        <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener noreferrer" class="text-primary dark:text-primary-container underline underline-offset-2">ODbL</a>
      </div>
      ${provenance.modifiedLocally ? `<p class="mt-0.5 font-semibold">${trHtml('Edited locally from Open Food Facts.')}</p>` : ''}
      ${compact ? '' : `<p class="mt-0.5">${trHtml('Community-provided nutrition; check the product label.')}</p>`}
    </div>
  `;
}
