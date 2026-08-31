import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel('Current renovation project')).toBeVisible();
});

test('keeps the room locked in design mode and exposes drawing only through Edit room', async ({ page }) => {
  await expect(page.locator('.vertex-handle')).toHaveCount(0);
  await expect(page.locator('.wall-line').first()).toHaveCSS('pointer-events', 'none');

  await page.getByRole('button', { name: 'Edit room' }).click();
  await page.getByRole('button', { name: 'Design custom shape' }).click();
  await expect(page.locator('.design-canvas')).toHaveClass(/room-editing/);
  await expect(page.locator('.vertex-handle')).toHaveCount(4);

  await page.getByRole('button', { name: 'Redraw', exact: true }).click();
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
