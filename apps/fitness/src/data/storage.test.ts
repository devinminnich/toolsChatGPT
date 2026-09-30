import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { load, save } from "./storage";
import {
  completeSet,
  emptyState,
  prescription,
  startSession,
  type State,
} from "../domain/model";
import { catalog } from "../domain/catalog";
it("loads previous saved routines as independent sets and persists the upgrade", async () => {
  const legacy = {
    ...emptyState(),
    version: 1,
    workouts: [
      {
        id: "legacy",
        name: "Legacy routine",
        unit: "lb",
        exercises: [
          {
            id: "legacy-exercise",
            exerciseId: "seated-leg-press",
            sets: 2,
            weight: 190,
            reps: 12,
            rest: 90,
            duration: 60,
            distance: 1,
          },
        ],
      },
    ],
  };
  await save(legacy as unknown as State);
  const migrated = await load();
  expect(migrated.version).toBe(2);
  expect(
    migrated.workouts[0].exercises[0].sets.map((s) => [s.weight, s.reps]),
  ).toEqual([
    [190, 12],
    [190, 12],
  ]);
  migrated.workouts[0].exercises[0].sets[1].weight = 210;
  await save(migrated);
  expect((await load()).workouts[0].exercises[0].sets[1].weight).toBe(210);
});
it("recovers completed results and a timer from IndexedDB after reopen", async () => {
  let active = startSession(
    {
      id: "w",
      name: "Recovery",
      exercises: [prescription("seated-leg-press")],
    },
    catalog,
    "lb",
  );
  active = completeSet(
    active,
    active.exercises[0].id,
    active.exercises[0].sets[0].id,
    1000,
  );
  await save({ ...emptyState(), active });
  const reopened = await load();
  expect(reopened.active?.exercises[0].sets[0].completedAt).toBe(1000);
  expect(reopened.active?.restEndsAt).toBe(91000);
});
