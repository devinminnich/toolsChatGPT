import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel('Current renovation project')).toBeVisible();
});

test('adds a default window from the household object library', async ({ page, isMobile }) => {
  await page.getByLabel('Units').selectOption('in');

  if (isMobile) {
    await page.getByRole('button', { name: '+ Object', exact: true }).click();
    const library = page.getByRole('dialog', { name: 'Object library' });
    await expect(library).toBeVisible();
    await expect(library.locator('.object-group summary').filter({ hasText: 'Doors & windows' })).toBeVisible();
    await library.getByRole('button', { name: '+ Window · 36 in', exact: true }).click();
    await expect(library).toHaveCount(0);
  } else {
    await expect(page.locator('.object-group summary').filter({ hasText: 'Doors & windows' })).toBeVisible();
    await page.getByRole('button', { name: '+ Window · 36 in', exact: true }).click();
  }

  const properties = page.locator('.properties-panel.is-open');
  await expect(properties.getByRole('heading', { name: 'Window · 36 in' })).toBeVisible();
  await expect(properties.getByLabel('Width')).toHaveValue('36');
  await expect(properties.getByLabel('Depth')).toHaveValue('4');
});
