import { getFoodArtwork } from '../../data/foodArtwork.ts';
import type { FoodDefinition } from '../../types/index.ts';
import { exerciseImageUrl } from '../../utils/exerciseImageUrl.ts';
import { safeOpenFoodFactsImageUrl } from '../../utils/openFoodFactsImage.ts';
import { escapeHtml } from '../../utils/sanitize.ts';

/** The adjacent food name provides the accessible label; thumbnails are decorative. */
export function renderFoodThumbnail(food?: FoodDefinition, allowOnlineImage = false): string {
  const local = food && (food.source === 'built_in' || food.source === 'demo') ? getFoodArtwork(food.id) : undefined;
  const remote = allowOnlineImage && food?.source === 'database' && food.dataProvenance?.provider === 'open_food_facts'
    ? safeOpenFoodFactsImageUrl(food.previewImageUrl, food.barcode ?? '') : undefined;
  const src = local ? exerciseImageUrl(local.src) : remote;
  const isSprite = local?.column !== undefined && local.row !== undefined;
  const spriteStyle = isSprite ? ` style="left:-${(local?.column ?? 0) * 100}%;top:-${(local?.row ?? 0) * 100}%"` : '';
  const image = src ? `<img class="food-thumbnail-image${isSprite ? ' food-thumbnail-sprite' : ''}${remote ? ' food-thumbnail-product' : ''}" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async"${remote ? ' crossorigin="anonymous" referrerpolicy="no-referrer"' : ''}${spriteStyle} onload="this.previousElementSibling.hidden=true" onerror="this.hidden=true">` : '';
  return `<span class="food-thumbnail" aria-hidden="true"><span class="food-thumbnail-fallback material-symbols-outlined">${escapeHtml(food?.icon || 'nutrition')}</span>${image}</span>`;
}
