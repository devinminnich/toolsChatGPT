import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { load, save } from "./storage";
import {
  completeSet,
  emptyState,
  prescription,
  startSession,
} from "../domain/model";
import { catalog } from "../domain/catalog";
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
