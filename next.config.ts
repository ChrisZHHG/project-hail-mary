import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is 100% client-side (IndexedDB, no server), so we export a fully
  // static site. The `out/` folder can be dragged to Vercel Drop / Netlify Drop
  // or served by any static host. (Remove `output: "export"` later if/when we add
  // Supabase API routes and deploy via a real Vercel build.)
  output: "export",
  images: { unoptimized: true },
  // Pin the workspace root so Next doesn't pick up a stray parent lockfile.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
