import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const configuredUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const configuredKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// This project's Supabase endpoint and publishable key are safe for browser use.
// Environment variables still override these defaults for alternate deployments.
const url = configuredUrl ?? 'https://rhiqlmgswblmbripzevd.supabase.co';
const publishableKey = configuredKey ?? 'sb_publishable_LBVBoIzpbEG99gqlMzzBlA_p-5gUSQ4';

export const supabase: SupabaseClient | null = url && publishableKey
  ? createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseConfigured = Boolean(supabase);
