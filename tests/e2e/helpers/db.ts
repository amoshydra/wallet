import type { Page } from '@playwright/test';

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
  await page.locator('#password').fill(password);
  await page.locator('#confirm').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/');
}
