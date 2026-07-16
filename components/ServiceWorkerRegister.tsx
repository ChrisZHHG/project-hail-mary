"use client";

import { useEffect } from "react";

/** Registers the offline service worker and keeps the installed PWA fresh.
 *  iOS standalone mode has no address bar and no pull-to-refresh, so updates
 *  must be automatic: every time the app regains focus we ask the browser to
 *  re-check /sw.js; when a new version takes control we reload once. */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Dev server + HMR — registering a prod SW here blocks normal refresh.
    if (process.env.NODE_ENV === "development") return;

    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let reg: ServiceWorkerRegistration | undefined;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((r) => {
          reg = r;
          r.update().catch(() => {});
        })
        .catch(() => {
          /* offline support is progressive enhancement — ignore failures */
        });
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") reg?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("load", register);
    };
  }, []);
  return null;
}
