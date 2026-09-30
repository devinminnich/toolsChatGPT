import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
test("Excel upload reviews before saving and persists once", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  const settings = () =>
    page
      .locator("nav:visible")
      .getByRole("button", { name: "Settings", exact: false })
      .click();
  await settings();
  await expect(
    page.getByRole("link", { name: "Download Excel template" }),
  ).toBeVisible();
  const upload = () =>
    page
      .getByLabel("Upload completed template")
      .setInputFiles(
        fileURLToPath(
          new URL("./fixtures/import-workout.xlsx", import.meta.url),
        ),
      );
  await upload();
  await expect(
    page.getByRole("heading", { name: "Spreadsheet session" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel import", exact: true })
    .click();
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "History", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Spreadsheet session" }),
  ).toHaveCount(0);
  await settings();
  await upload();
  await page
    .getByRole("button", { name: "Add to history", exact: true })
    .click();
  await expect(
    page.getByText("Workout added to your history.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await settings();
  await upload();
  await page
    .getByRole("button", { name: "Add to history", exact: true })
    .click();
  await expect(
    page.getByText("This workout is already in your history.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Spreadsheet session", exact: true })
    .click();
  await expect(
    page.getByText("Set 1: 20.5 lb × 12 reps", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("create, log, recover and finish a workout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("First name").fill("Devin");
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Build a workout", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Search exercises" })
    .fill("legpress");
  await expect(
    page.getByRole("button", { name: "Add Seated leg press", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add Seated leg press", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Workout name" }).fill("Leg day");
  await page
    .getByRole("spinbutton", { name: "Weight (lb)", exact: true })
    .fill("160");
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  await page.reload();
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "Train", exact: false })
    .click();
  await expect(page.getByRole("textbox", { name: "Workout name" })).toHaveValue(
    "Leg day",
  );
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "reps", exact: true })
    .first()
    .fill("15");
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Easy", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "✓ Logged", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("spinbutton", { name: "reps", exact: true }).first(),
  ).toHaveValue("15");
  await expect(page.getByLabel("Rest timer")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Easy", exact: true }),
  ).toHaveClass(/selected/);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("REST PAUSED", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/${test.info().project.name}-session.png`,
    fullPage: true,
  });
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Leg day", exact: true }),
  ).toBeVisible();
  await page.getByRole("heading", { name: "Leg day", exact: true }).click();
  await expect(
    page.getByText("Set 1: 160 lb × 15 reps · Easy", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("custom exercises survive reload and filters stay deterministic", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "Train", exact: false })
    .click();
  await page
    .getByRole("button", { name: "+ Custom exercise", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Name", { exact: true }).fill("My cable movement");
  await form.getByLabel("Equipment", { exact: true }).selectOption("Cable");
  await form
    .getByLabel("Instructions", { exact: true })
    .fill("Use controlled movement.");
  await form
    .getByRole("button", { name: "Save exercise", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  await page.reload();
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "Train", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Search exercises" })
    .fill("My cable");
  await expect(
    page.getByRole("button", { name: "Add My cable movement", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Equipment filter").selectOption("Dumbbell");
  await expect(
    page.getByText("No matches yet.", { exact: true }),
  ).toBeVisible();
});

test("a workout link adds history once and preserves existing workouts", async ({
  page,
}) => {
  const { encodeWorkoutImport } = await import("../src/domain/importWorkout");
  const token = encodeWorkoutImport({
    v: 1,
    id: "link-import-test",
    date: "2026-09-30",
    name: "Imported session",
    unit: "lb",
    exercises: [
      [
        "dumbbell-lateral-raise",
        [
          [20.5, 12],
          [20.5, 10],
        ],
      ],
    ],
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await page.goto(`/#workout=${token}`);
  await expect(
    page.getByText("Workout added to your history.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Imported session", exact: true })
    .click();
  await expect(
    page.getByText("Set 1: 20.5 lb × 12 reps", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("2026-09-30 · Imported · Duration not recorded", {
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(`/#workout=${token}`);
  await expect(
    page.getByText("This workout is already in your history.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Imported session", exact: true }),
  ).toHaveCount(1);
  await page.reload();
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "History", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Imported session", exact: true }),
  ).toHaveCount(1);
});
