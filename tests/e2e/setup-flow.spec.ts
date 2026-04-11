import { expect, test } from '@playwright/test';
import { clearIndexedDB, completeSetup } from './helpers/db';

test.describe('Setup Flow', () => {
  test('should show setup page when IndexedDB is empty', async ({ page }) => {
    await page.goto('/');
    await clearIndexedDB(page);
    await page.reload();
    await page.waitForURL('**/setup');
    await expect(page.locator('h1')).toHaveText('Choose Your Security');
  });

  test('should show error for mismatched passwords', async ({ page }) => {
    await page.goto('/');
    await clearIndexedDB(page);
    await page.reload();
    await page.waitForURL('**/setup');

    const passwordOnlyButton = page.locator('button:has-text("Password Only")');
    const setUpPasswordButton = page.locator('button:has-text("Set Up Password")');

    if (await passwordOnlyButton.isVisible()) {
      await passwordOnlyButton.click();
    } else if (await setUpPasswordButton.isVisible()) {
      await setUpPasswordButton.click();
    }

    await page.waitForSelector('#password', { state: 'visible' });

    await page.locator('#password').fill('password123');
    await page.locator('#confirm').fill('different123');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.error')).toHaveText('Passwords do not match');
  });

  test('should proceed to home page when setup is completed', async ({ page }) => {
    await completeSetup(page, 'password123');

    await expect(page).toHaveURL(/.*#\/$/);
    await expect(page.locator('h1')).toHaveText('My Cards');
    await expect(page.locator('.empty-state')).toContainText('No cards yet');
  });
});
