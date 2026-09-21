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
  // ⚠️ SUPPRIMÉ : "@prisma/client" de serverExternalPackages
  // Sinon Turbopack génère un module hashed (@prisma/client-2c3a283f134fdcb6)
  // qui n'existe nulle part.
  serverExternalPackages: ["sharp"],
  images: { unoptimized: true },
};

export default nextConfig;