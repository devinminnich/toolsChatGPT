import { expect, it } from "vitest";
import { completedHistory, historyDate, mergeHistory } from "./cloud";
import type { Session } from "../domain/model";
const session = (id: string, startedAt: number): Session => ({id, name: id, startedAt, unit: "lb", exercises: []});
it("only uploads completed history, including imported results", () => {
  const active = session("active", 1);
  const done = {...session("done", 2), finishedAt: 3};
  const imported = {...session("imported", 4), imported: true};
  expect(completedHistory([active, done, imported])).toEqual([done, imported]);
});
it("merges another device's sessions without replacing local results or duplicating IDs", () => {
  const local = {...session("same", 2), name: "Local result"};
  const remote = {...session("same", 2), name: "Other copy"};
  const older = session("older", 1);
  expect(mergeHistory([local], [remote, older])).toEqual([older, local]);
});
it("dates workouts in Denver and retains imported calendar dates", () => {
  const s = session("late", Date.parse("2026-10-07T00:30:00Z"));
  expect(historyDate(s)).toBe("2026-10-06");
  expect(historyDate({...s, performedOn: "2026-10-05"})).toBe("2026-10-05");
});
