import { describe, it, expect } from "vitest";
import { readSheet } from "read-excel-file/node";
import { parseExcelWorkout } from "./excelWorkout";
import { catalog } from "./catalog";
import { emptyState } from "./model";
import { importWorkout } from "./importWorkout";
import { fileURLToPath } from "node:url";
const fixture = fileURLToPath(
  new URL("../../e2e/fixtures/import-workout.xlsx", import.meta.url),
);
describe("Excel workout import", () => {
  it("reads actual Excel dates and decimal sets, and deduplicates reuploads", async () => {
    const rows = await readSheet(fixture, "Workout");
    const p = await parseExcelWorkout(rows, catalog);
    expect(p.date).toBe("2026-09-30");
    expect(p.exercises).toEqual([
      [
        "dumbbell-lateral-raise",
        [
          [20.5, 12],
          [20.5, 10],
        ],
      ],
    ]);
    const state = importWorkout(emptyState(), p, catalog);
    expect(
      importWorkout(state, await parseExcelWorkout(rows, catalog), catalog),
    ).toBe(state);
  });
  it("rejects blank templates, invalid dates, unknown names and inconsistent sets", async () => {
    const blank = await readSheet(
      fileURLToPath(
        new URL("../../public/workout-import-template.xlsx", import.meta.url),
      ),
      "Workout",
    );
    await expect(parseExcelWorkout(blank, catalog)).rejects.toThrow(
      "workout name",
    );
    const rows = await readSheet(fixture, "Workout");
    for (const [row, col, value, message] of [
      [4, 1, "2026-02-30", "valid date"],
      [9, 0, "No such lift", "supported exercise"],
      [9, 1, 2, "already has"],
      [9, 2, -1, "weight"],
      [9, 3, 1.5, "whole number"],
    ] as const) {
      const changed = structuredClone(rows);
      changed[row][col] = value;
      await expect(parseExcelWorkout(changed, catalog)).rejects.toThrow(
        message,
      );
    }
  });
});
