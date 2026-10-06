import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
test("short shoulder workout link saves preset weights and warm-ups once and survives reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?plan=shoulders-biceps-2026-10-05");
  await expect(
    page.getByText("Routine saved. Review your weights before starting.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Shoulders + Biceps - 45 min",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(
    page.getByLabel("Weight (lb) for Seated dumbbell shoulder press set 1", {
      exact: true,
    }),
  ).toHaveValue("30");
  await expect(
    page
      .getByLabel("Weight (lb) for Dumbbell lateral raise set 1", {
        exact: true,
      })
      .first(),
  ).toHaveValue("5");
  await expect(
    page
      .getByLabel("Set type for Dumbbell lateral raise set 1", { exact: true })
      .first(),
  ).toHaveValue("Warm-up");
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
  await page.goto("/?plan=shoulders-biceps-2026-10-05");
  await expect(
    page.getByText("This routine is already saved.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Shoulders + Biceps - 45 min",
      exact: true,
    }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "lb", exact: true }).nth(2),
  ).toHaveValue("30");
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "lb", exact: true }).nth(2),
  ).toHaveValue("30");
  expect(errors).toEqual([]);
});
test("deleting a stored workout keeps its history after reload and cancellation keeps the routine", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Build a workout", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Search exercises" })
    .fill("legpress");
  await page
    .getByRole("button", { name: "Add Seated leg press", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Workout name" })
    .fill("Delete test routine");
  await page
    .getByLabel("Weight (lb) for Seated leg press set 1", { exact: true })
    .fill("160");
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .first()
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "Train", exact: false })
    .click();
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "Delete Delete test routine", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start workout", exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete Delete test routine", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start workout", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "Train", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Start workout", exact: true }),
  ).toHaveCount(0);
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "History", exact: false })
    .click();
  await page
    .getByRole("heading", { name: "Delete test routine", exact: true })
    .click();
  await expect(
    page.getByText("Set 1: 160 lb × 10 reps", { exact: true }),
  ).toBeVisible();
});
test("warm-up weights and returning an active workout preserve progress after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Build a workout", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Search exercises" })
    .fill("legpress");
  await page
    .getByRole("button", { name: "Add Seated leg press", exact: true })
    .click();
  const weight = page.getByLabel("Weight (lb) for Seated leg press set 1", {
    exact: true,
  });
  const type = page.getByLabel("Set type for Seated leg press set 1", {
    exact: true,
  });
  await weight.fill("160");
  await type.selectOption("Warm-up");
  await expect(weight).toHaveValue("80");
  await type.selectOption("Working");
  await expect(weight).toHaveValue("160");
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page
    .getByLabel("Set type for Seated leg press set 1", { exact: true })
    .selectOption("Warm-up");
  await expect(
    page.getByRole("spinbutton", { name: "lb", exact: true }).first(),
  ).toHaveValue("80");
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Back to workouts", exact: true })
    .click();
  await expect(page.getByLabel("Rest timer", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Resume workout", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Resume workout", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "✓ Logged", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("spinbutton", { name: "lb", exact: true }).first(),
  ).toHaveValue("80");
  await page
    .getByLabel("Set type for Seated leg press set 1", { exact: true })
    .selectOption("Working");
  await expect(
    page.getByRole("spinbutton", { name: "lb", exact: true }).first(),
  ).toHaveValue("80");
});
test("auto-adjust toggle applies difficulty immediately and does not stack changes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Primary goal", { exact: true })
    .selectOption("Strength");
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Build a workout", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Search exercises" })
    .fill("legpress");
  await page
    .getByRole("button", { name: "Add Seated leg press", exact: true })
    .click();
  for (const n of [1, 2, 3])
    await page
      .getByLabel(`Weight (lb) for Seated leg press set ${n}`, { exact: true })
      .fill("100");
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await page.getByLabel("Auto-adjust next set", { exact: true }).check();
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Easy", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "lb", exact: true }).nth(1),
  ).toHaveValue("102.5");
  await page.getByRole("button", { name: "Easy", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", { name: "lb", exact: true }).nth(1),
  ).toHaveValue("102.5");
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(
    page.getByLabel("Auto-adjust next set", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("spinbutton", { name: "lb", exact: true }).nth(1),
  ).toHaveValue("102.5");
  await expect(
    page.getByRole("spinbutton", { name: "lb", exact: true }).first(),
  ).toHaveValue("100");
});
test("routine link saves a future plan with rep and time ranges", async ({
  page,
}) => {
  const { encodeWorkoutImport } = await import("../src/domain/importWorkout");
  const token = encodeWorkoutImport({
    v: 1,
    id: "routine-link-test",
    date: "2026-10-01",
    name: "Future routine",
    unit: "lb",
    exercises: [
      ["dumbbell-bench-press", 3, 8, 12],
      ["plank", 2, 30, 45],
    ],
  } as never);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await page.goto(`/#routine=${token}`);
  await expect(
    page.getByText("Routine saved. Set your working weights before starting.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("2 exercises · 5 sets · Planned for 2026-10-01", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(
    page.getByText("Target: 8–12 reps", { exact: true }),
  ).toHaveCount(3);
  await expect(
    page.getByText("Target: 30–45 seconds", { exact: true }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(
    page.getByText("Target: 30–45 seconds", { exact: true }),
  ).toHaveCount(2);
  await page.reload();
  await expect(
    page.getByText("Target: 8–12 reps", { exact: true }),
  ).toHaveCount(3);
});
test("timer stays pinned and coach adapts only the next unfinished set", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Build a workout", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Search exercises" })
    .fill("legpress");
  await page
    .getByRole("button", { name: "Add Seated leg press", exact: true })
    .click();
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  const timer = page.getByLabel("Rest timer", { exact: true });
  await expect(timer).toBeVisible();
  const dock = page.locator(".workout-dock");
  const initialTop = (await dock.boundingBox())!.y;
  expect(initialTop).toBeLessThanOrEqual(10);
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .first()
    .click();
  const countdown = timer.locator("strong");
  const before = await countdown.textContent();
  await expect
    .poll(() => countdown.textContent(), { timeout: 4000 })
    .not.toBe(before);
  await timer.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await countdown.textContent();
  await page.waitForTimeout(1200);
  await expect(countdown).toHaveText(paused!);
  await timer.getByRole("button", { name: "Resume", exact: true }).click();
  await expect
    .poll(() => countdown.textContent(), { timeout: 4000 })
    .not.toBe(paused);
  await page.getByRole("button", { name: "Easy", exact: true }).click();
  await page.getByRole("button", { name: "Coach & chat", exact: true }).click();
  await page
    .getByRole("button", { name: "Apply to next set", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "reps", exact: true }).nth(1),
  ).toHaveValue("11");
  await page
    .getByLabel("Question for your coach", { exact: true })
    .fill("What should I do next?");
  await page.getByText("Workout context to share", { exact: true }).click();
  await expect(page.getByLabel("Workout context for ChatGPT")).toHaveValue(
    /Easy/,
  );
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  );
  expect((await dock.boundingBox())!.y).toBeCloseTo(initialTop, 0);
  await expect(
    page.getByRole("textbox", { name: "Question for your coach", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close coach", exact: true }).click();
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .last()
    .scrollIntoViewIfNeeded();
  const bounds = await timer.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThan(page.viewportSize()!.height);
  await page.screenshot({
    path: `test-results/${test.info().project.name}-pinned-coach.png`,
  });
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(
    page.getByRole("spinbutton", { name: "reps", exact: true }).nth(1),
  ).toHaveValue("11");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("independent routine sets retain targets and types into the active workout", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start training", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Build a workout", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Search exercises" })
    .fill("legpress");
  await page
    .getByRole("button", { name: "Add Seated leg press", exact: true })
    .click();
  for (const [index, weight, reps, type] of [
    [1, 160, 15, "Warm-up"],
    [2, 190, 12, "Working"],
    [3, 150, 8, "Drop"],
  ] as const) {
    await page
      .getByLabel(`Weight (lb) for Seated leg press set ${index}`, {
        exact: true,
      })
      .fill(String(weight));
    await page
      .getByLabel(`Reps for Seated leg press set ${index}`, { exact: true })
      .fill(String(reps));
    await page
      .getByLabel(`Set type for Seated leg press set ${index}`, { exact: true })
      .selectOption(type);
  }
  await page.screenshot({
    path: `test-results/${test.info().project.name}-routine.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add set", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove Seated leg press set 4", exact: true })
    .click();
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "Train", exact: false })
    .click();
  await expect(
    page.getByLabel("Weight (lb) for Seated leg press set 2", { exact: true }),
  ).toHaveValue("190");
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(
    page.getByLabel("Set type for Seated leg press set 3", { exact: true }),
  ).toHaveValue("Drop");
  await page.getByRole("button", { name: "Save workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start workout", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", { name: "lb", exact: true }).nth(1),
  ).toHaveValue("190");
  await expect(
    page.getByRole("spinbutton", { name: "reps", exact: true }).nth(2),
  ).toHaveValue("8");
  await page
    .getByLabel("Set type for Seated leg press set 1", { exact: true })
    .selectOption("Drop");
  await page
    .getByRole("button", { name: "Complete set", exact: true })
    .first()
    .click();
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await expect(
    page.getByLabel("Set type for Seated leg press set 1", { exact: true }),
  ).toHaveValue("Drop");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page.locator("details summary").click();
  await expect(
    page.getByText("Set 1: 160 lb × 15 reps · Drop", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
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
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
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
    .getByRole("spinbutton", {
      name: "Weight (lb) for Seated leg press set 1",
      exact: true,
    })
    .fill("160");
  await expect(page.getByRole("status")).toContainText("Saved on this device");
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
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
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
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
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
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
  await expect(page.locator(".save-status")).toContainText(
    "Saved on this device",
  );
  await page.reload();
  await page
    .locator("nav:visible")
    .getByRole("button", { name: "History", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Imported session", exact: true }),
  ).toHaveCount(1);
});
