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
    test('should show password change form', async ({ page }) => {
      await setupWithPassword(page, 'testpassword123');

      await page.locator('button[aria-label="Menu"]').click();
      await page.locator('button:has-text("Security")').click();

      await page.waitForURL('**/#/security');

      // Should show Password section with change form
      await expect(page.locator('h2:has-text("Password")')).toBeVisible();
      await expect(page.locator('input#currentPassword')).toBeVisible();
      await expect(page.locator('input#newPassword')).toBeVisible();
      await expect(page.locator('input#confirmPassword')).toBeVisible();
      await expect(page.locator('button:has-text("Change Password")')).toBeVisible();
    });

    test('should change password successfully', async ({ page }) => {
      await setupWithPassword(page, 'oldpassword123');

      await page.locator('button[aria-label="Menu"]').click();
      await page.locator('button:has-text("Security")').click();

      await page.waitForURL('**/#/security');

      // Fill in password change form
      await page.locator('input#currentPassword').fill('oldpassword123');
      await page.locator('input#newPassword').fill('newpassword456');
      await page.locator('input#confirmPassword').fill('newpassword456');
      await page.locator('button:has-text("Change Password")').click();

      // Should navigate to success page
      await page.waitForURL('**/#/security/success');
      await expect(page.locator('p:has-text("Password changed successfully")')).toBeVisible();

      // Should redirect back to security page after 2 seconds
      await page.waitForURL('**/#/security', { timeout: 3000 });
    });

    test('should show error for incorrect current password', async ({ page }) => {
      await setupWithPassword(page, 'testpassword123');

      await page.locator('button[aria-label="Menu"]').click();
      await page.locator('button:has-text("Security")').click();

      await page.waitForURL('**/#/security');

      // Fill in form with wrong current password
      await page.locator('input#currentPassword').fill('wrongpassword');
      await page.locator('input#newPassword').fill('newpassword456');
      await page.locator('input#confirmPassword').fill('newpassword456');
      await page.locator('button:has-text("Change Password")').click();

      // Should show error and stay on page
      await expect(page.locator('p:has-text("Incorrect current password")')).toBeVisible();
      expect(page.url()).toContain('#/security');
    });

    test('should show inline error when new passwords do not match', async ({ page }) => {
      await setupWithPassword(page, 'testpassword123');

      await page.locator('button[aria-label="Menu"]').click();
      await page.locator('button:has-text("Security")').click();

      await page.waitForURL('**/#/security');

      // Fill in form with mismatched new passwords
      await page.locator('input#currentPassword').fill('testpassword123');
      await page.locator('input#newPassword').fill('newpassword456');
      await page.locator('input#confirmPassword').fill('differentpassword');

      // Should show inline error immediately and disable submit button
      await expect(page.locator('p:has-text("Passwords do not match")')).toBeVisible();

      // Button should be disabled due to validation error
      const button = page.locator('button:has-text("Change Password")');
      await expect(button).toBeDisabled();

      expect(page.url()).toContain('#/security');
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
