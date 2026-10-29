import { labelSearchTerms } from '../i18n/index.ts';
import type { FoodDefinition } from '../types/index.ts';

/** Keep Thai marks intact while making case, punctuation and Latin accents forgiving. */
function normalizeSearchText(value: string): string {
  return value.normalize('NFKD')
    .replace(/(\p{Script=Latin})\p{M}+/gu, '$1')
    .replace(/[๐-๙]/g, digit => String(digit.charCodeAt(0) - '๐'.charCodeAt(0)))
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function searchableLabels(food: FoodDefinition, value: string | undefined): readonly string[] {
  if (!value) return [];
  // Only app-owned catalog labels should be translated. User and provider
  // content can happen to match a translation key but must remain untouched.
  return food.source === 'built_in' || food.source === 'demo'
    ? [value, ...labelSearchTerms(value)] : [value];
}

/** Search the supplied collection and keep stronger name/barcode matches first. */
export function searchFoodDefinitions(foods: FoodDefinition[], query: string): FoodDefinition[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return query.trim() ? [] : foods;

  const terms = normalizedQuery.split(' ');
  const compactDigits = /^\d[\d ]*$/.test(normalizedQuery) ? normalizedQuery.replace(/ /g, '') : '';

  return foods.flatMap((food, index) => {
    const barcode = food.barcode ? normalizeSearchText(food.barcode).replace(/ /g, '') : '';
    const names = [...searchableLabels(food, food.name), ...(food.searchAliases ?? [])]
      .map(normalizeSearchText).filter(Boolean);
    const secondary = [
      ...searchableLabels(food, food.brand),
      ...searchableLabels(food, food.category),
      food.barcode ?? '',
      barcode
    ].map(normalizeSearchText).filter(Boolean);
    const fields = [...names, ...secondary];
    if (!terms.every(term => fields.some(field => field.includes(term)))) return [];

    let score = 100;
    if (compactDigits && barcode === compactDigits) score = 1_000;
    else if (names.some(name => name === normalizedQuery)) score = 900;
    else if (names.some(name => name.startsWith(normalizedQuery))) score = 800;
    else if (names.some(name => name.includes(normalizedQuery))) score = 700;
    else if (terms.every(term => names.some(name => name.includes(term)))) score = 600;
    else if (secondary.some(field => field === normalizedQuery)) score = 400;
    else if (secondary.some(field => field.startsWith(normalizedQuery))) score = 300;
    else if (secondary.some(field => field.includes(normalizedQuery))) score = 200;

    return [{ food, score, index }];
  }).sort((a, b) => b.score - a.score || a.index - b.index).map(match => match.food);
}
