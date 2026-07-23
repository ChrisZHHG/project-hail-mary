"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/data/auth";
import { startAutoSync, stopAutoSync } from "@/lib/data/autoSync";

/** App-wide: starts auto-sync when signed in, stops on sign-out. Renders nothing.
 *  Keyed on the user id (not the session object) so token refreshes don't churn
 *  the subscription. No-op when cloud is unconfigured (useSession stays null). */
export default function CloudSyncManager() {
  const userId = useSession()?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;
    void startAutoSync(userId);
    return () => stopAutoSync();
  }, [userId]);

  return null;
}
