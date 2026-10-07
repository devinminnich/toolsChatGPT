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
  notes?: string;
  rest: number;
  sets: PlannedSet[];
};
export const setTypes = ["Working", "Warm-up", "Drop"] as const;
export type PlannedSet = {
  id: string;
  type: (typeof setTypes)[number];
  reps: number;
  weight: number;
  warmupBaseWeight?: number;
  duration: number;
  distance: number;
  targetRange?: { min: number; max: number };
};
export type Workout = {
  id: string;
  name: string;
  unit?: "lb" | "kg";
  scheduledFor?: string;
  exercises: Prescription[];
};
export type Difficulty = "Easy" | "About right" | "Hard" | "Failed";
export type SetRecord = {
  id: string;
  type: "Working" | "Warm-up" | "Drop";
  weight: number;
  warmupBaseWeight?: number;
  reps: number;
  duration: number;
  distance: number;
  targetRange?: { min: number; max: number };
  difficulty?: Difficulty;
  completedAt?: number;
  skipped?: boolean;
};
export type Session = {
  id: string;
  workoutId?: string;
  readyAt?: number;
  name: string;
  startedAt: number;
  imported?: boolean;
  performedOn?: string;
  finishedAt?: number;
  unit: "lb" | "kg";
  exercises: {
    id: string;
    exercise: Exercise;
    notes?: string;
    rest: number;
    sets: SetRecord[];
  }[];
  restEndsAt?: number;
  pausedRest?: number;
  coachIncrement?: number;
  coachAuto?: boolean;
  coachUpdates?: Record<
    string,
    { difficulty: Difficulty; weight: number; reps: number; reason: string }
  >;
  coachFeedback?: { exerciseId: string; setId: string; applied?: boolean };
};
export type Profile = {
  name: string;
  goal: string;
  unit: "lb" | "kg";
  involvement: string;
  autonomy: string;
  equipment: string[];
  sessionMinutes?: number;
  coachAfterSet?: boolean;
};
export type State = {
  version: 2;
  cloudOwnerId?: string;
  cloudSyncEnabled?: boolean;
  profile?: Profile;
  custom: Exercise[];
  workouts: Workout[];
  draft?: Workout;
  active?: Session;
  readySessions?: Session[];
  history: Session[];
};
export const emptyState = (): State => ({
  version: 2,
  custom: [],
  workouts: [],
  history: [],
});
export const id = () => crypto.randomUUID();
export function plannedSet(): PlannedSet {
  return {
    id: id(),
    type: "Working",
    reps: 10,
    weight: 0,
    duration: 60,
    distance: 1,
  };
}
export function prescription(exerciseId: string): Prescription {
  return {
    id: id(),
    exerciseId,
    rest: 90,
    sets: Array.from({ length: 3 }, plannedSet),
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
    workoutId: workout.id,
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
        notes: p.notes,
        sets: p.sets.map((set) => ({
          ...structuredClone(set),
          id: id(),
          weight: convertWeight(set.weight, workout.unit || "lb", unit),
          warmupBaseWeight:
            set.warmupBaseWeight === undefined
              ? undefined
              : convertWeight(set.warmupBaseWeight, workout.unit || "lb", unit),
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
      sets: p.sets.map((set) => ({
        ...set,
        weight: convertWeight(set.weight, workout.unit || "lb", unit),
        warmupBaseWeight:
          set.warmupBaseWeight === undefined
            ? undefined
            : convertWeight(set.warmupBaseWeight, workout.unit || "lb", unit),
      })),
    })),
  };
}

// Upgrade the old exercise-wide prescription into independent set targets.
// Performed sessions already have nested sets and must remain unchanged.
export function migrateState(
  data:
    | State
    | (Omit<State, "version" | "workouts" | "draft"> & {
        version: 1;
        workouts: unknown[];
        draft?: unknown;
      }),
): State {
  if (data.version === 2) return data;
  const migrateWorkout = (value: unknown): Workout => {
    const workout = value as Workout;
    return {
      ...workout,
      exercises: workout.exercises.map((value) => {
        const p = value as unknown as {
          id: string;
          exerciseId: string;
          rest: number;
          sets: number;
          weight: number;
          warmupBaseWeight?: number;
          reps: number;
          duration: number;
          distance: number;
        };
        if (!Number.isInteger(p.sets) || p.sets < 1 || p.sets > 50)
          throw new Error("Saved routine set count is unsupported.");
        return {
          id: p.id,
          exerciseId: p.exerciseId,
          rest: p.rest,
          sets: Array.from({ length: p.sets }, (_, i) => ({
            id: `${p.id}-set-${i}`,
            type: "Working" as const,
            weight: p.weight,
            reps: p.reps,
            duration: p.duration,
            distance: p.distance,
          })),
        };
      }),
    };
  };
  return {
    ...data,
    version: 2,
    workouts: data.workouts.map(migrateWorkout),
    draft: data.draft ? migrateWorkout(data.draft) : undefined,
  };
}

export function changeSetType<T extends PlannedSet>(
  set: T,
  type: PlannedSet["type"],
  loaded: boolean,
  fallbackWeight = 0,
): T {
  if (type === set.type) return set;
  // Completed results can change labels, never their recorded load.
  if (!loaded || (set as SetRecord).completedAt || (set as SetRecord).skipped)
    return { ...set, type };
  if (type === "Warm-up") {
    const base = set.weight > 0 ? set.weight : fallbackWeight;
    return base > 0
      ? {
          ...set,
          type,
          warmupBaseWeight: base,
          weight: Math.round(base * 50) / 100,
        }
      : { ...set, type };
  }
  return {
    ...set,
    type,
    weight: set.warmupBaseWeight ?? set.weight,
    warmupBaseWeight: undefined,
  };
}
export function returnToWorkouts(state: State): State {
  const session = state.active;
  if (!session) return state;
  const original =
    state.workouts.find((w) => w.id === session.workoutId) ??
    state.workouts.find(
      (w) =>
        w.exercises.length === session.exercises.length &&
        w.exercises.every((e, i) => e.id === session.exercises[i].id),
    );
  const workout: Workout = original ?? {
    id: id(),
    name: session.name,
    unit: session.unit,
    exercises: session.exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exercise.id,
      notes: e.notes,
      rest: e.rest,
      sets: e.sets.map(({ completedAt, difficulty, skipped, ...set }) => set),
    })),
  };
  const ready: Session = {
    ...session,
    workoutId: workout.id,
    readyAt: Date.now(),
    restEndsAt: undefined,
    pausedRest: undefined,
  };
  return {
    ...state,
    active: undefined,
    workouts: original ? state.workouts : [...state.workouts, workout],
    readySessions: [
      ...(state.readySessions ?? []).filter((s) => s.workoutId !== workout.id),
      ready,
    ],
  };
}

export function resumeSession(session: Session, now = Date.now()): Session {
  return {
    ...session,
    startedAt:
      session.startedAt +
      (session.readyAt === undefined ? 0 : Math.max(0, now - session.readyAt)),
    readyAt: undefined,
  };
}

export function deleteWorkout(
  state: State,
  workoutId: string,
  now = Date.now(),
): State {
  const savedProgress = (state.readySessions ?? []).filter(
    (s) =>
      s.workoutId === workoutId &&
      s.exercises.some((e) => e.sets.some((set) => set.completedAt)),
  );
  return {
    ...state,
    workouts: state.workouts.filter((w) => w.id !== workoutId),
    draft: state.draft?.id === workoutId ? undefined : state.draft,
    readySessions: (state.readySessions ?? []).filter(
      (s) => s.workoutId !== workoutId,
    ),
    history: savedProgress.length
      ? [
          ...state.history,
          ...savedProgress.map((s) => ({
            ...s,
            finishedAt: Math.min(now, s.readyAt ?? now),
            readyAt: undefined,
            restEndsAt: undefined,
            pausedRest: undefined,
          })),
        ]
      : state.history,
  };
}
