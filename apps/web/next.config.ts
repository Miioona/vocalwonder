import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the shared workspace package (it ships TypeScript source).
  transpilePackages: ["@vocalwonder/core"],
};

export default nextConfig;
