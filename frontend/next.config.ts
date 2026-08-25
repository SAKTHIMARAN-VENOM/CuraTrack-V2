import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@splinetool/react-spline', '@splinetool/runtime'],
  turbopack: {},
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', '192.168.1.10:3000', '127.0.0.1:3000'],
    },
  },
  webpack: (config, { dev, isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@splinetool/react-spline$'] = path.resolve(
      __dirname,
      'node_modules/@splinetool/react-spline/dist/react-spline.js'
    );

    if (dev && !isServer) {
      config.watchOptions = {
        ignored: ['**/node_modules/**', '**/.next/**'],
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
