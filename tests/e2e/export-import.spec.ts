import { expect, test } from '@playwright/test';
import { completeSetup, clearIndexedDB } from './helpers/db';

test.describe('Export/Import Feature', () => {
  test.beforeEach(async ({ page }) => {
    await completeSetup(page, 'password123');
  });

  test('should show export modal when clicking Export', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('My Cards');
    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Export")').click();

    await expect(page.locator('h3:has-text("Export Cards")')).toBeVisible();
    await expect(page.locator('text=Preview (CSV format):')).toBeVisible();
    await expect(page.locator('text=Export Password (optional)')).toBeVisible();
    await expect(
      page.locator('text=This password is separate from your app password'),
    ).toBeVisible();
    await expect(page.locator('button:has-text("Download ZIP")')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('should show import modal when clicking Import', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('My Cards');
    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Import")').click();

    await expect(page.locator('h3:has-text("Import Cards")')).toBeVisible();
    await expect(page.locator('text=Select ZIP File')).toBeVisible();
    await expect(page.locator('text=Password (if encrypted)')).toBeVisible();
    await expect(page.locator('button:has-text("Preview Import")')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('should close export modal when clicking Cancel', async ({ page }) => {
    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Export")').click();
    await expect(page.locator('h3:has-text("Export Cards")')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('h3:has-text("Export Cards")')).not.toBeVisible();
  });

  test('should close import modal when clicking Cancel', async ({ page }) => {
    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Import")').click();
    await expect(page.locator('h3:has-text("Import Cards")')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('h3:has-text("Import Cards")')).not.toBeVisible();
  });

  test('should export cards as unencrypted ZIP', async ({ page }) => {
    await addCard(page, 'Test Card 1', '1234567890');
    await addCard(page, 'Test Card 2', '9876543210');

    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Export")').click();

    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Download ZIP")').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/wallet-export-\d{4}-\d{2}-\d{2}\.zip/);
  });

  test('should export cards as encrypted ZIP with password', async ({ page }) => {
    await addCard(page, 'Encrypted Card', '111222333');

    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Export")').click();

    await page.getByLabel('Export Password (optional)').fill('exportpass');
    await page.getByLabel('Confirm Password').fill('exportpass');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Download ZIP")').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/wallet-export-\d{4}-\d{2}-\d{2}\.zip/);
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await addCard(page, 'Test Card', '1234567890');

    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Export")').click();

    await page.getByLabel('Export Password (optional)').fill('password1');
    await page.getByLabel('Confirm Password').fill('password2');

    await page.locator('button:has-text("Download ZIP")').click();

    await expect(page.locator('.error')).toHaveText('Passwords do not match');
  });

  test('should show error for non-ZIP file on import', async ({ page }) => {
    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Import")').click();

    const fileContent = 'not a zip file';
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(fileContent),
      });

    await expect(page.locator('.error')).toHaveText('Please select a ZIP file');
  });

  test('should import cards from unencrypted export', async ({ page }) => {
    await addCard(page, 'Exported Card 1', '1111111111');
    await addCard(page, 'Exported Card 2', '2222222222');

    const zipBuffer = await exportAndGetZipBuffer(page);

    await clearIndexedDB(page);
    await page.reload();
    await completeSetup(page, 'newpassword123');

    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Import")').click();

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'import.zip',
      mimeType: 'application/zip',
      buffer: zipBuffer,
    });

    await page.locator('button:has-text("Preview Import")').click();

    await page.waitForSelector('.import-card-name', { timeout: 5000 });
    const importNames = await page.locator('.import-card-name').allTextContents();
    expect(importNames).toContain('Exported Card 1');
    expect(importNames).toContain('Exported Card 2');

    await page.locator('button:has-text("Import 2 Cards")').click();

    await page.waitForSelector('.card-item', { timeout: 5000 });
    const cards = await page.locator('.card-item').count();
    expect(cards).toBe(2);

    const cardNames = await page.locator('.card-name').allTextContents();
    expect(cardNames).toContain('Exported Card 1');
    expect(cardNames).toContain('Exported Card 2');
  });

  test('should import cards with password from encrypted export', async ({ page }) => {
    await addCard(page, 'Secret Card', '9999999999');

    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Export")').click();

    await page.getByLabel('Export Password (optional)').fill('mysecretpass');
    await page.getByLabel('Confirm Password').fill('mysecretpass');

    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Download ZIP")').click();
    const download = await downloadPromise;

    const fs = await import('fs');
    const path = await download.path();
    const zipBuffer = fs.readFileSync(path!);

    await clearIndexedDB(page);
    await page.reload();
    await completeSetup(page, 'newpassword123');

    await page.locator('button[aria-label="Menu"]').click();
    await page.locator('.dropdown-item:has-text("Import")').click();

    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'import.zip',
      mimeType: 'application/zip',
      buffer: zipBuffer,
    });

    await page.getByLabel('Password (if encrypted)').fill('mysecretpass');

    await page.locator('button:has-text("Preview Import")').click();

    await expect(page.locator('.import-card-name').first()).toHaveText('Secret Card');

    await page.locator('button:has-text("Import 1 Card")').click();

    await page.waitForSelector('.card-item', { timeout: 5000 });
    await expect(page.locator('.card-name').first()).toHaveText('Secret Card');
  });
});

async function addCard(page: import('@playwright/test').Page, name: string, number: string) {
  await page.locator('.fab, button:has-text("Add")').first().click();
  await page.waitForURL('**/add');
  await page.locator('input[name="name"], #name, input').first().fill(name);
  await page.locator('input[name="number"], #number, input').nth(1).fill(number);
  await page.locator('button:has-text("Save")').click();
  await page.waitForURL('**/');
}

async function exportAndGetZipBuffer(page: import('@playwright/test').Page): Promise<Buffer> {
  await page.locator('button[aria-label="Menu"]').click();
  await page.locator('.dropdown-item:has-text("Export")').click();

  const downloadPromise = page.waitForEvent('download');
  await page.locator('button:has-text("Download ZIP")').click();
  const download = await downloadPromise;

  const fs = await import('fs');
  const path = await download.path();
  return fs.readFileSync(path!);
}
