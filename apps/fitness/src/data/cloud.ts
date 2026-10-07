import { createClient } from "@supabase/supabase-js";
import { cloudKey, cloudUrl } from "./cloudConfig";
import type { Session } from "../domain/model";

export const cloud = createClient(cloudUrl, cloudKey, {
  auth: { storageKey: "fitness-cloud-auth", detectSessionInUrl: false },
});

export function completedHistory(history: Session[]): Session[] {
  return history.filter((s) => s.imported || s.finishedAt !== undefined);
}

export function historyDate(s: Session): string {
  if (s.performedOn) return s.performedOn;
  const date = new Date(s.startedAt);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

export function mergeHistory(local: Session[], remote: Session[]): Session[] {
  const ids = new Set(local.map((s) => s.id));
  return [...local, ...remote.filter((s) => !ids.has(s.id))]
    .sort((a, b) => a.startedAt - b.startedAt);
}

export async function syncHistory(userId: string, history: Session[]): Promise<Session[]> {
  // First copy of a finished session wins; routine edits cannot rewrite results.
  // Batches keep large imported histories within request limits.
  const rows = completedHistory(history).map((s) => ({
    user_id: userId, session_id: s.id, name: s.name,
    performed_on: historyDate(s), payload: s,
  }));
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await cloud.from("fitness_completed_workouts")
      .upsert(rows.slice(i, i + 100), { onConflict: "user_id,session_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  const remote: Session[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await cloud.from("fitness_completed_workouts")
      .select("payload").eq("user_id", userId).order("session_id")
      .range(from, from + 499);
    if (error) throw error;
    for (const row of data ?? []) {
      const s = row.payload as Session;
      if (s && typeof s.id === "string" && Number.isFinite(s.startedAt) && Array.isArray(s.exercises)) remote.push(s);
    }
    if (!data || data.length < 500) break;
  }
  return remote;
}
