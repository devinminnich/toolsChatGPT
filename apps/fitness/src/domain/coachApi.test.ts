import { expect, it, vi } from "vitest";
import { createHandler, workoutResults, type Reader, type WorkoutRow } from "../../supabase/functions/fitness-coach/handler";
const row: WorkoutRow = {session_id: "session-a", name: "Legs", performed_on: "2026-10-06", payload: {
  unit: "lb", exercises: [{exercise: {id: "seated-leg-press", name: "Leg press", metric: "reps", loaded: true}, sets: [
    {type: "Working", weight: 210, reps: 12, completedAt: 123, difficulty: "Easy"},
    {type: "Working", weight: 220, reps: 10},
    {type: "Working", weight: 220, reps: 10, skipped: true},
  ]}],
}};
const reader: Reader = {list: vi.fn(async () => [row]), get: vi.fn(async (id) => id === row.session_id ? row : null)};
const authenticate = vi.fn(async (token: string) => token === "authorized" ? reader : null);
const handler = createHandler({resource: "https://example.test/fitness-coach/mcp", issuer: "https://auth.test/auth/v1", authenticate});
const call = (method: string, params?: unknown, token?: string) => handler(new Request("https://example.test/fitness-coach/mcp", {
  method: "POST", headers: {"Content-Type": "application/json", ...(token ? {Authorization: `Bearer ${token}`} : {})},
  body: JSON.stringify({jsonrpc: "2.0", id: 1, method, params}),
}));
it("exposes OAuth discovery and read-only tool metadata without results", async () => {
  const response = await handler(new Request("https://example.test/fitness-coach/.well-known/oauth-protected-resource"));
  expect(await response.json()).toMatchObject({authorization_servers: ["https://auth.test/auth/v1"]});
  const initialized = await (await call("initialize", {protocolVersion: "2025-06-18"})).json();
  expect(initialized.result.protocolVersion).toBe("2025-06-18");
  const listed = await (await call("tools/list")).json();
  expect(listed.result.tools).toHaveLength(2);
  expect(listed.result.tools.every((t: any) => t.annotations.readOnlyHint)).toBe(true);
});
it("blocks signed-out, invalid, and revoked access before any data read", async () => {
  for (const token of [undefined, "invalid", "revoked"]) {
    const response = await call("tools/call", {name: "list_completed_workouts"}, token);
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("oauth-protected-resource");
  }
});
it("retrieves logged results and distinguishes planned and skipped sets", async () => {
  const response = await call("tools/call", {name: "get_workout_results", arguments: {sessionId: "session-a"}}, "authorized");
  const body = await response.json();
  expect(body.result.structuredContent.exercises[0].sets.map((s: any) => s.status)).toEqual(["completed", "unlogged", "skipped"]);
  expect(workoutResults(row).exercises[0].sets[1].difficulty).toBeNull();
});
it("does not expose another account's missing session", async () => {
  const response = await call("tools/call", {name: "get_workout_results", arguments: {sessionId: "other-account"}}, "authorized");
  expect((await response.json()).result.isError).toBe(true);
});
it("rejects invalid dates, excessive pages and write tools", async () => {
  for (const params of [
    {name: "list_completed_workouts", arguments: {after: "2026-02-30"}},
    {name: "list_completed_workouts", arguments: {limit: 999}},
    {name: "list_completed_workouts", arguments: {after: "2026-10-07", before: "2026-10-01"}},
    {name: "delete_workout", arguments: {}},
  ]) expect((await (await call("tools/call", params, "authorized")).json()).error.code).toBe(-32602);
});
it("rejects unexpected browser origins", async () => {
  const request = new Request("https://example.test/fitness-coach/mcp", {method: "POST", headers: {Origin: "https://untrusted.test"}, body: "{}"});
  expect((await handler(request)).status).toBe(403);
});
