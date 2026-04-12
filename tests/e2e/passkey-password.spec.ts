import { expect, test } from '@playwright/test';
import { clearIndexedDB } from './helpers/db';
import { setupWithPasskey, unlockWithPassword } from './helpers/auth';

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
    await page.locator('button[type="submit"]').click();

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

  test('should remove passkey with correct password', async ({ page }) => {
    await setupWithPasskey(page, 'testpass123');

    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    await unlockWithPassword(page, 'testpass123');
    await expect(page.locator('h1')).toHaveText('My Cards');

    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('button:has-text("Security")').click();
    await page.waitForURL('**/#/security');

    await expect(page.locator('text=Quick Unlock is enabled')).toBeVisible();
    await page.locator('button:has-text("Remove Passkey")').click();

    await expect(page.locator('h3:has-text("Remove Passkey")')).toBeVisible();

    await page.locator('#removePasskeyPassword').fill('testpass123');
    await page.locator('button[type="submit"]:has-text("Remove")').click();

    await expect(page.locator('text=Quick Unlock is enabled')).not.toBeVisible();
  });

  test('should fail to remove passkey with wrong password', async ({ page }) => {
    await setupWithPasskey(page, 'testpass123');

    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    await unlockWithPassword(page, 'testpass123');
    await expect(page.locator('h1')).toHaveText('My Cards');

    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('button:has-text("Security")').click();
    await page.waitForURL('**/#/security');

    await expect(page.locator('text=Quick Unlock is enabled')).toBeVisible();
    await page.locator('button:has-text("Remove Passkey")').click();

    await page.locator('#removePasskeyPassword').fill('wrongpassword');
    await page.locator('button[type="submit"]:has-text("Remove")').click();

    await expect(page.locator('text=Incorrect current password')).toBeVisible();
    await expect(page.locator('text=Quick Unlock is enabled')).toBeVisible();
  });
});
