import { expect, it, vi } from "vitest";
import plan from "../../public/workouts/shoulders-biceps-2026-10-05.json";
import backPlan from "../../public/workouts/back-legs-abs-2026-10-07.json";
import { catalog } from "./catalog";
import { emptyState, startSession } from "./model";
import { encodeWorkoutImport } from "./importWorkout";
import {
  importRoutine,
  importSharedPlan,
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

it("imports the shoulder routine's warm-up loads, working loads, ranges and rest times without altering history", () => {
  const original = emptyState();
  const next = importRoutine(original, plan, catalog);
  const w = next.workouts[0];
  expect(
    w.exercises.flatMap((e) => e.sets).filter((s) => s.type === "Working"),
  ).toHaveLength(17);
  expect(w.exercises[0].sets[0]).toMatchObject({
    type: "Warm-up",
    weight: 5,
    reps: 15,
  });
  expect(w.exercises[1].sets[0]).toMatchObject({
    type: "Warm-up",
    weight: 10,
    reps: 15,
  });
  const active = startSession(w, catalog, "lb");
  expect(active.exercises[2].rest).toBe(90);
  expect(active.exercises[2].sets.map((s) => s.weight)).toEqual([30, 30, 30]);
  expect(active.exercises[3].sets.map((s) => s.weight)).toEqual([
    12.5, 12.5, 12.5,
  ]);
  expect(active.exercises[4].sets[0].targetRange).toEqual({ min: 10, max: 15 });
  expect(next.history).toBe(original.history);
  expect(importRoutine(next, plan, catalog)).toBe(next);
});
it("rejects malformed detailed prescriptions", () => {
  for (const patch of [
    { rest: -1 },
    { sets: [] },
    { sets: [{ type: "Working", weight: -10, min: 8, max: 12 }] },
    { sets: [{ type: "Unknown", weight: 30, min: 8, max: 12 }] },
    { sets: [{ type: "Working", weight: 30, min: 12, max: 8 }] },
  ]) {
    expect(() =>
      importRoutine(
        emptyState(),
        { ...plan, exercises: [{ ...plan.exercises[0], ...patch }] },
        catalog,
      ),
    ).toThrow();
  }
});
it("loads only validated local plan paths and reports unavailable plans", async () => {
  const mock = vi.fn().mockResolvedValue({ ok: true, json: async () => plan });
  vi.stubGlobal("fetch", mock);
  try {
    const imported = await importSharedPlan(
      emptyState(),
      "shoulders-biceps-2026-10-05",
      catalog,
    );
    expect(mock).toHaveBeenCalledWith(
      "./workouts/shoulders-biceps-2026-10-05.json",
    );
    expect(imported.next.workouts[0].name).toBe(plan.name);
    await expect(
      importSharedPlan(emptyState(), "../private", catalog),
    ).rejects.toThrow("Invalid shared workout link");
    expect(mock).toHaveBeenCalledTimes(1);
    mock.mockResolvedValueOnce({ ok: false });
    await expect(
      importSharedPlan(emptyState(), "missing", catalog),
    ).rejects.toThrow("could not be opened");
  } finally {
    vi.unstubAllGlobals();
  }
});

it("preserves the back, legs and abs plan's loads, timed holds and notes in a session", () => {
  const state = importRoutine(emptyState(), backPlan, catalog);
  const session = startSession(state.workouts[0], catalog, "lb");
  expect(session.exercises.map((e) => e.sets.length)).toEqual([3, 3, 3, 3, 3, 2, 2, 2]);
  expect(session.exercises[3].sets.map((s) => s.weight)).toEqual([210, 210, 210]);
  expect(session.exercises[4].sets[0].weight).toBe(105);
  expect(session.exercises[5].sets[0].weight).toBe(70);
  expect(session.exercises[7].sets[0]).toMatchObject({duration: 30, targetRange: {min: 30, max: 45}});
  expect(session.exercises[3].notes).toBe(backPlan.exercises[3].notes);
  expect(state.history).toHaveLength(0);
  expect(importRoutine(state, backPlan, catalog)).toBe(state);
});

it("rejects non-text and oversized exercise notes", () => {
  for (const notes of [12, "x".repeat(2001)]) {
    expect(() => importRoutine(emptyState(), {...backPlan, exercises: [{...backPlan.exercises[0], notes}]}, catalog)).toThrow("Invalid exercise notes");
  }
});
