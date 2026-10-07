import { catalog } from "./catalog";
import { emptyState, type State } from "./model";
import { importRoutine, type DetailedRoutineImport } from "./importRoutine";

export type CoachAdvice = {
  kind: "feedback" | "routine" | "set";
  title: string;
  message: string;
  routine?: DetailedRoutineImport;
  sessionId?: string;
  exerciseId?: string;
  setId?: string;
  before?: { weight: number; reps: number; duration: number; distance: number };
  after?: Partial<{ weight: number; reps: number; duration: number; distance: number }>;
};
export type CoachProposal = { id: string; requestId: string; createdAt: string; payload: CoachAdvice };
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
function text(v: unknown, max = 150) { return typeof v === "string" && v.length > 0 && v.length <= max; }
function numeric(v: unknown) { return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100000; }
function exercise(value: unknown) {
  if (!object(value) || !text(value.id) || !text(value.name) || !["reps", "duration", "distance"].includes(value.metric) || typeof value.loaded !== "boolean" || ![value.muscle, value.equipment, value.pattern, value.cues].every((v) => typeof v === "string") || ![value.instructions, value.aliases, value.secondary].every((v) => Array.isArray(v) && v.every((item) => typeof item === "string" && item.length <= 4000))) throw new Error("Invalid exercise details.");
}
function sets(values: unknown) {
  if (!Array.isArray(values) || values.length > 50 || !values.every((s) => object(s) && text(s.id) && ["Working", "Warm-up", "Drop"].includes(s.type) && [s.weight, s.reps, s.duration, s.distance].every(numeric) && Number.isInteger(s.reps))) throw new Error("Invalid workout sets.");
  for (const set of values) {
    if ((set.completedAt !== undefined && !Number.isFinite(set.completedAt)) || (set.difficulty !== undefined && !["Easy", "About right", "Hard", "Failed"].includes(set.difficulty)) || (set.skipped !== undefined && typeof set.skipped !== "boolean") || (set.targetRange && (!numeric(set.targetRange.min) || !numeric(set.targetRange.max) || set.targetRange.min > set.targetRange.max))) throw new Error("Invalid set results or range.");
  }
}
function workout(w: any, session = false) {
  if (!object(w) || !text(w.id) || !text(w.name, 100) || !Array.isArray(w.exercises) || w.exercises.length > 50 || (w.unit !== undefined && !["lb", "kg"].includes(w.unit))) throw new Error("Invalid workout.");
  for (const e of w.exercises) {
    if (!object(e) || !text(e.id) || !numeric(e.rest) || e.rest > 600) throw new Error("Invalid exercise prescription.");
    if (session) exercise(e.exercise);
    if (!session && !text(e.exerciseId)) throw new Error("Invalid exercise ID.");
    sets(e.sets);
  }
  if (session && (!numeric(w.startedAt / 100000000) || !Number.isFinite(w.startedAt) || (w.finishedAt !== undefined && !Number.isFinite(w.finishedAt)))) throw new Error("Invalid session date.");
}
export function validatePluginState(value: unknown): asserts value is State {
  if (!object(value) || value.version !== 2 || !Array.isArray(value.workouts) || !Array.isArray(value.history) || !Array.isArray(value.custom) || value.workouts.length > 500 || value.history.length > 3000 || value.custom.length > 500 || JSON.stringify(value).length > 1400000) throw new Error("Invalid or oversized workout state.");
  if (value.profile && (!object(value.profile) || typeof value.profile.name !== "string" || value.profile.name.length > 150 || !text(value.profile.goal) || !text(value.profile.involvement) || !text(value.profile.autonomy) || !["lb", "kg"].includes(value.profile.unit) || !Array.isArray(value.profile.equipment) || !value.profile.equipment.every((e: unknown) => text(e)))) throw new Error("Invalid training profile.");
  value.custom.forEach(exercise);
  value.workouts.forEach((w: unknown) => workout(w));
  if (value.draft) workout(value.draft);
  value.history.forEach((s: unknown) => workout(s, true));
  if (value.active) workout(value.active, true);
  if (value.readySessions) {
    if (!Array.isArray(value.readySessions) || value.readySessions.length > 500) throw new Error("Invalid saved sessions.");
    value.readySessions.forEach((s: unknown) => workout(s, true));
  }
}
export function validateAdvice(value: unknown, state: State): asserts value is CoachAdvice {
  if (!object(value) || !["feedback", "routine", "set"].includes(value.kind) || !text(value.title, 150) || !text(value.message, 6000)) throw new Error("Invalid coach advice.");
  if (value.kind === "routine") importRoutine(emptyState(), value.routine, [...catalog, ...state.custom]);
  if (value.kind === "set") {
    if (![value.sessionId, value.exerciseId, value.setId].every((v) => text(v)) || !object(value.before) || !object(value.after) || ![value.before.weight, value.before.reps, value.before.duration, value.before.distance].every(numeric) || !Object.keys(value.after).length || Object.keys(value.after).some((k) => !["weight", "reps", "duration", "distance"].includes(k)) || !Object.values(value.after).every(numeric) || (value.after.reps !== undefined && !Number.isInteger(value.after.reps))) throw new Error("Invalid set adjustment.");
    applyAdvice(state, value as CoachAdvice);
  }
}
export function applyAdvice(state: State, advice: CoachAdvice): State {
  if (advice.kind === "feedback") return state;
  if (advice.kind === "routine") return importRoutine(state, advice.routine, [...catalog, ...state.custom]);
  const target = state.active?.exercises.find((e) => e.id === advice.exerciseId)?.sets.find((s) => s.id === advice.setId);
  if (!target || state.active?.id !== advice.sessionId || target.completedAt || target.skipped || !advice.before || !advice.after || Object.entries(advice.before).some(([k, v]) => target[k as keyof typeof advice.before] !== v)) throw new Error("This set changed since the coach reviewed it. Ask for an updated suggestion.");
  const next = structuredClone(state);
  Object.assign(next.active!.exercises.find((e) => e.id === advice.exerciseId)!.sets.find((s) => s.id === advice.setId)!, advice.after);
  return next;
}
