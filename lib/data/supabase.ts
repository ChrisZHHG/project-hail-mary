import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client (Phase 2 — cloud sync + auth).
 *
 * Local-first stays intact: when the env vars are absent, `supabase` is `null`
 * and the whole app runs purely on Dexie (no cloud). Cloud features check
 * `isCloudConfigured` / a non-null client before doing anything.
 *
 * The anon key is PUBLIC by design — it ships in the client bundle and is
 * gated by row-level security. The service-role key must NEVER appear here.
 *
 * These are `NEXT_PUBLIC_*` so they inline at build time (the app is a static
 * export with no server). Set them in `.env.local` locally and in the Vercel
 * project's env for deploys.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when a Supabase project is configured — cloud sync/auth is available. */
export const isCloudConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // Magic-link lands back on the app with the session in the URL; persist
        // it and keep it fresh so a returning PWA stays signed in offline.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
