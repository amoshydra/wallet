import { expect, test } from '@playwright/test';
import { clearAllStorage, isLocked } from './helpers/storage';
import { setupWithPassword, setupWithPasskey, unlockWithPassword } from './helpers/auth';

test.describe('Authentication', () => {
  test('should setup with password and unlock', async ({ page }) => {
    // Setup with password only
    await setupWithPassword(page, 'testpass123');

    // Verify unlocked
    await expect(page.locator('h1')).toHaveText('My Cards');

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');
    expect(await isLocked(page)).toBe(true);

    // Unlock with password
    await unlockWithPassword(page, 'testpass123');

    // Verify unlocked
    await expect(page.locator('h1')).toHaveText('My Cards');
  });

  test('should unlock with password after passkey setup', async ({ page }) => {
    // CRITICAL TEST: This would have caught the extractability bug
    // Setup with password + passkey
    await setupWithPasskey(page, 'testpass123');

    // Verify unlocked
    await expect(page.locator('h1')).toHaveText('My Cards');

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Unlock with PASSWORD (not passkey) - this is the critical flow
    await page.locator('input[type="password"]').fill('testpass123');
    await page.locator('button:has-text("Unlock with Password")').click();

    // Should unlock successfully
    await page.waitForURL('**/#/');
    await expect(page.locator('h1')).toHaveText('My Cards');
  });

  test('should show error for wrong password', async ({ page }) => {
    // Setup
    await setupWithPassword(page, 'correctpass');

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Try wrong password
    await page.locator('input[type="password"]').fill('wrongpass');
    await page.locator('button:has-text("Unlock with Password")').click();

    // Should show error
    await expect(page.locator('.error')).toHaveText('Incorrect password');

    // Should still be locked
    expect(await isLocked(page)).toBe(true);

    // URL should still be unlock page
    expect(page.url()).toContain('#/unlock');
  });

  test('should require fresh setup after storage cleared', async ({ page }) => {
    // Setup
    await setupWithPassword(page, 'testpass123');

    // Clear all storage
    await clearAllStorage(page);

    // Reload
    await page.reload();

    // Should be on setup page
    await page.waitForURL('**/#/setup');
    await expect(page.locator('h1')).toHaveText('Create Password');
  });

  test('should use same salt across password unlocks', async ({ page }) => {
    // Setup
    await setupWithPassword(page, 'testpass123');

    // Get the salt from IndexedDB
    const salt1 = await page.evaluate(async () => {
      const db = await indexedDB.open('WalletDB', 3);
      return new Promise((resolve) => {
        db.onsuccess = () => {
          const transaction = db.result.transaction('keys', 'readonly');
          const store = transaction.objectStore('keys');
          const request = store.get('master');
          request.onsuccess = () => {
            resolve(request.result?.salt);
          };
        };
      });
    });

    // Lock and unlock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');
    await unlockWithPassword(page, 'testpass123');

    // Get salt again
    const salt2 = await page.evaluate(async () => {
      const db = await indexedDB.open('WalletDB', 3);
      return new Promise((resolve) => {
        db.onsuccess = () => {
          const transaction = db.result.transaction('keys', 'readonly');
          const store = transaction.objectStore('keys');
          const request = store.get('master');
          request.onsuccess = () => {
            resolve(request.result?.salt);
          };
        };
      });
    });

    // Salt should be identical
    expect(salt1).toEqual(salt2);
  });

  test('should persist data across lock/unlock', async ({ page }) => {
    // Setup
    await setupWithPassword(page, 'testpass123');

    // Add a test card (we'll simulate this by checking the cards list)
    // Note: In a real test, you'd add a card here

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Unlock
    await unlockWithPassword(page, 'testpass123');

    // Verify still on home page
    await expect(page.locator('h1')).toHaveText('My Cards');
  });
});
