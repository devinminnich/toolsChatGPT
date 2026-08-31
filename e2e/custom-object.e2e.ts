import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel('Current renovation project')).toBeVisible();
});

test('creates a named custom object in the current view without requiring placement coordinates', async ({ page, isMobile }) => {
  await page.getByLabel('Units').selectOption('in');
  await page.getByRole('button', { name: isMobile ? '+ Object' : '+ Custom object', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Create custom object' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('X position')).toHaveCount(0);
  await expect(dialog.getByLabel('Y position')).toHaveCount(0);

  await dialog.getByLabel('Custom object name').fill('Linen cabinet');
  await dialog.getByLabel('Custom object width').fill('30');
  await dialog.getByLabel('Custom object depth').fill('18');
  await dialog.getByRole('button', { name: 'Create object' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Linen cabinet' })).toBeVisible();
  await expect(page.locator('.fixture.selected text').first()).toHaveText('Linen cabinet');

  const properties = page.locator('.properties-panel.is-open');
  await expect(properties.getByLabel('Width')).toHaveValue('30');
  await expect(properties.getByLabel('Depth')).toHaveValue('18');
  await expect(properties.getByText(/Drag this object on the drawing to place it/)).toBeVisible();
  await expect(properties.getByLabel('X position')).not.toBeVisible();
  await expect(properties.getByLabel('Y position')).not.toBeVisible();
  await properties.getByText('Precision', { exact: true }).click();
  await expect(properties.getByLabel('X position')).toBeVisible();
  await expect(properties.getByLabel('Y position')).toBeVisible();
});

test('requires a custom object name before creation', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: isMobile ? '+ Object' : '+ Custom object', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create custom object' });
  await dialog.getByRole('button', { name: 'Create object' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Give the object a name.');
  await expect(dialog).toBeVisible();
});
