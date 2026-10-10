import type { FoodDefinition, NutritionValues } from '../types/index.ts';
import { THAI_SINGLE_DISH_CATALOG } from '../data/thaiFoodCatalog.ts';

const OFF_ORIGIN = 'https://world.openfoodfacts.org';
const SEARCH_TIMEOUT_MS = 12_000;
const PRODUCT_FIELDS = [
  'code', 'product_name', 'product_name_en', 'product_name_th', 'brands',
  'nutriments', 'nutrition_data_per', 'product_quantity_unit',
  'serving_quantity_unit', 'countries_tags'
].join(',');

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject : null;
}

function plainText(value: unknown, maximumLength = 200): string {
  return typeof value === 'string'
    ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, maximumLength)
    : '';
}

function nutrient(value: unknown, maximum: number): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

function nutritionFromProduct(nutriments: JsonObject): NutritionValues {
  let calories = nutrient(nutriments['energy-kcal_100g'], 1_000);
  if (calories === null) {
    // OFF's normalized energy_100g is kJ, regardless of the original label unit.
    const kilojoules = nutrient(nutriments['energy-kj_100g'], 4_184)
      ?? nutrient(nutriments.energy_100g, 4_184);
    if (kilojoules !== null) calories = Math.round((kilojoules / 4.184) * 10) / 10;
  }
  const sodiumGrams = nutrient(nutriments.sodium_100g, 100);
  return {
    calories,
    protein: nutrient(nutriments.proteins_100g, 100),
    carbs: nutrient(nutriments.carbohydrates_100g, 100),
    fat: nutrient(nutriments.fat_100g, 100),
    fiber: nutrient(nutriments.fiber_100g, 100),
    sugar: nutrient(nutriments.sugars_100g, 100),
    sodium: sodiumGrams === null ? null : Math.round(sodiumGrams * 1_000 * 100) / 100,
    calorieSource: 'database'
  };
}

function productBasisUnit(product: JsonObject): 'g' | 'ml' {
  const declaredBasis = plainText(product.nutrition_data_per).toLowerCase().replace(/\s/g, '');
  if (declaredBasis === '100ml') return 'ml';
  if (declaredBasis === '100g') return 'g';
  // A recorded nutrition basis takes priority over the package's units. If
  // absent, use recorded units without guessing from a product name/category.
  const quantityUnit = plainText(product.product_quantity_unit).toLowerCase();
  if (quantityUnit === 'g' || quantityUnit === 'kg') return 'g';
  if (quantityUnit === 'ml' || quantityUnit === 'l') return 'ml';
  const servingUnit = plainText(product.serving_quantity_unit).toLowerCase();
  return servingUnit === 'ml' || servingUnit === 'l' ? 'ml' : 'g';
}

function foodFromProduct(raw: unknown, retrievedAt: string): FoodDefinition | null {
  const product = asObject(raw);
  if (!product) return null;
  const barcode = plainText(product.code);
  // GTIN formats only: never create random IDs for unidentified records.
  if (!/^(?:\d{8}|\d{12,14})$/.test(barcode)) return null;
  if (!Array.isArray(product.countries_tags) || !product.countries_tags.includes('en:thailand')) return null;
  const name = plainText(product.product_name_en)
    || plainText(product.product_name)
    || plainText(product.product_name_th);
  if (!name) return null;
  const searchAliases = [...new Set([
    plainText(product.product_name),
    plainText(product.product_name_th),
    plainText(product.product_name_en)
  ].filter(alias => alias && alias !== name))];
  const unit = productBasisUnit(product);
  const brand = plainText(product.brands, 160);
  return {
    id: `off_${barcode}`,
    name,
    ...(searchAliases.length ? { searchAliases } : {}),
    ...(brand ? { brand } : {}),
    barcode,
    category: 'Packaged Foods',
    source: 'database',
    calorieSource: 'database',
    dataProvenance: {
      provider: 'open_food_facts',
      url: `${OFF_ORIGIN}/product/${barcode}`,
      license: 'ODbL-1.0',
      retrievedAt
    },
    nutritionBasis: { amount: 100, unit },
    nutrition: nutritionFromProduct(asObject(product.nutriments) ?? {}),
    portionOptions: [{
      id: `100${unit}`,
      label: `100 ${unit}`,
      unit,
      dimension: unit === 'ml' ? 'volume' : 'mass',
      quantity: 100,
      equivalentBaseAmount: 100,
      equivalentBaseUnit: unit
    }],
    icon: unit === 'ml' ? 'water_drop' : 'nutrition',
    createdAt: retrievedAt,
    updatedAt: retrievedAt
  };
}

/**
 * Offline seeding and explicitly requested public product searches.
 * This service does not write IndexedDB, localStorage, or user profile data.
 * Saved remote foods must go through the app's existing encrypted vault.
 */
export class ThaiFoodService {
  public static async seedThaiFoods(
    saveFoodItem: (food: FoodDefinition) => Promise<void>,
    existingFoodIds: Set<string>
  ): Promise<number> {
    let importedCount = 0;
    for (const food of THAI_SINGLE_DISH_CATALOG) {
      if (existingFoodIds.has(food.id)) continue;
      await saveFoodItem(structuredClone(food));
      // Update only after successful persistence, making repeated calls with
      // the same ID set idempotent without marking failed writes as imported.
      existingFoodIds.add(food.id);
      importedCount += 1;
    }
    return importedCount;
  }

  public static async searchOpenFoodFactsThailand(
    query: string,
    signal?: AbortSignal
  ): Promise<FoodDefinition[]> {
    if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError');
    const search = query.trim().slice(0, 120);
    if (!search) return [];
    const url = new URL('/cgi/search.pl', OFF_ORIGIN);
    url.search = new URLSearchParams({
      search_terms: search,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '10',
      tagtype_0: 'countries',
      tag_contains_0: 'contains',
      tag_0: 'thailand',
      fields: PRODUCT_FIELDS
    }).toString();

    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(cancel, SEARCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Open Food Facts search failed (${response.status})`);
      const data = asObject(await response.json());
      if (!data || !Array.isArray(data.products)) throw new Error('Invalid Open Food Facts response');
      const retrievedAt = new Date().toISOString();
      const result: FoodDefinition[] = [];
      const seen = new Set<string>();
      for (const product of data.products.slice(0, 10)) {
        const food = foodFromProduct(product, retrievedAt);
        if (food && !seen.has(food.id)) {
          result.push(food);
          seen.add(food.id);
        }
      }
      return result;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', cancel);
    }
  }
}
