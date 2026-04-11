import { expect, type Page } from '@playwright/test';
import { clearAllStorage } from './storage';

/**
 * @deprecated Use clearAllStorage() from ./storage instead
 */
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
  await clearAllStorage(page);
  await page.reload();
  await page.waitForURL('**/#/setup');

  await expect(page.locator('h1')).toHaveText('Create Password');

  await page.locator('#password').fill(password);
  await page.locator('#confirm').fill(password);
  await page.locator('button[type="submit"]').click();

  // Handle passkey prompt if shown
  try {
    await page.waitForSelector('h1:has-text("Enable Quick Unlock")', { timeout: 3000 });
    await page.locator('button:has-text("Skip for now")').click();
  } catch {
    // Already on home page
  }

  await page.waitForURL('**/#/');
  await expect(page.locator('h1')).toHaveText('My Cards');
}
