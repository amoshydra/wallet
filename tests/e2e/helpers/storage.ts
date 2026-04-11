import type { Page } from '@playwright/test';

/**
 * Clear all storage: IndexedDB and localStorage
 */
export async function clearAllStorage(page: Page) {
  await page.evaluate(async () => {
    // Clear localStorage
    localStorage.clear();

    // Clear IndexedDB
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

/**
 * Check if wallet is currently locked (on unlock page)
 */
export async function isLocked(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('#/unlock');
}

/**
 * Check if on home page (unlocked)
 */
export async function isUnlocked(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('#/') && !url.includes('unlock') && !url.includes('setup');
}
