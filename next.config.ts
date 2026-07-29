import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['medical-transmitter.duckdns.org', 'tb-engine.allianceindia.org'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.vercel.app;",
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Handle node modules that are used in client-side code
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      };
    }
    
    // Handle canvas module
    config.externals = config.externals || [];
    config.externals.push('canvas');
    
    return config;
  },
};

export default nextConfig;
