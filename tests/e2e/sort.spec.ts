import { expect, test } from '@playwright/test';
import { completeSetup } from './helpers/db';

test.describe('Sort Feature', () => {
  test.beforeEach(async ({ page }) => {
    await completeSetup(page, 'password123');
  });

  test('should show sort dropdown with default option', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('My Cards');

    const sortButton = page.locator('button[aria-label="Sort"]');
    await expect(sortButton).toBeVisible();

    await sortButton.click();
    await expect(page.locator('.dropdown-menu')).toBeVisible();
    await expect(page.locator('button:has-text("✓ Recently viewed")')).toBeVisible();
    await expect(page.locator('button:has-text("Name (A→Z)")')).toBeVisible();
    await expect(page.locator('button:has-text("Created (newest first)")')).toBeVisible();
    await expect(page.locator('button:has-text("Created (oldest first)")')).toBeVisible();
  });

  test('should sort cards by name ascending', async ({ page }) => {
    await addCard(page, 'Zebra Card', '1111111111');
    await addCard(page, 'Alpha Card', '2222222222');
    await addCard(page, 'Middle Card', '3333333333');

    await page.locator('button[aria-label="Sort"]').click();
    await page.locator('button:has-text("Name (A→Z)")').click();

    const cardNames = await page.locator('.card-name').allTextContents();
    expect(cardNames).toEqual(['Alpha Card', 'Middle Card', 'Zebra Card']);
  });

  test('should sort cards by created time descending (newest first)', async ({ page }) => {
    await addCard(page, 'First Card', '1111111111');
    await addCard(page, 'Second Card', '2222222222');
    await addCard(page, 'Third Card', '3333333333');

    await page.locator('button[aria-label="Sort"]').click();
    await page.locator('button:has-text("Created (newest first)")').click();

    const cardNames = await page.locator('.card-name').allTextContents();
    expect(cardNames).toEqual(['Third Card', 'Second Card', 'First Card']);
  });

  test('should sort cards by created time ascending (oldest first)', async ({ page }) => {
    await addCard(page, 'First Card', '1111111111');
    await addCard(page, 'Second Card', '2222222222');
    await addCard(page, 'Third Card', '3333333333');

    await page.locator('button[aria-label="Sort"]').click();
    await page.locator('button:has-text("Created (oldest first)")').click();

    const cardNames = await page.locator('.card-name').allTextContents();
    expect(cardNames).toEqual(['First Card', 'Second Card', 'Third Card']);
  });

  test('should sort by recently viewed by default and update on card view', async ({ page }) => {
    await addCard(page, 'Card A', '1111111111');
    await addCard(page, 'Card B', '2222222222');
    await addCard(page, 'Card C', '3333333333');

    let cardNames = await page.locator('.card-name').allTextContents();
    expect(cardNames).toEqual(['Card C', 'Card B', 'Card A']);

    await page.locator('.card-item').nth(2).click();
    await page.locator('button:has-text("Back")').click();

    cardNames = await page.locator('.card-name').allTextContents();
    expect(cardNames).toEqual(['Card A', 'Card C', 'Card B']);
  });

  test('should persist sort preference after reload', async ({ page }) => {
    await addCard(page, 'First Card', '1111111111');
    await addCard(page, 'Second Card', '2222222222');

    await page.locator('button[aria-label="Sort"]').click();
    await page.locator('button:has-text("Name (A→Z)")').click();

    let cardNames = await page.locator('.card-name').allTextContents();
    expect(cardNames).toEqual(['First Card', 'Second Card']);

    await page.reload();
    await page.locator('input[type="password"]').fill('password123');
    await page.locator('button:has-text("Unlock")').click();
    await expect(page.locator('h1')).toHaveText('My Cards');

    cardNames = await page.locator('.card-name').allTextContents();
    expect(cardNames).toEqual(['First Card', 'Second Card']);

    await page.locator('button[aria-label="Sort"]').click();
    await expect(page.locator('button:has-text("✓ Name (A→Z)")')).toBeVisible();
  });
});

async function addCard(page: import('@playwright/test').Page, name: string, number: string) {
  await page.locator('.fab').first().click();
  await page.waitForURL('**/add');
  await page.locator('input[name="name"], #name, input').first().fill(name);
  await page.locator('input[name="number"], #number, input').nth(1).fill(number);
  await page.locator('button:has-text("Save")').click();
  await page.waitForURL('**/');
}
