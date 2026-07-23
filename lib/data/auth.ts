"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Auth layer (Phase 2). Magic-link email sign-in — the simplest flow, and it
 * works in the static-export PWA (Supabase parses the returning link
 * client-side). Cloud-optional: with no Supabase configured `useSession` is
 * always null and the app stays fully local.
 */

/** Current Supabase session, or null (signed out / cloud not configured).
 *  Subscribes to auth changes so sign-in/out re-renders callers. */
export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return session;
}

/** Send a magic-link sign-in email. Returns an error message on failure. */
export async function signInWithEmail(email: string): Promise<{ error?: string }> {
  if (!supabase) return { error: "cloud-not-configured" };
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      // Magic link returns the user to whatever origin they signed in from
      // (localhost in dev, the Vercel domain in prod).
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
