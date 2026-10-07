import { expect, it } from "vitest";
import { emptyState, prescription, startSession } from "../domain/model";
import { catalog } from "../domain/catalog";
import { trainingTime } from "./bridge";

it("gives the coach remaining session time and clamps an overrun to zero", () => {
  const state = emptyState();
  state.active = startSession({ id: "w", name: "Workout", exercises: [prescription("seated-dumbbell-shoulder-press")] }, catalog, "lb");
  state.active.startedAt = 100000;
  state.active.restEndsAt = 100000 + 21 * 60000;
  state.profile = { name: "Test", goal: "Strength", unit: "lb", involvement: "Coach", autonomy: "Suggest only", equipment: [], sessionMinutes: 30 };
  expect(trainingTime(state, 100000 + 20 * 60000)).toEqual({ budgetMinutes: 30, elapsedMinutes: 20, remainingMinutes: 10, restRemainingSeconds: 60 });
  expect(trainingTime(state, 100000 + 40 * 60000).remainingMinutes).toBe(0);
  state.profile.sessionMinutes = NaN;
  expect(trainingTime(state).budgetMinutes).toBe(45);
});
