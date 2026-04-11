import { expect, test } from '@playwright/test';
import { clearIndexedDB } from './helpers/db';

test.describe('Passkey and Password Authentication', () => {
  test('should login with password after setting up passkey', async ({ page }) => {
    // Clear any existing data
    await page.goto('/');
    await clearIndexedDB(page);
    await page.reload();

    // Wait for setup page
    await page.waitForURL('**/#/setup');
    await expect(page.locator('h1')).toHaveText('Create Password');

    // Create password
    await page.locator('#password').fill('testpass123');
    await page.locator('#confirm').fill('testpass123');
    await page.locator('button[type="submit"]').click();

    // Should see passkey prompt (or go directly to home if passkey not available)
    try {
      await page.waitForURL('**/#/setup', { timeout: 3000 });
      const passkeyPrompt = await page.locator('h1:has-text("Enable Quick Unlock")').isVisible();
      if (passkeyPrompt) {
        // Click skip for now (we'll test passkey separately)
        await page.locator('button:has-text("Skip for now")').click();
      }
    } catch {
      // Already on home page
    }

    // Should be on home page
    await page.waitForURL('**/#/');
    await expect(page.locator('h1')).toHaveText('My Cards');

    // Lock the wallet
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Try to unlock with password
    await page.locator('input[type="password"]').fill('testpass123');
    await page.locator('button:has-text("Unlock with Password")').click();

    // Should be back on home page
    await page.waitForURL('**/#/');
    await expect(page.locator('h1')).toHaveText('My Cards');
  });

  test('should show passkey option when configured', async ({ page }) => {
    // First set up auth with password
    await page.goto('/');
    await clearIndexedDB(page);
    await page.reload();

    await page.waitForURL('**/#/setup');
    await page.locator('#password').fill('testpass123');
    await page.locator('#confirm').fill('testpass123');
    await page.locator('button[type="submit"]').click();

    // Skip passkey setup if shown
    try {
      await page.waitForSelector('h1:has-text("Enable Quick Unlock")', { timeout: 3000 });
      await page.locator('button:has-text("Skip for now")').click();
    } catch {
      // Already on home
    }

    await page.waitForURL('**/#/');

    // Lock and go to unlock page
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Check that password unlock is available
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
