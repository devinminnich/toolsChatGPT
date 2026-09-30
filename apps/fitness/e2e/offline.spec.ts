import { expect, test } from "@playwright/test";
test("production shell and active session reopen offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Build a workout", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Search exercises" })
    .fill("dumbbell chest");
  await page
    .getByRole("button", { name: "Add Dumbbell bench press", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  // Reload online first to guarantee the installed service worker controls the page.
  await page.reload();
  await expect(
    page.getByRole("button", { name: "✓ Logged", exact: true }),
  ).toHaveCount(1);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "✓ Logged", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  await expect(
    page.getByRole("button", { name: "✓ Logged", exact: true }),
  ).toHaveCount(2);
});
