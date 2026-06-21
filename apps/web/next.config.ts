import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the monorepo root so Turbopack doesn't walk up to a stray parent lockfile.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
