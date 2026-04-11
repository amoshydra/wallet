import { expect, test } from '@playwright/test';
import { setupWithPassword, setupWithPasskey } from './helpers/auth';

test.describe('Security Page', () => {
  test.describe('Quick Unlock Section', () => {
    test('should show Set Up Passkey button when passkey is supported but not set up', async ({
      page,
    }) => {
      // Mock passkey availability before setup
      await page.addInitScript(() => {
        if (!window.PublicKeyCredential) {
          (window as unknown as Record<string, unknown>).PublicKeyCredential =
            class PublicKeyCredential {
              static async isUserVerifyingPlatformAuthenticatorAvailable() {
                return true;
              }
            };
        }
        const OriginalPKC = window.PublicKeyCredential;
        (window as unknown as Record<string, unknown>).PublicKeyCredential = class extends (
          OriginalPKC
        ) {
          static async isUserVerifyingPlatformAuthenticatorAvailable() {
            return true;
          }
        };
      });

      await setupWithPassword(page, 'testpassword123');

      // Open menu and navigate to Security
      await page.locator('button[aria-label="Menu"]').click();
      await page.locator('button:has-text("Security")').click();

      await page.waitForURL('**/#/security');
      await expect(page.locator('h1')).toHaveText('Security');

      // Should show Quick Unlock section with setup button
      await expect(page.locator('h2:has-text("Quick Unlock")')).toBeVisible();
      await expect(page.locator('button:has-text("Set Up Passkey")')).toBeVisible();
      await expect(page.locator('p:has-text("Set up a passkey for faster access")')).toBeVisible();
    });

    test('should show enabled message when passkey is already set up', async ({ page }) => {
      await setupWithPasskey(page, 'testpassword123');

      // Open menu and navigate to Security
      await page.locator('button[aria-label="Menu"]').click();
      await page.locator('button:has-text("Security")').click();

      await page.waitForURL('**/#/security');

      // Should show enabled message
      await expect(page.locator('h2:has-text("Quick Unlock")')).toBeVisible();
      await expect(page.locator('p:has-text("Quick Unlock is enabled")')).toBeVisible();
      await expect(page.locator('button:has-text("Set Up Passkey")')).not.toBeVisible();
    });

    test('should navigate back to home when clicking Back', async ({ page }) => {
      await setupWithPassword(page, 'testpassword123');

      await page.locator('button[aria-label="Menu"]').click();
      await page.locator('button:has-text("Security")').click();

      await page.waitForURL('**/#/security');

      // Click back button
      await page.locator('button:has-text("Back")').click();
      await page.waitForURL('**/#/');

      await expect(page.locator('h1')).toHaveText('My Cards');
    });
  });

  test.describe('Password Section', () => {
    test('should show password section with coming soon message', async ({ page }) => {
      await setupWithPassword(page, 'testpassword123');

      await page.locator('button[aria-label="Menu"]').click();
      await page.locator('button:has-text("Security")').click();

      await page.waitForURL('**/#/security');

      // Should show Password section
      await expect(page.locator('h2:has-text("Password")')).toBeVisible();
      await expect(page.locator('p:has-text("Change password coming soon")')).toBeVisible();
    });
  });

  test.describe('Menu Integration', () => {
    test('should show Security menu item in dropdown', async ({ page }) => {
      await setupWithPassword(page, 'testpassword123');

      await page.locator('button[aria-label="Menu"]').click();

      // Should show Security as first item
      const menuItems = await page.locator('.dropdown-item').allTextContents();
      expect(menuItems[0]).toBe('Security');
      expect(menuItems[1]).toBe('Export');
      expect(menuItems[2]).toBe('Import');
    });
  });
});
