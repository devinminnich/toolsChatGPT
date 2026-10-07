import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createHandler, type WorkoutRow } from "./handler.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_ANON_KEY")!;
// No service-role access. Every result query runs as the caller and obeys RLS.
const handler = createHandler({
  resource: `${url}/functions/v1/fitness-coach/mcp`, issuer: `${url}/auth/v1`,
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
    const grant = await client.from("fitness_coach_grants").select("client_id")
      .eq("user_id", data.user.id).eq("client_id", claims.client_id).maybeSingle();
    if (grant.error || !grant.data) return null;
    const base = () => client.from("fitness_completed_workouts")
      .select("session_id,name,performed_on,payload").eq("user_id", data.user!.id);
    return {
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
