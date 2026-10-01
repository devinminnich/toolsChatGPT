import { expect, it } from "vitest";
import { catalog } from "./catalog";
import { emptyState, startSession } from "./model";
import { encodeWorkoutImport } from "./importWorkout";
import {
  importRoutine,
  importFromHash,
  type RoutineImport,
} from "./importRoutine";
const p: RoutineImport = {
  v: 1,
  id: "test-routine",
  date: "2026-10-01",
  name: "Planned session",
  unit: "lb",
  exercises: [
    ["dumbbell-bench-press", 3, 8, 12],
    ["plank", 2, 30, 45],
  ],
};
it("saves future routine ranges without creating performed history and deduplicates links", () => {
  const state = importRoutine(emptyState(), p, catalog);
  expect(state.history).toHaveLength(0);
  expect(state.workouts[0].scheduledFor).toBe("2026-10-01");
  const session = startSession(state.workouts[0], catalog, "lb");
  expect(session.exercises[0].sets[0].targetRange).toEqual({ min: 8, max: 12 });
  expect(session.exercises[1].sets[0].duration).toBe(30);
  expect(session.exercises[1].sets[0].targetRange).toEqual({
    min: 30,
    max: 45,
  });
  expect(importRoutine(state, p, catalog)).toBe(state);
  const token = encodeWorkoutImport(p as never);
  expect(importFromHash(state, `#routine=${token}`, catalog)?.notice).toBe(
    "This routine is already saved.",
  );
});
it("rejects invalid dates, missing exercises, malformed ranges and set counts", () => {
  for (const bad of [
    { ...p, date: "2026-02-30" },
    { ...p, exercises: [["missing", 3, 8, 12]] },
    { ...p, exercises: [["plank", 2, 45, 30]] },
    { ...p, exercises: [["plank", 0, 30, 45]] },
  ])
    expect(() => importRoutine(emptyState(), bad, catalog)).toThrow();
});
