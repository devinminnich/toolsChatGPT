import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import {
  completeSet,
  prescription,
  searchExercises,
  startSession,
  volume,
  previousSet,
} from "./model";
const workout = () => ({
  id: "w",
  name: "Test",
  exercises: [
    { ...prescription("dumbbell-bench-press"), weight: 25, reps: 10 },
  ],
});
describe("training rules", () => {
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
    w.exercises[0].weight = 100;
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
