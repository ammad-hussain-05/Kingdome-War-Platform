import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // ← yeh add karo
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpackDevMiddleware: (config) => {
    // Force polling for file changes (Windows friendly)
    config.watchOptions = {
      poll: 1000, // check every 1 second
      aggregateTimeout: 300,
    };
    return config;
  },
  experimental: {
    turbopack: false, // Disable Turbopack for dev
  },
};

export default nextConfig;