import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import {
  completeSet,
  changeSetType,
  returnToWorkouts,
  resumeSession,
  prescription,
  searchExercises,
  startSession,
  volume,
  previousSet,
  workoutInUnits,
  migrateState,
  emptyState,
} from "./model";
const workout = () => ({
  id: "w",
  name: "Test",
  exercises: [
    {
      ...prescription("dumbbell-bench-press"),
      sets: prescription("dumbbell-bench-press").sets.map((set) => ({
        ...set,
        weight: 25,
        reps: 10,
      })),
    },
  ],
});
describe("training rules", () => {
  it("retains independent targets, types and order without rewriting the routine", () => {
    const w = workout();
    w.exercises[0].sets[0] = {
      ...w.exercises[0].sets[0],
      weight: 160,
      reps: 15,
      type: "Warm-up",
    };
    w.exercises[0].sets[1] = {
      ...w.exercises[0].sets[1],
      weight: 190,
      reps: 12,
      type: "Working",
    };
    w.exercises[0].sets[2] = {
      ...w.exercises[0].sets[2],
      weight: 150,
      reps: 8,
      type: "Drop",
    };
    const s = startSession({ ...w, unit: "lb" }, catalog, "kg");
    expect(
      s.exercises[0].sets.map((set) => [set.weight, set.reps, set.type]),
    ).toEqual([
      [72.57, 15, "Warm-up"],
      [86.18, 12, "Working"],
      [68.04, 8, "Drop"],
    ]);
    s.exercises[0].sets[0].weight = 200;
    expect(w.exercises[0].sets[0].weight).toBe(160);
    expect(
      workoutInUnits({ ...w, unit: "lb" }, "kg").exercises[0].sets.map(
        (set) => set.weight,
      ),
    ).toEqual([72.57, 86.18, 68.04]);
    expect(new Set(s.exercises[0].sets.map((set) => set.id)).size).toBe(3);
  });
  it("upgrades saved exercise-wide targets, draft and units while preserving performed history", () => {
    const legacy = {
      id: "old",
      name: "Old routine",
      unit: "kg" as const,
      exercises: [
        {
          id: "old-exercise",
          exerciseId: "seated-leg-press",
          sets: 3,
          weight: 160,
          reps: 12,
          duration: 60,
          distance: 1,
          rest: 90,
        },
      ],
    };
    const history = startSession(workout(), catalog, "lb");
    const migrated = migrateState({
      ...emptyState(),
      version: 1,
      workouts: [legacy],
      draft: legacy,
      history: [history],
    });
    expect(migrated.version).toBe(2);
    expect(migrated.workouts[0].unit).toBe("kg");
    expect(
      migrated.workouts[0].exercises[0].sets.map((set) => [
        set.weight,
        set.reps,
        set.type,
      ]),
    ).toEqual(Array.from({ length: 3 }, () => [160, 12, "Working"]));
    expect(migrated.draft?.exercises[0].sets).toEqual(
      migrated.workouts[0].exercises[0].sets,
    );
    expect(migrated.history[0]).toBe(history);
    expect(migrateState(migrated)).toBe(migrated);
  });
  it("filters aliases, muscles and equipment together", () => {
    expect(
      searchExercises(catalog, "dumbbell chest").every(
        (e) => e.equipment === "Dumbbell" && e.muscle === "Chest",
      ),
    ).toBe(true);
    expect(searchExercises(catalog, "legpress")[0].name).toBe(
      "Seated leg press",
    );
    expect(
      searchExercises(catalog, "", "Chest", "Dumbbell", ["Cable"]),
    ).toHaveLength(0);
  });
  it("snapshots plans and deduplicates completion", () => {
    const w = workout();
    const s = startSession(w, catalog, "lb");
    w.exercises[0].sets[0].weight = 100;
    expect(s.exercises[0].sets[0].weight).toBe(25);
    const completed = completeSet(
      s,
      s.exercises[0].id,
      s.exercises[0].sets[0].id,
      1000,
    );
    expect(completed.restEndsAt).toBe(91000);
    expect(
      completeSet(
        completed,
        s.exercises[0].id,
        s.exercises[0].sets[0].id,
        2000,
      ),
    ).toBe(completed);
    expect(volume(completed)).toBe(250);
    expect(s.exercises[0].sets[0].completedAt).toBeUndefined();
  });
  it("converts prescription weights when starting in a different unit", () => {
    expect(
      startSession({ ...workout(), unit: "lb" }, catalog, "kg").exercises[0]
        .sets[0].weight,
    ).toBe(11.34);
  });
  it("rejects bad metrics and missing exercises", () => {
    const s = startSession(workout(), catalog, "lb");
    s.exercises[0].sets[0].weight = NaN;
    expect(() =>
      completeSet(s, s.exercises[0].id, s.exercises[0].sets[0].id),
    ).toThrow();
    expect(() => startSession(workout(), [], "lb")).toThrow();
  });
  it("does not compare history using different load units", () => {
    let s = startSession(workout(), catalog, "lb");
    s = completeSet(s, s.exercises[0].id, s.exercises[0].sets[0].id);
    expect(previousSet([s], "dumbbell-bench-press", 0, "kg")).toBeUndefined();
    expect(previousSet([s], "dumbbell-bench-press", 0, "lb")?.weight).toBe(25);
  });
});

it("warm-up load reduces once, restores working load and converts the baseline", () => {
  const original = {
    ...prescription("dumbbell-bench-press").sets[0],
    weight: 30,
  };
  const warmup = changeSetType(original, "Warm-up", true);
  expect(warmup.weight).toBe(15);
  expect(changeSetType(warmup, "Warm-up", true).weight).toBe(15);
  expect(
    changeSetType({ ...warmup, weight: 12.5 }, "Working", true).weight,
  ).toBe(30);
  expect(
    changeSetType({ ...original, weight: 0 }, "Warm-up", true, 40).weight,
  ).toBe(20);
  expect(changeSetType(original, "Warm-up", false).weight).toBe(30);
  expect(
    changeSetType({ ...original, completedAt: 123 }, "Warm-up", true).weight,
  ).toBe(30);
  const w = { ...workout(), unit: "lb" as const };
  w.exercises[0].sets[0] = warmup;
  const session = startSession(w, catalog, "kg");
  expect(
    changeSetType(session.exercises[0].sets[0], "Working", true).weight,
  ).toBe(13.61);
  expect(workoutInUnits(w, "kg").exercises[0].sets[0].warmupBaseWeight).toBe(
    13.61,
  );
});
it("returns active sessions to workouts without losing logged sets or changing routine targets", () => {
  const w = workout();
  const active = startSession(w, catalog, "lb");
  const logged = completeSet(
    active,
    active.exercises[0].id,
    active.exercises[0].sets[0].id,
    123,
  );
  const state = { ...emptyState(), workouts: [w], active: logged };
  const ready = returnToWorkouts(state);
  expect(ready.active).toBeUndefined();
  expect(ready.readySessions?.[0].exercises).toEqual(logged.exercises);
  expect(ready.readySessions?.[0].restEndsAt).toBeUndefined();
  expect(ready.workouts).toEqual(state.workouts);
  expect(ready.history).toHaveLength(0);
  const parked = ready.readySessions![0];
  expect(resumeSession(parked, parked.readyAt! + 60000).startedAt).toBe(
    logged.startedAt + 60000,
  );
  const legacy = { ...logged, workoutId: undefined };
  expect(
    returnToWorkouts({ ...state, active: legacy }).readySessions?.[0].workoutId,
  ).toBe(w.id);
});
