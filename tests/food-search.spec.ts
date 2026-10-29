import { test, expect, type FrameLocator, type Page } from '@playwright/test';

type App = Page | FrameLocator;
const pin = '246810';
test.use({ actionTimeout: 10_000, navigationTimeout: 20_000 });

async function call(app: App, name: string, ...args: unknown[]) {
  await app.locator('body').evaluate((_, { name, args }) => {
    (window as any)[name](...args);
  }, { name, args });
}

async function setup(page: Page, embedded: boolean): Promise<App> {
  await page.addInitScript(() => {
    // The vault and profile contain synthetic data in an isolated browser context.
    if (localStorage.getItem('food-search-fixture-seeded')) return;
    localStorage.setItem('food-search-fixture-seeded', 'yes');
    localStorage.setItem('nutriai_ui_language', 'en');
    localStorage.setItem('nutriai_app_data_v2', JSON.stringify({
      schemaVersion: 5, onboardingState: { status: 'completed', currentStep: 6 },
      userProfile: { displayName: 'SYNTHETIC SEARCH USER', biologicalSex: 'female', birthDate: '1990-01-01', heightCm: 165, weightKg: 60 },
      userPreferences: { language: 'en', reduceMotion: true, theme: 'light' },
      meals: [], customFoods: [], recentFoods: [], waterByDate: {}, burnedByDate: {}, weightHistory: []
    }));
  });
  await page.goto(embedded ? '/inline-fixture.html' : '/');
  const app: App = embedded ? page.frameLocator('#preview') : page;
  await expect(app.locator('#vault-keypad')).toBeVisible();
  for (const digit of pin) await app.locator(`[data-vault-digit="${digit}"]`).click();
  await expect(app.locator('#vault-heading')).toContainText('Re-enter your passcode');
  for (const digit of pin) await app.locator(`[data-vault-digit="${digit}"]`).click();
  await expect(app.locator('#vault-lock')).toBeVisible();
  await call(app, 'navigateApp', 'foodSearch');
  await expect(app.locator('#food-search-input')).toBeVisible();
  return app;
}

for (const host of [
  { label: 'mobile browser', embedded: false, width: 320, height: 640 },
  { label: 'Streamlit iframe', embedded: true, width: 390, height: 844 }
]) {
  test(`${host.label} searches, shows recovery actions and opens an online product`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: host.width, height: host.height });
    const pageErrors: string[] = [];
    const requests: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
      if (request.url().startsWith('https://world.openfoodfacts.org/')) requests.push(request.url());
    });
    await page.route('https://world.openfoodfacts.org/**', async route => {
      const products = Array.from({ length: 19 }, (_, index) => ({
        code: String(8850000000000n + BigInt(index)), product_name: `Synthetic product ${index}`,
        countries_tags: ['en:thailand'], nutriments: { 'energy-kcal_100g': 150, proteins_100g: 5 }
      }));
      const invalid = Array.from({ length: 10 }, () => ({ product_name: 'Incomplete' }));
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ products: [...invalid, products[0], products[0], ...products.slice(1)] }) });
    });

    const app = await setup(page, host.embedded);
    const input = app.locator('#food-search-input');
    const results = app.locator('#all-foods-list-container');
    await input.fill('ข้าวโอ๊ต');
    await expect(results).toContainText('Rolled Oats');
    await expect(input).toBeFocused();
    await expect(app.locator('#food-search-announcement')).toContainText('Local food matches');
    await input.fill('rice chicken');
    await expect(results).toContainText('Hainanese Chicken Rice');
    await input.fill('syntheticquery');
    await expect(results).toContainText('No local foods found');
    expect(requests).toHaveLength(0);

    await results.getByRole('button', { name: 'View online search options' }).click();
    await expect(app.locator('#online-food-search-disclosure')).toHaveAttribute('open', '');
    await expect(app.locator('#food-online-summary')).toBeFocused();
    await expect(app.locator('#online-food-search-area')).toContainText('Your search text is sent to Open Food Facts.');
    expect(requests).toHaveLength(0);
    await app.locator('#food-online-submit').click();
    await expect(app.locator('#online-food-search-area')).toContainText('Online products (15)');
    await expect(app.locator('#online-food-search-area')).toContainText('Synthetic product 0');
    expect(requests).toHaveLength(1);
    const url = new URL(requests[0]);
    expect(url.searchParams.get('search_terms')).toBe('syntheticquery');
    expect(url.searchParams.get('page_size')).toBe('30');
    await app.locator('#online-food-search-area').getByRole('button', { name: 'Configure portion for Synthetic product 0' }).click();
    await expect(app.locator('#set-portion-modal-backdrop')).toBeVisible();
    await expect(app.locator('#set-portion-modal-backdrop')).toContainText('Synthetic product 0');
    await call(app, 'closeSetPortionModal');

    await call(app, 'setAppLanguage', 'th');
    await call(app, 'setAppTheme', 'dark');
    await input.fill('Rolled Oats');
    await expect(results).toContainText('ข้าวโอ๊ตรีดแผ่น');
    await expect(input).toBeFocused();
    expect(await app.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await app.locator('#food-search-clear').click();
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    expect(pageErrors).toEqual([]);
  });
}

test('online search reports errors, supports retry and discards results for a previous query', async ({ page }) => {
  test.setTimeout(60_000);
  let failures = 0;
  let oldStarted!: () => void;
  let releaseOld!: () => void;
  const oldRequestStarted = new Promise<void>(resolve => { oldStarted = resolve; });
  const oldRequestRelease = new Promise<void>(resolve => { releaseOld = resolve; });
  await page.route('https://world.openfoodfacts.org/**', async route => {
    const query = new URL(route.request().url()).searchParams.get('search_terms');
    if (query === 'retryquery' && failures++ === 0) {
      await route.fulfill({ status: 503, body: 'Unavailable' });
      return;
    }
    if (query === 'oldquery') {
      oldStarted();
      await oldRequestRelease;
    }
    const name = query === 'oldquery' ? 'Old product' : query === 'newquery' ? 'New product' : 'Retry product';
    try {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ products: [{
        code: '8850000000000', product_name: name, countries_tags: ['en:thailand'],
        nutriments: { 'energy-kcal_100g': 150 }
      }] }) });
    } catch { /* The old request is expected to be aborted after the query changes. */ }
  });
  const app = await setup(page, false);
  const input = app.locator('#food-search-input');
  await input.fill('retryquery');
  await app.locator('#food-online-summary').click();
  await app.locator('#food-online-submit').click();
  await expect(app.locator('#online-food-search-area')).toContainText('Online search is unavailable.');
  await expect(app.locator('#food-online-summary')).toBeFocused();
  await app.locator('#food-online-submit').click();
  await expect(app.locator('#online-food-search-area')).toContainText('Retry product');

  await input.fill('oldquery');
  await app.locator('#food-online-submit').click();
  await oldRequestStarted;
  await input.fill('newquery');
  releaseOld();
  await app.locator('#food-online-submit').click();
  await expect(app.locator('#online-food-search-area')).toContainText('New product');
  await expect(app.locator('#online-food-search-area')).not.toContainText('Old product');
});
