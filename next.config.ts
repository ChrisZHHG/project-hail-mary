import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Was `output: "export"` (a fully static `out/` folder). Dropped Aug 2026: a
  // static export has to enumerate every dynamic route at build time, so
  // `/session/[workoutId]` could only ever serve the three seeded workout ids —
  // which made user-authored programs impossible. A real Vercel build renders
  // those on demand. See docs/MARKET-READINESS.md.
  //
  // The app is still client-rendered and offline-first (IndexedDB is the source
  // of truth); the server only ships the shell. Nothing reads a request here.
  images: { unoptimized: true },
  // Pin the workspace root so Next doesn't pick up a stray parent lockfile.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
