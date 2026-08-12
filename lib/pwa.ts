"use client";

/** PWA helpers — iOS standalone has no pull-to-refresh, so expose a manual
 *  hard refresh that drops the service worker + runtime caches then reloads.
 *
 *  Marked client-only: every function here touches `navigator` / `window` /
 *  `caches` unguarded. That was harmless under the old static export (there was
 *  no server to import it), but the app now renders on a real server — so this
 *  directive is what keeps it out of a server bundle. */

export async function hardRefreshApp(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  window.location.reload();
}

export async function softUpdateCheck(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  await reg.update();
  return !!reg.installing || !!reg.waiting;
}
