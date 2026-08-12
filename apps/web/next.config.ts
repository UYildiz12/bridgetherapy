import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the monorepo root so Turbopack doesn't walk up to a stray parent lockfile.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  experimental: {
    // Let the client router reuse a just-visited dynamic page for 30s, so
    // hopping between nav items is instant instead of re-fetching every time.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
