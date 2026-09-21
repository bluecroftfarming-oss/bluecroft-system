import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // NOTE: deliberately NOT using output: "standalone". Next's dependency
  // tracer doesn't reliably follow better-sqlite3's dynamic native-binding
  // require, which silently breaks the DB in a trimmed standalone build.
  // The Docker image instead ships full node_modules and runs `next start`.
};

export default nextConfig;
