/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { isServer, nextRuntime }) => {
    // Empeche le bundler Edge de tenter de resoudre des modules Node natifs
    // utilises uniquement par lib/watch/runner.ts (fs, path).
    if (nextRuntime === "edge" || !isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        "fs/promises": false,
        path: false,
        "node:fs": false,
        "node:fs/promises": false,
        "node:path": false,
      };
    }
    return config;
  },
};

export default nextConfig;
