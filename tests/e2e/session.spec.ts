import { expect, test } from '@playwright/test';
import { setupWithPassword, unlockWithPassword } from './helpers/auth';
import { isLocked } from './helpers/storage';

test.describe('Session Management', () => {
  test('should lock when clicking lock button', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Click lock
    await page.locator('button:has-text("Lock")').click();

    // Should be on unlock page
    await page.waitForURL('**/#/unlock');
    expect(await isLocked(page)).toBe(true);
    await expect(page.locator('h1')).toHaveText('Unlock Wallet');
  });

  test('should require unlock after reload', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Reload while unlocked
    await page.reload();

    // Should redirect to unlock page (session doesn't persist across reloads for security)
    await page.waitForURL('**/#/unlock');
    await expect(page.locator('h1')).toHaveText('Unlock Wallet');
  });

  test('should remain locked after reload', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Reload while locked
    await page.reload();

    // Should still be locked
    await page.waitForURL('**/#/unlock');
    expect(await isLocked(page)).toBe(true);
    await expect(page.locator('h1')).toHaveText('Unlock Wallet');
  });

  test('should maintain unlocked state after navigation', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Navigate to a route and back
    await page.goto('/#/add');
    await page.waitForURL('**/#/add');

    // Go back
    await page.goBack();
    await page.waitForURL('**/#/');

    // Should still show home (still unlocked)
    await expect(page.locator('h1')).toHaveText('My Cards');
  });

  test('should clear session data on lock', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Master key should not be accessible (we can't directly test this,
    // but we can verify unlock is required)
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should allow re-unlock after lock', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Unlock again
    await unlockWithPassword(page, 'testpass123');

    // Should be unlocked
    await expect(page.locator('h1')).toHaveText('My Cards');
  });

  test('should handle multiple lock/unlock cycles', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Cycle 1
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');
    await unlockWithPassword(page, 'testpass123');
    await expect(page.locator('h1')).toHaveText('My Cards');

    // Cycle 2
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');
    await unlockWithPassword(page, 'testpass123');
    await expect(page.locator('h1')).toHaveText('My Cards');

    // Cycle 3
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');
    await unlockWithPassword(page, 'testpass123');
    await expect(page.locator('h1')).toHaveText('My Cards');
  });
});
