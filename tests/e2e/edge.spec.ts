import { expect, test } from '@playwright/test';
import { clearAllStorage } from './helpers/storage';
import { setupWithPassword } from './helpers/auth';

test.describe('Edge Cases', () => {
  test('should reject empty password', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await clearAllStorage(page);
    await page.reload();

    await page.waitForURL('**/#/setup');
    await expect(page.locator('h1')).toHaveText('Create Password');

    // Try to submit empty password
    await page.locator('button[type="submit"]').click();

    // Should show error
    await expect(page.locator('.error')).toHaveText('Password is required');

    // Should still be on setup page
    expect(page.url()).toContain('#/setup');
  });

  test('should reject mismatched passwords', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await clearAllStorage(page);
    await page.reload();

    await page.waitForURL('**/#/setup');

    // Enter mismatched passwords
    await page.locator('#password').fill('password123');
    await page.locator('#confirm').fill('different123');
    await page.locator('button[type="submit"]').click();

    // Should show error
    await expect(page.locator('.error')).toHaveText('Passwords do not match');

    // Should still be on setup page
    expect(page.url()).toContain('#/setup');
  });

  test('should allow skipping passkey setup', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Should be on home page (passkey was skipped)
    await expect(page.locator('h1')).toHaveText('My Cards');

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Should NOT have passkey option (was skipped)
    const passkeyButton = page.locator('button:has-text("Use Passkey")');
    await expect(passkeyButton).not.toBeVisible();
  });

  test('should handle rapid lock/unlock', async ({ page }) => {
    await setupWithPassword(page, 'testpass123');

    // Rapid lock/unlock cycles
    for (let i = 0; i < 3; i++) {
      await page.locator('button:has-text("Lock")').click();
      await page.waitForURL('**/#/unlock');

      await page.locator('input[type="password"]').fill('testpass123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/#/');

      await expect(page.locator('h1')).toHaveText('My Cards');
    }
  });

  test('should handle special characters in password', async ({ page }) => {
    const specialPassword = 'MyP@ssw0rd!#$%^&*()';

    await setupWithPassword(page, specialPassword);

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Unlock with special password
    await page.locator('input[type="password"]').fill(specialPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/#/');

    await expect(page.locator('h1')).toHaveText('My Cards');
  });

  test('should handle long passwords', async ({ page }) => {
    const longPassword = 'a'.repeat(128);

    await setupWithPassword(page, longPassword);

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Unlock with long password
    await page.locator('input[type="password"]').fill(longPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/#/');

    await expect(page.locator('h1')).toHaveText('My Cards');
  });

  test('should show error for wrong password multiple times', async ({ page }) => {
    await setupWithPassword(page, 'correctpass');

    // Lock
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/#/unlock');

    // Try wrong password 3 times
    for (let i = 0; i < 3; i++) {
      await page.locator('input[type="password"]').fill('wrongpass');
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('.error')).toHaveText('Incorrect password');
    }

    // Still locked
    expect(page.url()).toContain('#/unlock');

    // Now correct password should work
    await page.locator('input[type="password"]').fill('correctpass');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/#/');

    await expect(page.locator('h1')).toHaveText('My Cards');
  });
});
