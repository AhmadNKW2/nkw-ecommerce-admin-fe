import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === 'development';
// 1. Read the environment variable dynamically
const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;

// 2. Parse the hostname safely at runtime/build-time
let r2Hostname = '';
if (r2PublicUrl) {
  try {
    r2Hostname = new URL(r2PublicUrl).hostname;
  } catch (error) {
    console.warn('Could not parse R2_PUBLIC_URL in next.config.ts:', error);
  }
}

const backendOrigin = (process.env.BACKEND_ORIGIN || 'http://localhost:3001').replace(/\/$/, '');

const nextConfig: NextConfig = {
  // One env var for server + client (API URL is not secret).
  env: {
    BACKEND_ORIGIN: backendOrigin,
  },
  ...(isDevelopment 
    ? {}
    : {
      experimental: {
        // Route handlers still buffer bodies; uploads bypass /api when possible.
        proxyClientMaxBodySize: '50mb',
        optimizePackageImports: ['lucide-react', '@tanstack/react-query', 'framer-motion'],
      },
    }),
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**',
      },
      // 3. Inject the resolved hostname dynamically if it was successfully parsed
      ...(r2Hostname
        ? [
          {
            protocol: 'https' as const,
            hostname: r2Hostname,
            pathname: '/**',
          },
        ]
        : []),
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true,
  },
};

export default nextConfig;