import { expect, type Page } from '@playwright/test';

export async function clearIndexedDB(page: Page) {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      const name = db.name;
      if (name) {
        await new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () => resolve();
        });
      }
    }
  });
}

export async function completeSetup(page: Page, password = 'password123') {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await clearIndexedDB(page);
  await page.reload();
  await page.waitForURL('**/setup');

  await expect(page.locator('h1')).toHaveText('Choose Your Security');

  const passwordOnlyButton = page.locator('button:has-text("Password Only")');
  const setUpPasswordButton = page.locator('button:has-text("Set Up Password")');

  if (await passwordOnlyButton.isVisible()) {
    await passwordOnlyButton.click();
  } else if (await setUpPasswordButton.isVisible()) {
    await setUpPasswordButton.click();
  }

  await page.waitForSelector('#password', { state: 'visible' });
  await page.locator('#password').fill(password);
  await page.locator('#confirm').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/');
}

export async function completeBiometricSetup(page: Page, password = 'password123') {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await clearIndexedDB(page);
  await page.reload();
  await page.waitForURL('**/setup');

  await expect(page.locator('h1')).toHaveText('Choose Your Security');

  const biometricButton = page.locator('button:has-text("Biometric")');
  if (await biometricButton.isVisible()) {
    await biometricButton.click();

    const setupBiometricButton = page.locator('button:has-text("Set Up")');
    if (await setupBiometricButton.isVisible()) {
      await setupBiometricButton.click();
    }
  }

  await page.waitForSelector('#password', { state: 'visible' });
  await page.locator('#password').fill(password);
  await page.locator('#confirm').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/');
}
