import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next doesn't pick up a stray
  // lockfile in a parent directory when inferring file-tracing roots.
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
