import { test, expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

type App = Page | FrameLocator;
const passphrase = 'synthetic-drawer-test-passphrase';
const mealId = 'drawer-fixture-meal';
const foodId = 'food-rolled-oats';

async function call(app: App, name: string, ...args: unknown[]) {
  await app.locator('body').evaluate((_, { name, args }) => {
    (window as any)[name](...args);
  }, { name, args });
}

async function setup(page: Page, embedded: boolean): Promise<App> {
  await page.addInitScript(() => {
    // Every value belongs to this synthetic browser context, never a real vault.
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nutrient = (key: string, name: string) => ({ key, name, amount: 10, unit: 'mg', dailyValuePercent: 20, source: 'manual' });
    const micronutrients = {
      vitamins: [nutrient('vitamin_a', 'Vitamin A'), nutrient('vitamin_c', 'Vitamin C'), nutrient('vitamin_d', 'Vitamin D'),
        nutrient('vitamin_e', 'Vitamin E'), nutrient('vitamin_k', 'Vitamin K'), nutrient('vitamin_b1', 'Vitamin B1')],
      minerals: [nutrient('calcium', 'Calcium'), nutrient('iron', 'Iron'), nutrient('magnesium', 'Magnesium'),
        nutrient('potassium', 'Potassium'), nutrient('zinc', 'Zinc'), nutrient('selenium', 'Selenium')],
      otherNutrients: [nutrient('fiber', 'Dietary Fiber'), nutrient('sodium', 'Sodium'), nutrient('cholesterol', 'Cholesterol')],
    };
    localStorage.setItem('nutriai_app_data_v2', JSON.stringify({ schemaVersion: 5,
      onboardingState: { status: 'completed', currentStep: 6 },
      userProfile: { displayName: 'DRAWER-SYNTHETIC-TEST', biologicalSex: 'female', birthDate: '1990-01-01', heightCm: 165, weightKg: 60 },
      userPreferences: { language: 'en', reduceMotion: true, theme: 'light' },
      meals: [{ id: 'drawer-fixture-meal', name: 'Synthetic drawer meal', date, time: '08:00', mealType: 'breakfast',
        category: 'other', icon: 'restaurant', calories: 250, protein: 20, carbs: 30, fat: 5, micronutrients,
        ingredients: ['Synthetic oats', 'Synthetic milk', 'Synthetic fruit', 'Synthetic yogurt'] }],
      customFoods: [], recentFoods: [], waterByDate: {}, burnedByDate: {}, weightHistory: [],
    }));
  });
  await page.goto(embedded ? '/inline-fixture.html' : '/');
  const app: App = embedded ? page.frameLocator('#preview') : page;
  await app.locator('#vault-password').fill(passphrase);
  await app.locator('#vault-confirm').fill(passphrase);
  await app.locator('#vault-form button').click();
  await expect(app.locator('.macro-summary')).toBeVisible();
  return app;
}

const cases = [
  { name: 'Quick Add', open: 'toggleQuickActions', args: [true], close: 'closeQuickAdd', selector: '#quick-add-backdrop', screen: 'dashboard' },
  { name: 'Home widgets', open: 'toggleDashboardWidgetDrawer', args: [true], close: 'toggleDashboardWidgetDrawer', closeArgs: [false], selector: '.ui-dialog-layer:has(#dashboard-widget-drawer-title)', screen: 'dashboard' },
  { name: 'Meal detail', open: 'openMealDetail', args: [mealId], close: 'closeMealDetail', selector: '#meal-detail-modal-backdrop', screen: 'diary' },
  { name: 'Nutrients', open: 'openNutrientsFromMeal', args: [mealId], close: 'closeNutrientModal', selector: '#nutrient-detail-modal-backdrop', screen: 'diary' },
  { name: 'Set portion', open: 'openSetPortion', args: [foodId], close: 'closeSetPortionModal', selector: '#set-portion-modal-backdrop', screen: 'foodSearch' },
  { name: 'Custom food', open: 'openCreateCustomFood', args: [], close: 'closeCustomFoodModal', selector: '#custom-food-modal-backdrop', screen: 'foodSearch' },
  { name: 'Diary calendar', open: 'openDiaryCalendar', args: [], close: 'closeDiaryCalendar', selector: '#diary-calendar-modal-backdrop', screen: 'diary' },
  { name: 'Weight entry', open: 'openWeightModal', args: [], close: 'closeWeightModal', selector: '#weight-entry-modal-backdrop', screen: 'profile' },
  { name: 'Weekly routine', open: 'openWeeklyProgramEditor', args: [], close: 'closeWeeklyProgramEditor', selector: '#weekly-program-modal-backdrop', screen: 'fitness' },
  { name: 'Planner date', open: 'openPlannerDateDetail', args: [], close: 'closePlannerDateDetail', selector: '#planner-detail-modal-backdrop', screen: 'fitness' },
] as const;

async function assertCenteredAndReachable(dialog: Locator) {
  await expect(dialog).toBeVisible();
  const panel = dialog.locator('.ui-dialog-panel').first();
  await expect(panel).toBeVisible();
  // Measure after layout settles, without relying on an animation timeout.
  await expect.poll(async () => panel.evaluate(element => {
    const panel = element.getBoundingClientRect();
    const layer = element.closest('.ui-dialog-layer') as HTMLElement;
    const region = layer.getBoundingClientRect();
    const style = getComputedStyle(layer);
    const left = region.left + parseFloat(style.paddingLeft);
    const right = region.right - parseFloat(style.paddingRight);
    const top = region.top + parseFloat(style.paddingTop);
    const bottom = region.bottom - parseFloat(style.paddingBottom);
    return panel.width > 0 && panel.height > 0 && panel.left >= left - 1 && panel.right <= right + 1
      && panel.top >= Math.max(44, top) - 1 && panel.bottom <= Math.min(innerHeight, bottom) + 1
      && Math.abs((panel.left + panel.right) / 2 - (left + right) / 2) <= 2
      && Math.abs((panel.top + panel.bottom) / 2 - (top + bottom) / 2) <= 2
      && element.scrollWidth <= element.clientWidth + 1;
  })).toBe(true);
  const body = dialog.locator('.ui-dialog-body').first();
  await expect(body).toBeVisible();
  const scroll = await body.evaluate(element => {
    element.scrollTop = element.scrollHeight;
    const bounds = element.getBoundingClientRect();
    const children = [...element.children].filter(child => child.getBoundingClientRect().height > 0);
    const final = children.at(-1)?.getBoundingClientRect();
    return { overflow: getComputedStyle(element).overflowY,
      max: element.scrollHeight - element.clientHeight, top: element.scrollTop,
      finalVisible: !final || final.bottom <= bounds.bottom + 1,
      horizontal: element.scrollWidth <= element.clientWidth + 1 };
  });
  expect(['auto', 'scroll']).toContain(scroll.overflow);
  expect(scroll.top).toBeGreaterThanOrEqual(scroll.max - 1);
  expect(scroll.finalVisible).toBe(true);
  expect(scroll.horizontal).toBe(true);
  for (const footer of await dialog.locator('.ui-dialog-footer').all()) {
    expect(await footer.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return bounds.top >= 44 && bounds.bottom <= innerHeight + 1;
    })).toBe(true);
  }
}

for (const host of ['mobile', 'Streamlit iframe'] as const) {
  const embedded = host === 'Streamlit iframe';
  test(`${host} centers every drawer and scrolls content without moving the page`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const app = await setup(page, embedded);
    const today = await app.locator('body').evaluate(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    const variants = [
      { width: 320, height: 640, language: 'en', theme: 'light' },
      { width: 320, height: 640, language: 'th', theme: 'dark' },
      { width: 390, height: 844, language: 'en', theme: 'dark' },
      { width: 390, height: 844, language: 'th', theme: 'light' },
    ];
    for (const variant of variants) {
      await page.setViewportSize({ width: variant.width, height: variant.height });
      await call(app, 'navigateApp', 'profile');
      await call(app, 'openProfileSubpage', 'app_settings');
      await app.locator('#app-language-select').selectOption(variant.language);
      await call(app, 'setAppTheme', variant.theme);
      for (const fixture of cases) {
        await test.step(`${fixture.name}: ${variant.width}px ${variant.language}/${variant.theme}`, async () => {
          await call(app, 'navigateApp', fixture.screen);
          if (fixture.name === 'Weight entry') await call(app, 'openProfileSubpage', 'weight_history');
          if (fixture.name === 'Quick Add') {
            const diaryLink = app.locator('.macro-summary button');
            await expect(diaryLink).not.toContainText('&rarr;');
            await expect(diaryLink).toContainText('→');
          }
          // Both initial and already-scrolled pages are represented in every viewport.
          const scrollBefore = await app.locator('body').evaluate((_, scrolled) => {
            window.scrollTo(0, scrolled ? 200 : 0);
            return window.scrollY;
          }, fixture.name !== 'Quick Add');
          await call(app, fixture.open, ...(fixture.name === 'Planner date' ? [today] : fixture.args));
          const dialog = app.locator(fixture.selector);
          await expect(app.locator('.ui-dialog-layer:visible')).toHaveCount(1);
          if (fixture.name === 'Quick Add') {
            await expect(app.locator('#quick-action-modal')).toHaveCount(0);
            await expect(app.locator('[role="dialog"]:visible')).toHaveCount(1);
            await expect(dialog.locator('button[onclick*="navigateApp(\'quickLog\')"]')).toHaveCount(1);
          }
          await assertCenteredAndReachable(dialog);
          const lockedScroll = await app.locator('body').evaluate(() => window.scrollY);
          await page.mouse.move(4, variant.height / 2);
          await page.mouse.wheel(0, 400);
          await expect.poll(() => app.locator('body').evaluate(() => window.scrollY)).toBe(lockedScroll);
          if (embedded) expect(await page.evaluate(() => window.scrollY)).toBe(0);
          await call(app, fixture.close, ...('closeArgs' in fixture ? fixture.closeArgs : []));
          await expect(app.locator('.ui-dialog-layer:visible')).toHaveCount(0);
          await expect.poll(() => app.locator('body').evaluate(() => window.scrollY)).toBe(scrollBefore);
        });
      }
    }
    expect(errors).toEqual([]);
  });

  test(`${host} keeps nested drawers, draft focus and lock behavior consistent`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 320, height: 640 });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const app = await setup(page, embedded);
    const visible = app.locator('.ui-dialog-layer:visible');
    // The center navigation button is re-rendered when Quick Add opens.
    // Closing must return focus to the newly mounted button, preserving scroll.
    const quickOpener = app.locator('#nav-fab-quick-add');
    const dashboardScroll = await app.locator('body').evaluate(() => { window.scrollTo(0, 200); return window.scrollY; });
    await quickOpener.click();
    await expect(visible).toHaveCount(1);
    await assertCenteredAndReachable(app.locator('#quick-add-backdrop'));
    await page.keyboard.press('Escape');
    await expect(visible).toHaveCount(0);
    await expect(quickOpener).toBeFocused();
    expect(await app.locator('body').evaluate(() => window.scrollY)).toBe(dashboardScroll);
    await app.locator('body').evaluate(() => window.scrollTo(0, 0));
    const widgetOpener = app.locator('[onclick="window.toggleDashboardWidgetDrawer(true)"]');
    await widgetOpener.click();
    await expect(visible).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(visible).toHaveCount(0);
    await expect(widgetOpener).toBeFocused();
    await quickOpener.click();
    await app.locator('#quick-add-backdrop button[onclick*="navigateApp(\'foodSearch\')"]').click();
    await expect(visible).toHaveCount(0);
    await expect(app.locator('#app-screen h1, #app-screen h2').first()).toBeFocused();
    await call(app, 'navigateApp', 'diary');
    await call(app, 'openMealDetail', mealId);
    const mealBody = app.locator('#meal-detail-modal-backdrop .ui-dialog-body');
    const mealScroll = await mealBody.evaluate(element => { element.scrollTop = 70; return element.scrollTop; });
    await call(app, 'openNutrientsFromMeal', mealId);
    await expect(visible).toHaveCount(1);
    await expect(app.locator('#meal-detail-modal-backdrop')).toBeHidden();
    await app.locator('#nutrient-modal-search').focus();
    await app.locator('#nutrient-modal-search').fill('Vitamin C');
    await call(app, 'setNutrientCategoryFilter', 'vitamins');
    await expect(app.locator('#nutrient-modal-search')).toHaveValue('Vitamin C');
    await expect(app.locator('#nutrient-detail-modal-backdrop .nutrient-row:visible')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(app.locator('#nutrient-detail-modal-backdrop')).toHaveCount(0);
    await expect(app.locator('#meal-detail-modal-backdrop')).toBeVisible();
    await expect(visible).toHaveCount(1);
    expect(await mealBody.evaluate(element => element.scrollTop)).toBe(mealScroll);
    await call(app, 'closeMealDetail');

    await call(app, 'navigateApp', 'foodSearch');
    await call(app, 'openSetPortion', foodId);
    const quantity = app.locator('#set-portion-qty-input');
    await quantity.fill('123');
    await expect(quantity).toBeFocused();
    await expect(quantity).toHaveValue('123');
    const portionBody = app.locator('#set-portion-modal-backdrop .ui-dialog-body');
    const portionScroll = await portionBody.evaluate(element => { element.scrollTop = 80; return element.scrollTop; });
    await call(app, 'openNutrientsFromCatalog', foodId);
    await expect(visible).toHaveCount(1);
    await expect(app.locator('#set-portion-modal-backdrop')).toBeHidden();
    await app.locator('#nutrient-modal-search').focus();
    await page.keyboard.press('Escape');
    await expect(app.locator('#set-portion-modal-backdrop')).toBeVisible();
    await expect(quantity).toHaveValue('123');
    expect(await portionBody.evaluate(element => element.scrollTop)).toBe(portionScroll);
    await call(app, 'closeSetPortionModal');

    await call(app, 'openCreateCustomFood');
    const name = app.locator('#cf-name');
    await name.fill('Synthetic custom draft');
    await name.evaluate(element => (element as HTMLInputElement).setSelectionRange(3, 7));
    await call(app, 'toggleDraftMicronutrients');
    await expect(name).toBeFocused();
    expect(await name.evaluate(element => [(element as HTMLInputElement).selectionStart, (element as HTMLInputElement).selectionEnd])).toEqual([3, 7]);
    await call(app, 'closeCustomFoodModal');
    const discard = app.locator('.ui-dialog-layer[data-dialog-close="window.cancelDiscardCustomFood()"]');
    await expect(discard).toBeVisible();
    await expect(app.locator('#custom-food-modal-backdrop')).toBeHidden();
    await expect(visible).toHaveCount(1);
    await discard.locator('button').first().focus();
    await page.keyboard.press('Escape');
    await expect(discard).toHaveCount(0);
    await expect(name).toBeFocused();
    await expect(name).toHaveValue('Synthetic custom draft');
    expect(await name.evaluate(element => [(element as HTMLInputElement).selectionStart, (element as HTMLInputElement).selectionEnd])).toEqual([3, 7]);
    await call(app, 'closeCustomFoodModal');
    await call(app, 'confirmDiscardCustomFood');

    await call(app, 'openCreateCustomFood');
    await app.locator('#cf-name').fill('Synthetic portion draft');
    await app.locator('#cf-category').selectOption('other');
    await call(app, 'nextCustomFoodStep');
    await call(app, 'nextCustomFoodStep');
    await app.locator('#cf-protein').fill('10');
    await app.locator('#cf-carbs').fill('20');
    await app.locator('#cf-fat').fill('5');
    await app.locator('#cf-calories').fill('165');
    await call(app, 'nextCustomFoodStep');
    await app.locator('#cf-new-portion-qty').fill('2');
    await app.locator('#cf-new-portion-unit').selectOption('bowl');
    await app.locator('#cf-new-portion-equiv').fill('50');
    await call(app, 'setAppTheme', 'dark');
    await expect(app.locator('#cf-new-portion-qty')).toHaveValue('2');
    await expect(app.locator('#cf-new-portion-unit')).toHaveValue('bowl');
    await expect(app.locator('#cf-new-portion-equiv')).toHaveValue('50');
    await call(app, 'addCustomFoodDraftPortion');
    await expect(app.locator('#cf-portions-list')).toContainText('bowl');
    await expect(app.locator('#cf-new-portion-qty')).toHaveValue('1');
    await expect(app.locator('#cf-new-portion-equiv')).toHaveValue('');
    await call(app, 'closeCustomFoodModal');
    await call(app, 'confirmDiscardCustomFood');

    await call(app, 'navigateApp', 'profile');
    await call(app, 'openProfileSubpage', 'weight_history');
    await call(app, 'openWeightModal');
    // Chromium cannot show an Android keyboard; resizing exercises the same
    // visible-viewport geometry while a drawer is already open.
    await page.setViewportSize({ width: 320, height: 480 });
    await assertCenteredAndReachable(app.locator('#weight-entry-modal-backdrop'));
    await page.setViewportSize({ width: 320, height: 640 });
    const note = app.locator('#weight-input-note');
    await note.fill('Synthetic unsaved note');
    await note.evaluate(element => (element as HTMLInputElement).setSelectionRange(4, 9));
    const body = app.locator('#weight-entry-modal-backdrop .ui-dialog-body');
    const scrollBefore = await body.evaluate(element => { element.scrollTop = 45; return element.scrollTop; });
    await call(app, 'setWeightModalUnit', 'lb');
    const pounds = await app.locator('#weight-input-value').inputValue();
    await call(app, 'setAppTheme', 'dark');
    await expect(note).toHaveValue('Synthetic unsaved note');
    await expect(note).toBeFocused();
    expect(await note.evaluate(element => [(element as HTMLInputElement).selectionStart, (element as HTMLInputElement).selectionEnd])).toEqual([4, 9]);
    expect(await body.evaluate(element => element.scrollTop)).toBe(scrollBefore);
    await expect(app.locator('#weight-input-unit')).toHaveValue('lb');
    await expect(app.locator('#weight-input-value')).toHaveValue(pounds);
    await expect(app.locator('#weight-unit-lb-btn')).toHaveClass(/bg-primary/);
    await expect(app.locator('#weight-unit-kg-btn')).not.toHaveClass(/bg-primary/);
    await app.locator('#vault-lock').click();
    await expect(app.locator('#vault-form')).toBeVisible();
    await expect(app.locator('.ui-dialog-layer')).toHaveCount(0);
    await expect(app.locator('#app')).not.toContainText('Synthetic unsaved note');
    await expect(app.locator('#app')).not.toContainText('DRAWER-SYNTHETIC-TEST');
    expect(errors).toEqual([]);
  });

  test(`${host} bounds confirmations and retains typed confirmation text`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 480 });
    const app = await setup(page, embedded);
    const bounded = async (selector: string) => {
      await expect(app.locator(selector)).toBeVisible();
      expect(await app.locator(`${selector} .ui-dialog-panel`).evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return bounds.top >= 56 && bounds.bottom <= innerHeight - 11
          && bounds.left >= 11 && bounds.right <= innerWidth - 11;
      })).toBe(true);
    };
    await call(app, 'openDeleteModal', 'active_workout_cancel');
    await bounded('#delete-workout-modal-backdrop');
    await page.keyboard.press('Escape');
    await expect(app.locator('#delete-workout-modal-backdrop')).toHaveCount(0);
    await call(app, 'confirmDeleteAllLocalData');
    await bounded('#profile-confirm-modal-backdrop');
    await app.locator('#confirm-typing-input').fill('DELETE');
    await expect(app.locator('#confirm-action-button')).toBeEnabled();
    await call(app, 'setAppTheme', 'dark');
    await expect(app.locator('#confirm-typing-input')).toHaveValue('DELETE');
    await expect(app.locator('#confirm-action-button')).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(app.locator('#profile-confirm-modal-backdrop')).toHaveCount(0);

    await call(app, 'navigateApp', 'fitness');
    await call(app, 'openWeeklyProgramEditor');
    for (let day = 1; day <= 7; day++) await call(app, 'handleWeeklyDaySelect', day, 'rest');
    const month = await app.locator('body').evaluate(() => [new Date().getFullYear(), new Date().getMonth() + 1]);
    await call(app, 'applyWeeklyToMonth', ...month);
    await call(app, 'openWeeklyProgramEditor');
    const body = app.locator('#weekly-program-modal-backdrop .ui-dialog-body');
    const savedScroll = await body.evaluate(element => { element.scrollTop = 80; return element.scrollTop; });
    await call(app, 'applyWeeklyToMonth', ...month);
    await bounded('#planner-overwrite-modal-backdrop');
    await assertCenteredAndReachable(app.locator('#planner-overwrite-modal-backdrop'));
    await page.keyboard.press('Escape');
    await expect(app.locator('#weekly-program-modal-backdrop')).toBeVisible();
    expect(await body.evaluate(element => element.scrollTop)).toBe(savedScroll);
    await page.keyboard.press('Escape');
    await expect(app.locator('.ui-dialog-layer:visible')).toHaveCount(0);
  });
}

test('Streamlit dialogs follow the parent visual viewport without resizing the iframe', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const app = await setup(page, true);
  await call(app, 'openWeightModal');
  await app.locator('#weight-input-note').fill('Synthetic keyboard viewport');
  const iframeHeight = await page.locator('#preview').evaluate(element => element.getBoundingClientRect().height);
  await page.evaluate(() => {
    // Model Android keyboard geometry; this is not an actual device keyboard.
    Object.defineProperty(window.visualViewport!, 'height', { configurable: true, value: 360 });
    Object.defineProperty(window.visualViewport!, 'offsetTop', { configurable: true, value: 40 });
    window.visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect.poll(() => app.locator('#weight-entry-modal-backdrop').evaluate(element => {
    const layer = element.getBoundingClientRect();
    const panel = element.querySelector('.ui-dialog-panel')!.getBoundingClientRect();
    const field = element.querySelector('#weight-input-note')!.getBoundingClientRect();
    return layer.top === 40 && layer.height === 360 && panel.top >= 96 && panel.bottom <= 388
      && field.top >= panel.top && field.bottom <= panel.bottom;
  })).toBe(true);
  expect(await page.locator('#preview').evaluate(element => element.getBoundingClientRect().height)).toBe(iframeHeight);
  await expect(app.locator('#vault-lock')).toBeVisible();
  await expect(app.locator('#weight-input-note')).toHaveValue('Synthetic keyboard viewport');
});
