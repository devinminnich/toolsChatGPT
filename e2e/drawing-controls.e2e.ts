import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel('Current renovation project')).toBeVisible();
});

test('sets the room boundary when the project is created and keeps it locked in design mode', async ({ page }) => {
  await page.getByRole('button', { name: '+ Project' }).click();
  await page.getByLabel('New project name').fill('Measured Room');
  await page.getByLabel('Room width in inches').fill('172');
  await page.getByLabel('Room depth in inches').fill('92');
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page.getByLabel('Current renovation project').locator('option:checked')).toHaveText('Measured Room');
  await page.getByLabel('Units').selectOption('in');
  await expect(page.locator('.canvas-toolbar')).toContainText('172 in × 92 in envelope');

  await expect(page.locator('.vertex-handle').first()).toBeHidden();
  const wall = page.locator('.wall-line').first();
  await expect(wall).toHaveCSS('pointer-events', 'none');
});
