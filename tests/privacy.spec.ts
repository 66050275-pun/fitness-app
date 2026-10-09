import { test, expect } from '@playwright/test';
const passphrase = 'browser-test-only-passphrase';
const attack = `');window.__injected=1;//\"><img src=x onerror="window.__injected=1">`;

test('mobile preview migrates, encrypts, locks and safely renders personal fields', async ({ page }) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && !request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  await page.addInitScript(({ attack }) => {
    // Only synthetic test information is used.
    if (!localStorage.getItem('fixture-seeded')) {
      localStorage.setItem('fixture-seeded', 'yes');
      localStorage.setItem('nutriai_app_data_v2', JSON.stringify({ schemaVersion: 5,
        userProfile: { displayName: 'PRIVATE-BROWSER-TEST', biologicalSex: 'female', birthDate: '1990-01-01', heightCm: 165, weightKg: 60 },
        onboardingState: { status: 'completed', currentStep: 6 }, meals: [], customFoods: [], recentFoods: [],
        waterByDate: {}, burnedByDate: {}, weightHistory: [] }));
      localStorage.setItem('nutriai_feedback_draft', JSON.stringify({ subject: attack, description: attack, email: 'synthetic@example.test' }));
    }
  }, { attack });
  await page.goto('/');
  await expect(page.locator('#vault-password')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#vault-password').fill(passphrase);
  await page.locator('#vault-confirm').fill(passphrase);
  await page.locator('#vault-form button').click();
  await expect(page.locator('#vault-lock')).toBeVisible();
  await expect(page.locator('#app')).toContainText('PRIVATE-BROWSER-TEST');
  const result = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => { const req = indexedDB.open('nutriai_private_vault', 1); req.onsuccess = () => resolve(req.result); });
    const encrypted = await new Promise<string>(resolve => {
      const tx = db.transaction('vault', 'readonly'); const req = tx.objectStore('vault').get('current');
      tx.oncomplete = () => { db.close(); resolve(JSON.stringify(req.result)); };
    });
    return { encrypted, legacy: localStorage.getItem('nutriai_app_data_v2'), feedback: localStorage.getItem('nutriai_feedback_draft') };
  });
  expect(result.legacy).toBeNull(); expect(result.feedback).toBeNull();
  expect(result.encrypted).not.toContain('PRIVATE-BROWSER-TEST'); expect(result.encrypted).not.toContain('synthetic@example.test');
  await page.evaluate(() => (window as any).navigateApp('coach'));
  await page.locator('#chat-input').fill(attack);
  await page.locator('#chat-input').press('Enter');
  await expect(page.locator('#chat-messages-container')).toContainText(attack);
  expect(await page.evaluate(() => (window as any).__injected)).toBeUndefined();
  await page.evaluate(() => (window as any).navigateApp('profile'));
  await page.evaluate(() => (window as any).openProfileSubpage('feedback'));
  await expect(page.locator('#feedback-subject-input')).toHaveValue(attack);
  expect(await page.evaluate(() => (window as any).__injected)).toBeUndefined();
  for (const screen of ['dashboard', 'diary', 'fitness', 'insights', 'scanner', 'foodResult', 'foodSearch', 'quickLog', 'profile', 'coach']) {
    await page.evaluate(screen => (window as any).navigateApp(screen), screen);
    await expect(page.locator('#app')).not.toBeEmpty();
  }
  await page.evaluate(() => (window as any).navigateApp('profile'));
  for (const subpage of ['personal_info', 'weight_goal', 'nutrition_goals', 'activity_level', 'weight_history', 'eating_schedule', 'health_connections', 'app_settings', 'whats_new', 'feedback', 'help_center', 'terms_of_use', 'privacy_policy', 'marketing_consent', 'health_disclaimer', 'data_privacy']) {
    await page.evaluate(subpage => (window as any).openProfileSubpage(subpage), subpage);
    await expect(page.locator('#app')).not.toBeEmpty();
  }
  await page.locator('#vault-lock').click();
  await expect(page.locator('#vault-form')).toBeVisible();
  await expect(page.locator('#app')).not.toContainText('PRIVATE-BROWSER-TEST');
  await page.locator('#vault-password').fill('incorrect-passphrase');
  await page.locator('#vault-form button').click();
  await expect(page.locator('#vault-error')).toContainText('Incorrect');
  await page.locator('#vault-password').fill(passphrase); await page.locator('#vault-form button').click();
  await expect(page.locator('#vault-lock')).toBeVisible();
  await page.clock.install();
  await page.clock.fastForward(5 * 60 * 1000 + 2000);
  await expect(page.locator('#vault-form')).toBeVisible();
  await page.locator('#vault-password').fill(passphrase); await page.locator('#vault-form button').click();
  await expect(page.locator('#vault-lock')).toBeVisible();
  await page.reload();
  await expect(page.locator('#vault-form')).toBeVisible();
  await expect(page.locator('#app')).not.toContainText('PRIVATE-BROWSER-TEST');
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('Streamlit srcdoc preview supports secure storage and lock/unlock', async ({ page }) => {
  await page.goto('/inline-fixture.html');
  const frame = page.frameLocator('#preview');
  await frame.locator('#vault-password').fill(passphrase);
  await frame.locator('#vault-confirm').fill(passphrase);
  await frame.locator('#vault-form button').click();
  await expect(frame.locator('#vault-lock')).toBeVisible();
  await expect(frame.locator('#app')).toContainText('Get Started');
  await frame.locator('#vault-lock').click();
  await expect(frame.locator('#vault-form')).toBeVisible();
  await frame.locator('#vault-password').fill(passphrase);
  await frame.locator('#vault-form button').click();
  await expect(frame.locator('#vault-lock')).toBeVisible();
});
