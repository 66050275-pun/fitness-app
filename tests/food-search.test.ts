import test from 'node:test';
import assert from 'node:assert/strict';
import { THAI_SINGLE_DISH_CATALOG } from '../src/data/thaiFoodCatalog.ts';
import { setLanguage } from '../src/i18n/index.ts';
import { ThaiFoodService } from '../src/services/thaiFoodService.ts';
import { searchFoodDefinitions } from '../src/utils/foodSearch.ts';
import type { FoodDefinition } from '../src/types/index.ts';

function catalogFood(id: string): FoodDefinition {
  const food = id === 'food-rolled-oats' ? {
    id, name: 'Rolled Oats', source: 'built_in' as const,
    nutritionBasis: { amount: 100, unit: 'g' as const },
    nutrition: { calories: 379, protein: 13.2, carbs: 67.7, fat: 6.5 },
    portionOptions: [], createdAt: '2026-01-01', updatedAt: '2026-01-01'
  } : THAI_SINGLE_DISH_CATALOG.find(item => item.id === id);
  assert.ok(food, `Missing catalog fixture ${id}`);
  return food;
}

test('local searches match Thai and English regardless of the app language', () => {
  const oats = catalogFood('food-rolled-oats');
  for (const language of ['en', 'th'] as const) {
    setLanguage(language);
    assert.deepEqual(searchFoodDefinitions([oats], 'ข้าวโอ๊ต').map(food => food.id), [oats.id]);
    assert.deepEqual(searchFoodDefinitions([oats], 'rolled oats').map(food => food.id), [oats.id]);
  }
});

test('aliases, reversed words, case and punctuation work without discarding Thai marks', () => {
  const krapow = catalogFood('thai_dish_pad_krapow_pork_egg');
  const rice = catalogFood('thai_dish_khao_man_gai');
  assert.deepEqual(searchFoodDefinitions([krapow, rice], 'ไข่ กะเพรา').map(food => food.id), [krapow.id]);
  assert.deepEqual(searchFoodDefinitions([krapow, rice], 'rice, CHICKEN').map(food => food.id), [rice.id]);
  assert.deepEqual(searchFoodDefinitions([krapow, rice], 'กระเพรา').map(food => food.id), [krapow.id]);
  const coffee = { ...rice, id: 'coffee', name: 'Café Latte', searchAliases: [] };
  assert.deepEqual(searchFoodDefinitions([coffee], 'cafe-latte').map(food => food.id), [coffee.id]);
});

test('name and exact barcode matches rank above category and partial matches', () => {
  const base = catalogFood('food-rolled-oats');
  const categoryMatch: FoodDefinition = { ...base, id: 'category', name: 'Breakfast Mix', category: 'Oats' };
  const partialName: FoodDefinition = { ...base, id: 'partial', name: 'Oats and Fruit', category: 'Breakfast' };
  const exactName: FoodDefinition = { ...base, id: 'exact', name: 'Oats', category: 'Breakfast' };
  assert.deepEqual(searchFoodDefinitions([categoryMatch, partialName, exactName], 'oats').map(food => food.id),
    ['exact', 'partial', 'category']);

  const barcode = '8851234567890';
  const numberInName: FoodDefinition = { ...base, id: 'name', name: `${barcode} snack`, source: 'custom' };
  const product: FoodDefinition = { ...base, id: 'product', name: 'Snack', barcode: '885-1234-567890', source: 'custom' };
  assert.deepEqual(searchFoodDefinitions([numberInName, product], '๘๘๕ ๑๒๓๔ ๕๖๗๘๙๐').map(food => food.id),
    ['product', 'name']);
});

test('custom names are not translated, and blank searches retain collection order', () => {
  const oats = catalogFood('food-rolled-oats');
  const custom: FoodDefinition = { ...oats, id: 'custom', source: 'custom' };
  assert.deepEqual(searchFoodDefinitions([custom], 'ข้าวโอ๊ตรีดแผ่น'), []);
  assert.deepEqual(searchFoodDefinitions([custom, oats], '  ').map(food => food.id), ['custom', oats.id]);
  assert.deepEqual(searchFoodDefinitions([custom, oats], '---'), []);
  assert.deepEqual(searchFoodDefinitions([custom, oats], 'no such food'), []);
});

test('online search filters invalid and duplicate products before applying its result limit', async t => {
  const valid = Array.from({ length: 19 }, (_, index) => ({
    code: String(8850000000000n + BigInt(index)), product_name: `Synthetic product ${index}`,
    countries_tags: ['en:thailand'], nutriments: { 'energy-kcal_100g': 150, proteins_100g: 5 }
  }));
  const invalid = Array.from({ length: 10 }, (_, index) => ({ code: `bad-${index}`, product_name: 'Incomplete' }));
  const products = [...invalid, valid[0], valid[0], ...valid.slice(1)];
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requests += 1;
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://world.openfoodfacts.org');
    assert.equal(url.searchParams.get('search_terms'), 'synthetic');
    assert.equal(url.searchParams.get('page_size'), '30');
    assert.equal(init?.credentials, 'omit');
    assert.equal(init?.referrerPolicy, 'no-referrer');
    return new Response(JSON.stringify({ products }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const result = await ThaiFoodService.searchOpenFoodFactsThailand('synthetic');
  assert.equal(requests, 1);
  assert.equal(result.length, 15);
  assert.equal(new Set(result.map(food => food.id)).size, 15);
  assert.equal(result[0].nutrition.calories, 150);
  assert.equal(result[0].nutrition.sodium, null);
  assert.equal(result[0].dataProvenance?.provider, 'open_food_facts');
});

test('online search does not start for blank or already cancelled requests', async t => {
  let requests = 0;
  t.mock.method(globalThis, 'fetch', async () => { requests += 1; return new Response(); });
  assert.deepEqual(await ThaiFoodService.searchOpenFoodFactsThailand('  '), []);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(ThaiFoodService.searchOpenFoodFactsThailand('synthetic', controller.signal), { name: 'AbortError' });
  assert.equal(requests, 0);
});
