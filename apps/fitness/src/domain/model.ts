export type Metric = "reps" | "duration" | "distance";
export type Exercise = {
  id: string;
  name: string;
  aliases: string[];
  muscle: string;
  secondary: string[];
  equipment: string;
  pattern: string;
  metric: Metric;
  loaded: boolean;
  instructions: string[];
  cues: string;
  custom?: boolean;
};
export type Prescription = {
  id: string;
  exerciseId: string;
  sets: number;
  reps: number;
  weight: number;
  rest: number;
  duration: number;
  distance: number;
};
export type Workout = {
  id: string;
  name: string;
  unit?: "lb" | "kg";
  exercises: Prescription[];
};
export type Difficulty = "Easy" | "About right" | "Hard" | "Failed";
export type SetRecord = {
  id: string;
  type: "Working" | "Warm-up" | "Drop";
  weight: number;
  reps: number;
  duration: number;
  distance: number;
  difficulty?: Difficulty;
  completedAt?: number;
  skipped?: boolean;
};
export type Session = {
  id: string;
  name: string;
  startedAt: number;
  finishedAt?: number;
  unit: "lb" | "kg";
  exercises: {
    id: string;
    exercise: Exercise;
    rest: number;
    sets: SetRecord[];
  }[];
  restEndsAt?: number;
  pausedRest?: number;
};
export type Profile = {
  name: string;
  goal: string;
  unit: "lb" | "kg";
  involvement: string;
  autonomy: string;
  equipment: string[];
};
export type State = {
  version: 1;
  profile?: Profile;
  custom: Exercise[];
  workouts: Workout[];
  draft?: Workout;
  active?: Session;
  history: Session[];
};
export const emptyState = (): State => ({
  version: 1,
  custom: [],
  workouts: [],
  history: [],
});
export const id = () => crypto.randomUUID();
export function prescription(exerciseId: string): Prescription {
  return {
    id: id(),
    exerciseId,
    sets: 3,
    reps: 10,
    weight: 0,
    rest: 90,
    duration: 60,
    distance: 1,
  };
}
export function startSession(
  workout: Workout,
  catalog: Exercise[],
  unit: Session["unit"],
): Session {
  if (!workout.exercises.length)
    throw new Error("Add an exercise before starting.");
  return {
    id: id(),
    name: workout.name,
    startedAt: Date.now(),
    unit,
    exercises: workout.exercises.map((p) => {
      const exercise = catalog.find((e) => e.id === p.exerciseId);
      if (!exercise)
        throw new Error("An exercise is missing from the catalog.");
      return {
        id: p.id,
        exercise: structuredClone(exercise),
        rest: p.rest,
        sets: Array.from({ length: p.sets }, () => ({
          id: id(),
          type: "Working" as const,
          reps: p.reps,
          weight: convertWeight(p.weight, workout.unit || "lb", unit),
          duration: p.duration,
          distance: p.distance,
        })),
      };
    }),
  };
}
export function completeSet(
  session: Session,
  exerciseId: string,
  setId: string,
  now = Date.now(),
): Session {
  const result = structuredClone(session);
  const exercise = result.exercises.find((e) => e.id === exerciseId);
  const set = exercise?.sets.find((s) => s.id === setId);
  if (!exercise || !set) throw new Error("Set not found.");
  if (set.completedAt || set.skipped) return session;
  for (const value of [set.weight, set.reps, set.duration, set.distance])
    if (!Number.isFinite(value) || value < 0)
      throw new Error("Enter valid, nonnegative values.");
  set.completedAt = now;
  result.restEndsAt = now + exercise.rest * 1000;
  result.pausedRest = undefined;
  return result;
}
export function searchExercises(
  catalog: Exercise[],
  query: string,
  muscle = "",
  equipment = "",
  available: string[] = [],
): Exercise[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const requestedMuscles = [
    ...new Set(catalog.map((e) => e.muscle.toLowerCase())),
  ].filter((m) => terms.includes(m));
  const requestedEquipment = [
    ...new Set(catalog.map((e) => e.equipment.toLowerCase())),
  ].filter((m) => terms.includes(m));
  return catalog
    .filter(
      (e) =>
        (!requestedMuscles.length ||
          requestedMuscles.includes(e.muscle.toLowerCase())) &&
        (!requestedEquipment.length ||
          requestedEquipment.includes(e.equipment.toLowerCase())) &&
        (!muscle || e.muscle === muscle) &&
        (!equipment || e.equipment === equipment) &&
        (!available.length || available.includes(e.equipment)) &&
        terms.every((t) =>
          [
            e.name,
            ...e.aliases,
            e.muscle,
            ...e.secondary,
            e.equipment,
            e.pattern,
          ]
            .join(" ")
            .toLowerCase()
            .includes(t),
        ),
    )
    .sort(
      (a, b) =>
        Number(b.name.toLowerCase() === query.toLowerCase()) -
          Number(a.name.toLowerCase() === query.toLowerCase()) ||
        a.name.localeCompare(b.name),
    );
}
export function previousSet(
  history: Session[],
  exerciseId: string,
  index: number,
  unit: Session["unit"],
): SetRecord | undefined {
  for (const session of [...history].reverse()) {
    if (session.unit !== unit) continue;
    const set = session.exercises.find((e) => e.exercise.id === exerciseId)
      ?.sets[index];
    if (set?.completedAt) return set;
  }
}
export function volume(session: Session): number {
  return session.exercises.reduce(
    (sum, e) =>
      sum +
      (e.exercise.loaded && e.exercise.metric === "reps"
        ? e.sets.reduce(
            (n, s) => n + (s.completedAt ? s.weight * s.reps : 0),
            0,
          )
        : 0),
    0,
  );
}

export function convertWeight(
  weight: number,
  from: Session["unit"],
  to: Session["unit"],
): number {
  return from === to
    ? weight
    : Math.round(weight * (from === "lb" ? 0.45359237 : 2.2046226218) * 100) /
        100;
}
export function workoutInUnits(
  workout: Workout,
  unit: Session["unit"],
): Workout {
  return {
    ...structuredClone(workout),
    unit,
    exercises: workout.exercises.map((p) => ({
      ...p,
      weight: convertWeight(p.weight, workout.unit || "lb", unit),
    })),
  };
}
