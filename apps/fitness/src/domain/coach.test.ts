import { expect, it } from "vitest";
import { catalog } from "./catalog";
import {
  emptyState,
  prescription,
  startSession,
  type Difficulty,
} from "./model";
import {
  applySuggestion,
  recordDifficulty,
  coachContext,
  suggestNextSet,
} from "./coach";
function setup(difficulty: Difficulty = "Easy") {
  const p = prescription("seated-leg-press");
  p.sets = p.sets.map((s) => ({ ...s, weight: 100, reps: 10 }));
  const session = startSession(
    { id: "w", name: "Workout", exercises: [p] },
    catalog,
    "lb",
  );
  session.exercises[0].sets[0].completedAt = 1000;
  session.exercises[0].sets[0].difficulty = difficulty;
  return session;
}
it("uses goal to suggest reps or a bounded, available weight increment", () => {
  const s = setup(),
    e = s.exercises[0],
    id = e.sets[0].id;
  expect(
    suggestNextSet(s, e.id, id, "Build muscle", 2.5).suggestion?.after,
  ).toEqual({ weight: 100, reps: 11 });
  expect(
    suggestNextSet(s, e.id, id, "Strength", 2.5).suggestion?.after,
  ).toEqual({ weight: 102.5, reps: 10 });
  expect(
    suggestNextSet(s, e.id, id, "Strength", 20).suggestion,
  ).toBeUndefined();
  expect(
    suggestNextSet(s, e.id, id, "Maintain", 2.5).suggestion,
  ).toBeUndefined();
});
it("does not increase hard or failed sets, override planned progression or special sets", () => {
  for (const d of ["Hard", "About right"] as const) {
    const s = setup(d);
    expect(
      suggestNextSet(
        s,
        s.exercises[0].id,
        s.exercises[0].sets[0].id,
        "Strength",
        2.5,
      ).suggestion,
    ).toBeUndefined();
  }
  const s = setup("Failed"),
    e = s.exercises[0];
  expect(
    suggestNextSet(s, e.id, e.sets[0].id, "Strength", 2.5).suggestion?.after
      .reps,
  ).toBe(9);
  e.sets[0].difficulty = "Easy";
  e.sets[1].weight = 110;
  expect(
    suggestNextSet(s, e.id, e.sets[0].id, "Strength", 2.5).suggestion,
  ).toBeUndefined();
  e.sets[0].type = "Warm-up";
  expect(
    suggestNextSet(s, e.id, e.sets[0].id, "Build muscle", 2.5).suggestion,
  ).toBeUndefined();
});
it("applies only to the unchanged unfinished target and preserves completed results", () => {
  const s = setup(),
    e = s.exercises[0],
    proposal = suggestNextSet(
      s,
      e.id,
      e.sets[0].id,
      "Build muscle",
      2.5,
    ).suggestion!;
  const next = applySuggestion(s, proposal);
  expect(next.exercises[0].sets[1].reps).toBe(11);
  expect(next.exercises[0].sets[0]).toEqual(e.sets[0]);
  expect(e.sets[1].reps).toBe(10);
  expect(applySuggestion(next, proposal)).toBe(next);
  e.sets[1].completedAt = 2000;
  expect(applySuggestion(s, proposal)).toBe(s);
});
it("exports actual and planned context, goal, units, feedback and the question", () => {
  const text = coachContext(
    setup(),
    {
      name: "Devin",
      goal: "Build muscle",
      unit: "lb",
      equipment: [],
      involvement: "Coach",
      autonomy: "Suggest only",
    },
    "What next?",
  );
  for (const value of [
    "Build muscle",
    "Easy",
    "Completed",
    "Planned",
    "lb",
    "What next?",
  ])
    expect(text).toContain(value);
});

it("auto-adjusts immediately once, survives reload data and never rewrites completed sets", () => {
  const s = setup();
  s.coachAuto = true;
  s.coachIncrement = 2.5;
  const e = s.exercises[0],
    source = e.sets[0];
  const next = recordDifficulty(s, e.id, source.id, "Easy", "Strength");
  expect(next.exercises[0].sets[1].weight).toBe(102.5);
  expect(next.exercises[0].sets[0].weight).toBe(100);
  const repeat = recordDifficulty(
    structuredClone(next),
    e.id,
    source.id,
    "Easy",
    "Strength",
  );
  expect(repeat.exercises[0].sets[1].weight).toBe(102.5);
  expect(repeat.coachUpdates?.[source.id].difficulty).toBe("Easy");
  s.coachAuto = false;
  expect(
    recordDifficulty(s, e.id, source.id, "Easy", "Strength").exercises[0]
      .sets[1].weight,
  ).toBe(100);
});
