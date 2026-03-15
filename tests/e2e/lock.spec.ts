import { expect, test } from '@playwright/test';
import { completeSetup } from './helpers/db';

test.describe('Lock Functionality', () => {
  test('should lock when pressing the lock button', async ({ page }) => {
    await completeSetup(page, 'password123');

    await expect(page.locator('h1')).toHaveText('My Cards');
    await page.locator('button:has-text("Lock")').click();

    await expect(page).toHaveURL(/.*\/unlock/);
    await expect(page.locator('h1')).toHaveText('Unlock Wallet');
  });

  test('should remain locked when navigating back then forward', async ({ page }) => {
    await completeSetup(page, 'password123');

    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/unlock');

    await page.goBack();
    await page.goForward();

    await expect(page).toHaveURL(/.*\/unlock/);
    await expect(page.locator('h1')).toHaveText('Unlock Wallet');
  });

  test('should remain locked when manually navigating to protected route', async ({ page }) => {
    await completeSetup(page, 'password123');
    await page.locator('button:has-text("Lock")').click();
    await page.waitForURL('**/unlock');

    await page.goto('/add');

    await expect(page).toHaveURL(/.*\/unlock/);
    await expect(page.locator('h1')).toHaveText('Unlock Wallet');
  });
});
