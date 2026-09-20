import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingIncludes: {
    "/**/*": [
      "./node_modules/.prisma/**/*",
      "./node_modules/@prisma/client/**/*",
      "./node_modules/@prisma/engines/**/*",
      "./prisma/schema.prisma",
    ],
  },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  serverExternalPackages: ["@prisma/client", "prisma", "sharp"],
  images: { unoptimized: true },
};

export default nextConfig;