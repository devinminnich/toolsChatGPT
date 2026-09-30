import type { Exercise, Session, State } from "./model";
export type WorkoutImport = {
  v: 1;
  id: string;
  date: string;
  name: string;
  unit: "lb" | "kg";
  exercises: [string, [number, number][]][];
};
export function encodeWorkoutImport(payload: WorkoutImport): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
export function decodeWorkoutImport(value: string): unknown {
  if (!value || value.length > 30000) throw new Error("Invalid workout link.");
  const text = value.replaceAll("-", "+").replaceAll("_", "/");
  try {
    return JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(text), (c) => c.charCodeAt(0)),
      ),
    );
  } catch {
    throw new Error("Invalid workout link.");
  }
}
export function workoutToken(link: string): string | null {
  const hash = link.startsWith("#") ? link : new URL(link).hash;
  return new URLSearchParams(hash.slice(1)).get("workout");
}
export function importWorkout(
  state: State,
  data: unknown,
  catalog: Exercise[],
): State {
  const p = data as WorkoutImport;
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
    throw new Error("Invalid workout data.");
  const startedAt = new Date(`${p.date}T00:00:00`).getTime();
  const exercises = p.exercises.map((item, index) => {
    if (!Array.isArray(item) || item.length !== 2)
      throw new Error("Invalid exercise data.");
    const [exerciseId, sets] = item;
    const exercise = catalog.find((e) => e.id === exerciseId);
    if (
      !exercise ||
      exercise.metric !== "reps" ||
      !Array.isArray(sets) ||
      !sets.length ||
      sets.length > 50
    )
      throw new Error("Unsupported exercise or sets.");
    return {
      id: `${p.id}-exercise-${index}`,
      exercise: structuredClone(exercise),
      rest: 0,
      sets: sets.map((set, n) => {
        if (
          !Array.isArray(set) ||
          set.length !== 2 ||
          typeof set[0] !== "number" ||
          !Number.isFinite(set[0]) ||
          set[0] < 0 ||
          set[0] > 100000 ||
          !Number.isInteger(set[1]) ||
          set[1] < 0 ||
          set[1] > 10000
        )
          throw new Error("Invalid weight or reps.");
        return {
          id: `${p.id}-set-${index}-${n}`,
          type: "Working" as const,
          weight: set[0],
          reps: set[1],
          duration: 0,
          distance: 0,
          completedAt: startedAt,
        };
      }),
    };
  });
  if (state.history.some((s) => s.id === p.id)) return state;
  const session: Session = {
    id: p.id,
    name: p.name.trim(),
    unit: p.unit,
    startedAt,
    imported: true,
    performedOn: p.date,
    exercises,
  };
  return {
    ...state,
    history: [...state.history, session].sort(
      (a, b) => a.startedAt - b.startedAt,
    ),
  };
}
