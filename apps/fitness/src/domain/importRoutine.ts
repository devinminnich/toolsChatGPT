import type { Exercise, State, Workout } from "./model";
import {
  decodeWorkoutImport,
  importWorkout,
  workoutToken,
} from "./importWorkout";
export type RoutineImport = {
  v: 1;
  id: string;
  date: string;
  name: string;
  unit: "lb" | "kg";
  exercises: [string, number, number, number][];
};
export function importRoutine(
  state: State,
  data: unknown,
  catalog: Exercise[],
): State {
  const p = data as RoutineImport;
  if (
    !p ||
    p.v !== 1 ||
    typeof p.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(p.id) ||
    typeof p.name !== "string" ||
    !p.name.trim() ||
    p.name.length > 100 ||
    !["lb", "kg"].includes(p.unit) ||
    typeof p.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(p.date) ||
    !Number.isFinite(Date.parse(p.date)) ||
    new Date(p.date).toISOString().slice(0, 10) !== p.date ||
    !Array.isArray(p.exercises) ||
    !p.exercises.length ||
    p.exercises.length > 30
  )
    throw new Error("Invalid routine data.");
  const workout: Workout = {
    id: p.id,
    name: p.name.trim(),
    unit: p.unit,
    scheduledFor: p.date,
    exercises: p.exercises.map((item, i) => {
      if (!Array.isArray(item) || item.length !== 4)
        throw new Error("Invalid exercise target.");
      const [exerciseId, count, min, max] = item;
      const exercise = catalog.find((e) => e.id === exerciseId);
      if (
        !exercise ||
        !["reps", "duration"].includes(exercise.metric) ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > 50 ||
        !Number.isInteger(min) ||
        min < 1 ||
        !Number.isInteger(max) ||
        max < min ||
        max > 10000
      )
        throw new Error("Invalid exercise or set range.");
      return {
        id: `${p.id}-exercise-${i}`,
        exerciseId,
        rest: 90,
        sets: Array.from({ length: count }, (_, n) => ({
          id: `${p.id}-set-${i}-${n}`,
          type: "Working" as const,
          weight: 0,
          reps: exercise.metric === "reps" ? min : 0,
          duration: exercise.metric === "duration" ? min : 0,
          distance: 0,
          targetRange: { min, max },
        })),
      };
    }),
  };
  if (state.workouts.some((w) => w.id === workout.id)) return state;
  return { ...state, workouts: [...state.workouts, workout] };
}
export function importFromHash(
  state: State,
  hash: string,
  catalog: Exercise[],
): { next: State; tab: "Train" | "History"; notice: string } | undefined {
  const routine = new URLSearchParams(hash.slice(1)).get("routine");
  const workout = workoutToken(hash);
  if (routine && workout) throw new Error("Open one import link at a time.");
  if (routine) {
    const next = importRoutine(state, decodeWorkoutImport(routine), catalog);
    return {
      next,
      tab: "Train",
      notice:
        next === state
          ? "This routine is already saved."
          : "Routine saved. Set your working weights before starting.",
    };
  }
  if (workout) {
    const next = importWorkout(state, decodeWorkoutImport(workout), catalog);
    return {
      next,
      tab: "History",
      notice:
        next === state
          ? "This workout is already in your history."
          : "Workout added to your history.",
    };
  }
}
