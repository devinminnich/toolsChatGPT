import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel('Current renovation project')).toBeVisible();
});

test('undoes and clears drawn wall segments', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: isMobile ? 'Draw' : 'Draw walls', exact: true }).click();

  const canvas = page.locator('.design-canvas');
  await canvas.click({ position: { x: 90, y: 120 } });
  await canvas.click({ position: { x: 180, y: 120 } });
  await expect(page.locator('.draft-shape circle')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Undo line' })).toBeEnabled();

  await page.getByRole('button', { name: 'Undo line' }).click();
  await expect(page.locator('.draft-shape circle')).toHaveCount(1);

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.locator('.draft-shape')).toHaveCount(0);
});
