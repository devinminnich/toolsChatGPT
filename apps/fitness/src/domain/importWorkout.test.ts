import { expect, it } from "vitest";
import { catalog } from "./catalog";
import { emptyState } from "./model";
import {
  decodeWorkoutImport,
  encodeWorkoutImport,
  importWorkout,
  workoutToken,
  type WorkoutImport,
} from "./importWorkout";
const payload: WorkoutImport = {
  v: 1,
  id: "test-import",
  name: "Imported session",
  date: "2026-09-30",
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
};
it("round-trips links and imports exact results without guessing duration or effort", () => {
  const token = encodeWorkoutImport(payload);
  expect(workoutToken(`https://example.com/#workout=${token}`)).toBe(token);
  const original = emptyState();
  const next = importWorkout(original, decodeWorkoutImport(token), catalog);
  expect(
    next.history[0].exercises[0].sets.map((s) => [s.weight, s.reps]),
  ).toEqual([
    [20.5, 12],
    [20.5, 10],
  ]);
  expect(next.history[0].finishedAt).toBeUndefined();
  expect(next.history[0].exercises[0].sets[0].difficulty).toBeUndefined();
  expect(original.history).toHaveLength(0);
  expect(importWorkout(next, payload, catalog)).toBe(next);
});
it("rejects invalid dates, unknown exercises and malformed or negative metrics", () => {
  for (const bad of [
    { ...payload, date: "2026-02-30" },
    { ...payload, exercises: [["missing", [[1, 1]]]] },
    { ...payload, exercises: [["dumbbell-lateral-raise", [[-1, 2]]]] },
    { ...payload, exercises: [["dumbbell-lateral-raise", [[1, 2.5]]]] },
  ])
    expect(() => importWorkout(emptyState(), bad, catalog)).toThrow();
  expect(() => decodeWorkoutImport("not-a-valid-json-link")).toThrow();
});

it("ignores an empty import link on normal app loading", () => {
  expect(workoutToken("")).toBeNull();
});
