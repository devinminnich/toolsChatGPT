import { expect, it, vi } from "vitest";
import { catalog } from "./catalog";
import { emptyState, prescription, startSession } from "./model";
import { applyAdvice, validateAdvice, validatePluginState, type CoachAdvice } from "./plugin";
import { createHandler, type Reader } from "../../supabase/functions/fitness-coach/handler";
import type { PluginApi } from "../../supabase/functions/fitness-coach/plugin";

const workout = { id: "routine", name: "Shoulders", unit: "lb" as const, exercises: [prescription("seated-dumbbell-shoulder-press")] };
const state = { ...emptyState(), workouts: [workout], active: startSession(workout, catalog, "lb") };
const exercise = state.active.exercises[0];
const set = exercise.sets[0];
const advice: CoachAdvice = { kind: "set", title: "Next set", message: "Try a lower target after that hard set.", sessionId: state.active.id, exerciseId: exercise.id, setId: set.id, before: { weight: set.weight, reps: set.reps, duration: set.duration, distance: set.distance }, after: { weight: 25, reps: 8 } };
it("validates shared training state and rejects malformed nested sets", () => {
  expect(() => validatePluginState(state)).not.toThrow();
  const bad = structuredClone(state); bad.active.exercises[0].sets[0].reps = -1;
  expect(() => validatePluginState(bad)).toThrow("Invalid workout sets");
});
it("proposes without mutating, applies only the exact unfinished set, and rejects stale proposals", () => {
  expect(() => validateAdvice(advice, state)).not.toThrow();
  expect(state.active.exercises[0].sets[0].weight).toBe(0);
  const next = applyAdvice(state, advice);
  expect(next.active!.exercises[0].sets[0]).toMatchObject({ weight: 25, reps: 8 });
  expect(() => applyAdvice(next, advice)).toThrow("changed");
  const logged = structuredClone(state); logged.active.exercises[0].sets[0].completedAt = Date.now();
  expect(() => applyAdvice(logged, advice)).toThrow("changed");
  const skipped = structuredClone(state); skipped.active.exercises[0].sets[0].skipped = true;
  expect(() => applyAdvice(skipped, advice)).toThrow("changed");
});
it("validates proposed routine exercise IDs and preserves existing routine IDs", () => {
  const routine = { v: 2 as const, id: "coach-routine", date: "2026-10-07", name: "Legs", unit: "lb" as const, exercises: [{ exerciseId: "seated-leg-press", rest: 90, sets: [{ type: "Working" as const, weight: 210, min: 10, max: 12 }] }] };
  const proposal: CoachAdvice = { kind: "routine", title: "Tomorrow", message: "Based on your recent results.", routine };
  validateAdvice(proposal, state);
  const next = applyAdvice(state, proposal);
  expect(next.workouts).toHaveLength(2);
  expect(applyAdvice(next, proposal)).toBe(next);
  expect(() => validateAdvice({ ...proposal, routine: { ...routine, exercises: [{ ...routine.exercises[0], exerciseId: "missing" }] } }, state)).toThrow("Invalid exercise");
});
const api: PluginApi = {
  snapshot: vi.fn(async () => ({ state, revision: 1 })), save: vi.fn(async () => 2), proposals: vi.fn(async () => []),
  propose: vi.fn(async (requestId, payload) => ({ id: crypto.randomUUID(), requestId, payload, createdAt: new Date().toISOString() })), review: vi.fn(async () => {}),
};
const reader: Reader = { list: async () => [], get: async () => null };
const handler = createHandler({ resource: "https://example.test/mcp", issuer: "https://auth.test", widgetHtml: async () => "<!doctype html><p>Fitness Coach</p>", authenticate: async (token) => token === "train" ? { ...reader, plugin: api } : token === "read" ? reader : null });
async function rpc(method: string, params: unknown = {}, token?: string) {
  const response = await handler(new Request("https://example.test/mcp", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }));
  return { status: response.status, data: await response.json() };
}
it("publishes a UI resource and marks state writes app-only", async () => {
  const { data } = await rpc("tools/list");
  expect(data.result.tools.find((t: any) => t.name === "save_training_state")._meta.ui.visibility).toEqual(["app"]);
  const { data: resource } = await rpc("resources/read", { uri: "ui://fitness-coach/workout-app-v2.html" });
  expect(resource.result.contents[0].mimeType).toBe("text/html;profile=mcp-app");
  expect(resource.result.contents[0]._meta.ui.csp.connectDomains).toEqual([]);
});
it("blocks read-only and unauthenticated users from training tools", async () => {
  expect((await rpc("tools/call", { name: "open_fitness_app" })).status).toBe(401);
  expect((await rpc("tools/call", { name: "open_fitness_app" }, "read")).data.result.isError).toBe(true);
});
it("keeps full UI state in widget metadata and gives coach actual session IDs", async () => {
  const open = (await rpc("tools/call", { name: "open_fitness_app" }, "train")).data.result;
  expect(open._meta.state.active.id).toBe(state.active.id);
  expect(open.structuredContent.state).toBeUndefined();
  const context = (await rpc("tools/call", { name: "get_training_context" }, "train")).data.result;
  expect(context.structuredContent.active.exercises[0].sets[0].id).toBe(set.id);
});
it("coach proposal creation never invokes the state saver", async () => {
  vi.mocked(api.save).mockClear();
  const response = await rpc("tools/call", { name: "propose_coach_advice", arguments: { requestId: "request-1", payload: advice } }, "train");
  expect(response.data.result.isError).toBe(false);
  expect(api.propose).toHaveBeenCalled();
  expect(api.save).not.toHaveBeenCalled();
});
it("rejects oversized requests and invalid write arguments", async () => {
  expect((await rpc("tools/call", { name: "save_training_state", arguments: { state, revision: -1 } }, "train")).data.result.isError).toBe(true);
  expect((await rpc("tools/call", { name: "save_training_state", arguments: { state: {}, revision: 0 } }, "train")).data.result.isError).toBe(true);
});
