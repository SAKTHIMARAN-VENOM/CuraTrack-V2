import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  turbopack: {},
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '192.168.1.10:3000', '127.0.0.1:3000'],
    },
  },
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;


