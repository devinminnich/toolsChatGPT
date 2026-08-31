import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel('Current renovation project')).toBeVisible();
});

test('creates and switches to a new renovation project', async ({ page }) => {
  await page.getByRole('button', { name: '+ Project' }).click();
  await page.getByLabel('New project name').fill('Back Patio');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByLabel('Current renovation project').locator('option:checked')).toHaveText('Back Patio');
  await expect(page.getByText(/My House \/ Back Patio/)).toBeVisible();
});

test('branches Existing into Proposed and exposes project review', async ({ page }) => {
  await page.getByRole('button', { name: '+ Proposed option' }).click();
  await expect(page.getByRole('button', { name: 'Option A' })).toBeVisible();
  await page.getByRole('button', { name: 'Review project' }).click();
  await expect(page.getByRole('heading', { name: 'Existing → Option A' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Visual comparison' })).toBeVisible();
});

test('detects a proposed fixture addition and generates scope', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: '+ Proposed option' }).click();
  if (isMobile) {
    await page.getByRole('button', { name: '+ Object' }).click();
  } else {
    await page.getByRole('button', { name: '+ Shower' }).click();
  }
  await page.getByRole('button', { name: 'Review project' }).click();
  await expect(page.getByRole('heading', { name: 'Design changes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Suggested scope' })).toBeVisible();
});

test('downloads a dimensioned proposed-design PDF', async ({ page }) => {
  await page.getByRole('button', { name: '+ Proposed option' }).click();
  await page.getByRole('button', { name: 'Review project' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Proposed PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('design.pdf');
});
