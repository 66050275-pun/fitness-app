import { test, expect } from '@playwright/test';

for (const host of ['mobile', 'Streamlit iframe'] as const) {
  test(`${host} keeps decimal nutrition values inside their cards`, async ({ page }) => {
    await page.addInitScript(() => {
      // Synthetic legacy records use the existing one-decimal migration precision.
      // Adding 0.1 and 0.2 reproduces the same floating-point display problem.
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const meals = [
        { id: 'numeric-one', name: 'NUMERIC-TEST-ONE', date, time: '08:00', mealType: 'breakfast', category: 'other', icon: 'restaurant',
          calories: 123.456789, protein: 2, carbs: 22.3, fat: 0.1 },
        { id: 'numeric-two', name: 'NUMERIC-TEST-TWO', date, time: '12:00', mealType: 'lunch', category: 'other', icon: 'restaurant',
          calories: 234.567891, protein: 2.1, carbs: 31.5, fat: 0.2 },
      ];
      localStorage.setItem('nutriai_app_data_v2', JSON.stringify({ schemaVersion: 5,
        onboardingState: { status: 'completed', currentStep: 6 }, meals, customFoods: [], recentFoods: [],
        nutritionGoals: { calorieTarget: 2310, proteinTarget: 231, carbsTarget: 308, fatTarget: 77, waterTarget: 2000 },
        userProfile: { displayName: 'NUMERIC-TEST', biologicalSex: 'female', birthDate: '1990-01-01', heightCm: 165, weightKg: 60 },
        waterByDate: {}, burnedByDate: {}, weightHistory: [] }));
    });
    const embedded = host === 'Streamlit iframe';
    await page.goto(embedded ? '/inline-fixture.html' : '/');
    if (embedded) await page.evaluate(() => {
      document.body.style.margin = '0';
      (document.getElementById('preview') as HTMLIFrameElement).style.width = '100%';
    });
    const app = embedded ? page.frameLocator('#preview') : page;
    await app.locator('#vault-password').fill('synthetic-numeric-passphrase');
    await app.locator('#vault-confirm').fill('synthetic-numeric-passphrase');
    await app.locator('#vault-form button').click();
    await expect(app.locator('.macro-summary')).toBeVisible();

    const call = async (name: string, ...args: unknown[]) => app.locator('body').evaluate((_, { name, args }) => {
      (window as any)[name](...args);
    }, { name, args });

    for (const language of ['en', 'th']) {
      await call('navigateApp', 'profile');
      await call('openProfileSubpage', 'app_settings');
      await app.locator('#app-language-select').selectOption(language);
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 844 });
        for (const theme of ['light', 'dark']) {
          await call('setAppTheme', theme);
          await call('navigateApp', 'dashboard');
          await expect(app.locator('html')).toHaveAttribute('lang', language);
          await expect(app.locator('.macro-card-reading > span:first-child')).toHaveText(['4.1', '53.8', '0.3']);
          // Wait for the incoming screen animation before measuring geometry.
          await app.locator('.macro-summary').evaluate(() => new Promise(resolve => setTimeout(resolve, 250)));
          const contained = await app.locator('.macro-card').evaluateAll(cards => cards.every(card => {
            const bounds = card.getBoundingClientRect();
            return [...card.querySelectorAll('span')].every(label => {
              const range = document.createRange(); range.selectNodeContents(label);
              return [...range.getClientRects()].every(rect => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1);
            });
          }));
          expect(contained).toBe(true);
          await call('navigateApp', 'diary');
          await expect(app.locator('.ui-stat-grid').first()).toContainText('0.3');
          await expect(app.locator('.ui-stat-grid').first()).not.toContainText('0.300000');
          await call('openMealDetail', 'numeric-one');
          await expect(app.locator('#meal-detail-modal-backdrop .ui-stat-grid')).toContainText('0.1');
          await call('closeMealDetail');
        }
      }
    }
  });
}
