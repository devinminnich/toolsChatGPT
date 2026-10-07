import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createHandler, type WorkoutRow } from "./handler.ts";
import { emptyState, type State } from "./generated/model.ts";
import type { CoachProposal } from "./generated/plugin.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_ANON_KEY")!;
let widgetCache: { html: string; until: number } | undefined;
// No service-role access. Every result query runs as the caller and obeys RLS.
const handler = createHandler({
  resource: `${url}/functions/v1/fitness-coach/mcp`, issuer: `${url}/auth/v1`,
  widgetHtml: async () => {
    if (widgetCache && widgetCache.until > Date.now()) return widgetCache.html;
    const response = await fetch("https://devinminnich.github.io/toolsChatGPT/fitness/plugin-ui.html", { redirect: "error" });
    if (!response.ok) throw new Error("Plugin UI unavailable");
    const html = await response.text();
    if (!html.includes("Fitness Coach in ChatGPT") || html.length > 3000000) throw new Error("Invalid UI artifact");
    widgetCache = { html, until: Date.now() + 60000 };
    return html;
  },
  authenticate: async (token) => {
    const client = createClient(url, key, {
      global: {headers: {Authorization: `Bearer ${token}`}},
      auth: {persistSession: false, autoRefreshToken: false},
    });
    const {data, error} = await client.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return null;
    // Validate signed claims through Auth before using them to check consent.
    const claims = JSON.parse(atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")));
    if (typeof claims.client_id !== "string" || claims.iss !== `${url}/auth/v1` ||
      !(claims.aud === "authenticated" || (Array.isArray(claims.aud) && claims.aud.includes("authenticated")))) return null;
    const grant = await client.from("fitness_coach_grants").select("client_id,access_mode")
      .eq("user_id", data.user.id).eq("client_id", claims.client_id).maybeSingle();
    if (grant.error || !grant.data) return null;
    const base = () => client.from("fitness_completed_workouts")
      .select("session_id,name,performed_on,payload").eq("user_id", data.user!.id);
    return {
      plugin: grant.data.access_mode === "train" ? {
        snapshot: async () => {
          const { data: row, error } = await client.from("fitness_plugin_state").select("payload,revision").eq("user_id", data.user!.id).maybeSingle();
          if (error) throw error;
          const state = (row?.payload ?? emptyState()) as State;
          const known = new Set(state.history.map((s) => s.id));
          const history = [...state.history];
          for (let from = 0; ; from += 500) {
            const { data: rows, error } = await base().order("session_id").range(from, from + 499);
            if (error) throw error;
            for (const row of rows ?? []) {
              const session = row.payload as State["history"][number];
              if (!known.has(session.id)) { history.push(session); known.add(session.id); }
            }
            if (!rows || rows.length < 500) break;
          }
          return { state: { ...state, history: history.sort((a, b) => a.startedAt - b.startedAt), cloudOwnerId: data.user!.id, cloudSyncEnabled: false }, revision: Number(row?.revision ?? 0) };
        },
        save: async (state, revision) => {
          const { data: saved, error } = await client.rpc("fitness_save_plugin_state", {
            next_payload: { ...state, cloudOwnerId: data.user!.id, cloudSyncEnabled: false }, expected_revision: revision,
          });
          if (error) throw error;
          return Number(saved);
        },
        proposals: async () => {
          const { data: rows, error } = await client.from("fitness_coach_proposals").select("id,request_id,payload,created_at")
            .eq("user_id", data.user!.id).eq("reviewed", false).order("created_at").limit(50);
          if (error) throw error;
          return (rows ?? []).map((p) => ({ id: p.id, requestId: p.request_id, payload: p.payload, createdAt: p.created_at })) as CoachProposal[];
        },
        propose: async (requestId, payload) => {
          const { data: rows, error } = await client.from("fitness_coach_proposals").upsert({ user_id: data.user!.id, request_id: requestId, payload }, { onConflict: "user_id,request_id", ignoreDuplicates: true });
          if (error) throw error;
          const { data: row, error: readError } = await client.from("fitness_coach_proposals").select("id,request_id,payload,created_at").eq("user_id", data.user!.id).eq("request_id", requestId).single();
          if (readError) throw readError;
          return { id: row.id, requestId: row.request_id, payload: row.payload, createdAt: row.created_at } as CoachProposal;
        },
        review: async (id) => {
          const { error } = await client.from("fitness_coach_proposals").update({ reviewed: true }).eq("user_id", data.user!.id).eq("id", id);
          if (error) throw error;
        },
      } : undefined,
      list: async ({limit, offset, after, before, exerciseId}) => {
        let query = base().order("performed_on", {ascending: false}).order("session_id");
        if (after) query = query.gte("performed_on", after);
        if (before) query = query.lte("performed_on", before);
        if (exerciseId) query = query.contains("payload", {exercises: [{exercise: {id: exerciseId}}]});
        const {data: rows, error} = await query.range(offset, offset + limit - 1);
        if (error) throw error;
        return rows as WorkoutRow[];
      },
      get: async (id) => {
        const {data: row, error} = await base().eq("session_id", id).maybeSingle();
        if (error) throw error;
        return row as WorkoutRow | null;
      },
    };
  },
});
Deno.serve(handler);
