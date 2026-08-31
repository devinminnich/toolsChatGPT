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

test('creates a second home with an isolated first project and switches back', async ({ page }) => {
  await page.getByRole('button', { name: '+ Home' }).click();
  await page.getByLabel('New home name').fill('Cabin');
  await page.getByLabel('First project name').fill('Kitchen');
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  await expect(page.getByLabel('Current home').locator('option:checked')).toHaveText('Cabin');
  await expect(page.getByLabel('Current renovation project').locator('option:checked')).toHaveText('Kitchen');
  await expect(page.getByText(/Cabin \/ Kitchen/)).toBeVisible();

  await page.getByLabel('Current home').selectOption({ label: 'My House' });
  await expect(page.getByLabel('Current renovation project').locator('option:checked')).toHaveText('Primary Bathroom');
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

test('supports exact fixture position rotation and duplication', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: '+ Proposed option' }).click();
  if (isMobile) await page.getByRole('button', { name: '+ Object' }).click();
  else await page.getByRole('button', { name: '+ Shower' }).click();

  await page.getByLabel('Units').selectOption('in');
  const x = page.getByLabel('X position');
  const y = page.getByLabel('Y position');
  const rotation = page.getByLabel('Rotation (degrees)');
  await x.fill('10');
  await x.blur();
  await y.fill('20');
  await y.blur();
  await rotation.fill('45');
  await rotation.blur();

  await expect(page.getByLabel('X position')).toHaveValue('10');
  await expect(page.getByLabel('Y position')).toHaveValue('20');
  await expect(page.getByLabel('Rotation (degrees)')).toHaveValue('45');

  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(page.getByLabel('X position')).toHaveValue('12');
  await expect(page.getByLabel('Y position')).toHaveValue('22');
});

test('downloads a dimensioned proposed-design PDF', async ({ page }) => {
  await page.getByRole('button', { name: '+ Proposed option' }).click();
  await page.getByRole('button', { name: 'Review project' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Proposed PDF' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('design.pdf');
});

test('reports offline mode without losing the loaded project', async ({ page }) => {
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  await expect(page.getByText(/stored on this device/i)).toBeVisible();
  await expect(page.getByLabel('Current renovation project')).toBeVisible();
});

test('undo restores the previous saved workspace state', async ({ page }) => {
  await page.getByRole('button', { name: '+ Project' }).click();
  await page.getByLabel('New project name').fill('Undo Test');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByLabel('Current renovation project').locator('option:checked')).toHaveText('Undo Test');
  const undo = page.getByRole('button', { name: 'Undo last saved edit' });
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect(page.getByLabel('Current renovation project').locator('option:checked')).toHaveText('Primary Bathroom');
});
