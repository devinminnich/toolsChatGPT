import {
  setTypes,
  type PlannedSet,
  type Exercise,
  type State,
  type Workout,
} from "./model";
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
export type DetailedRoutineImport = Omit<RoutineImport, "v" | "exercises"> & {
  v: 2;
  exercises: {
    exerciseId: string;
    rest: number;
    sets: {
      type: PlannedSet["type"];
      weight: number;
      min: number;
      max: number;
    }[];
  }[];
};
export function importRoutine(
  state: State,
  data: unknown,
  catalog: Exercise[],
): State {
  const p = data as RoutineImport | DetailedRoutineImport;
  if (
    !p ||
    ![1, 2].includes(p.v) ||
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
      let exerciseId: string,
        rest = 90;
      let targets: DetailedRoutineImport["exercises"][number]["sets"];
      if (p.v === 1) {
        if (!Array.isArray(item) || item.length !== 4)
          throw new Error("Invalid exercise target.");
        const [exercise, count, min, max] = item;
        if (!Number.isInteger(count) || count < 1 || count > 50)
          throw new Error("Invalid set count.");
        exerciseId = exercise;
        targets = Array.from({ length: count }, () => ({
          type: "Working",
          weight: 0,
          min,
          max,
        }));
      } else {
        if (!item || Array.isArray(item) || typeof item !== "object")
          throw new Error("Invalid exercise target.");
        const detailed = item as DetailedRoutineImport["exercises"][number];
        exerciseId = detailed.exerciseId;
        rest = detailed.rest;
        targets = detailed.sets;
        if (
          !Number.isInteger(rest) ||
          rest < 0 ||
          rest > 600 ||
          !Array.isArray(targets) ||
          targets.length < 1 ||
          targets.length > 50
        )
          throw new Error("Invalid rest time or set count.");
      }
      const exercise = catalog.find((e) => e.id === exerciseId);
      if (!exercise || !["reps", "duration"].includes(exercise.metric))
        throw new Error("Invalid exercise.");
      return {
        id: `${p.id}-exercise-${i}`,
        exerciseId,
        rest,
        sets: targets.map((target, n) => {
          if (
            !target ||
            !setTypes.includes(target.type) ||
            !Number.isFinite(target.weight) ||
            target.weight < 0 ||
            target.weight > 10000 ||
            !Number.isInteger(target.min) ||
            target.min < 1 ||
            !Number.isInteger(target.max) ||
            target.max < target.min ||
            target.max > 10000
          )
            throw new Error("Invalid set target.");
          return {
            id: `${p.id}-set-${i}-${n}`,
            type: target.type,
            weight: target.weight,
            reps: exercise.metric === "reps" ? target.min : 0,
            duration: exercise.metric === "duration" ? target.min : 0,
            distance: 0,
            targetRange: { min: target.min, max: target.max },
          };
        }),
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

export async function importSharedPlan(
  state: State,
  slug: string,
  catalog: Exercise[],
): Promise<{ next: State; tab: "Train"; notice: string }> {
  if (!/^[a-z0-9-]{1,100}$/.test(slug))
    throw new Error("Invalid shared workout link.");
  const response = await fetch(`./workouts/${slug}.json`);
  if (!response.ok)
    throw new Error(
      "This shared workout could not be opened. Please try again.",
    );
  const next = importRoutine(state, await response.json(), catalog);
  return {
    next,
    tab: "Train",
    notice:
      next === state
        ? "This routine is already saved."
        : "Routine saved. Review your weights before starting.",
  };
}
