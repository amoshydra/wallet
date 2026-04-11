import { expect, test } from '@playwright/test';
import { setupWithPassword } from './helpers/auth';

test.describe('Card Delete', () => {
  test.beforeEach(async ({ page }) => {
    await setupWithPassword(page, 'testpassword123');
  });

  test('should delete a card successfully', async ({ page }) => {
    // Add a test card
    await page.locator('.fab').click();
    await page.waitForURL('**/#/add');

    await page.locator('#name').fill('Card to Delete');
    await page.locator('#number').fill('1234567890');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/#/');
    await expect(page.locator('.card-item')).toHaveCount(1);
    await expect(page.locator('.card-name')).toHaveText('Card to Delete');

    // Navigate to card detail
    await page.locator('.card-item').click();
    await page.waitForURL(/.*#\/card\/.*/);

    // Click delete button
    await page.locator('button:has-text("Delete Card")').click();

    // Confirm delete in modal
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    // Should navigate back to home
    await page.waitForURL('**/#/');

    // Verify card is deleted
    await expect(page.locator('.card-item')).toHaveCount(0);
    await expect(page.locator('.empty-state')).toContainText('No cards yet');
  });

  test('should cancel delete and keep card', async ({ page }) => {
    // Add a test card
    await page.locator('.fab').click();
    await page.waitForURL('**/#/add');

    await page.locator('#name').fill('Card to Keep');
    await page.locator('#number').fill('9876543210');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('**/#/');

    // Navigate to card detail
    await page.locator('.card-item').click();
    await page.waitForURL(/.*#\/card\/.*/);

    // Click delete button
    await page.locator('button:has-text("Delete Card")').click();

    // Cancel delete
    await page.locator('button:has-text("Cancel")').click();

    // Should still be on card detail page
    await expect(page.locator('h2')).toHaveText('Card to Keep');

    // Navigate back to home
    await page.locator('button:has-text("Back")').click();
    await page.waitForURL('**/#/');

    // Verify card still exists
    await expect(page.locator('.card-item')).toHaveCount(1);
    await expect(page.locator('.card-name')).toHaveText('Card to Keep');
  });

  test('should delete correct card when multiple cards exist', async ({ page }) => {
    // Add first card
    await page.locator('.fab').click();
    await page.waitForURL('**/#/add');
    await page.locator('#name').fill('First Card');
    await page.locator('#number').fill('1111111111');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/#/');

    // Add second card
    await page.locator('.fab').click();
    await page.waitForURL('**/#/add');
    await page.locator('#name').fill('Second Card');
    await page.locator('#number').fill('2222222222');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/#/');

    // Verify both cards exist
    await expect(page.locator('.card-item')).toHaveCount(2);

    // Delete the first card
    await page.locator('.card-item', { hasText: 'First Card' }).click();
    await page.waitForURL(/.*#\/card\/.*/);
    await page.locator('button:has-text("Delete Card")').click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await page.waitForURL('**/#/');

    // Verify only second card remains
    await expect(page.locator('.card-item')).toHaveCount(1);
    await expect(page.locator('.card-name')).toHaveText('Second Card');
  });

  test('should persist delete after page reload', async ({ page }) => {
    // Add a test card
    await page.locator('.fab').click();
    await page.waitForURL('**/#/add');
    await page.locator('#name').fill('Card to Delete');
    await page.locator('#number').fill('5555555555');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/#/');

    // Delete the card
    await page.locator('.card-item').click();
    await page.waitForURL(/.*#\/card\/.*/);
    await page.locator('button:has-text("Delete Card")').click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL('**/#/');

    // Verify card is deleted
    await expect(page.locator('.card-item')).toHaveCount(0);

    // Reload page
    await page.reload();
    await page.waitForURL('**/#/unlock');

    // Unlock wallet
    await page.locator('input[type="password"]').fill('testpassword123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/#/');

    // Verify card is still deleted after reload
    await expect(page.locator('.card-item')).toHaveCount(0);
  });
});
