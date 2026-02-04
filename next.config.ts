import type { NextConfig } from "next";

// Ensure Stripe env vars exist during build (e.g. Vercel) so "Collecting page data" does not throw
if (typeof process.env.STRIPE_SECRET_KEY === "undefined" || process.env.STRIPE_SECRET_KEY === "") {
  process.env.STRIPE_SECRET_KEY = "sk_test_build_placeholder";
}
if (typeof process.env.STRIPE_SECRET_KEY_NEW === "undefined") {
  process.env.STRIPE_SECRET_KEY_NEW = "";
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "**.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    ],
  },

  // Build-time fallback so Stripe env checks don't fail when only using Square
  env: {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "sk_test_build_placeholder",
    STRIPE_SECRET_KEY_NEW: process.env.STRIPE_SECRET_KEY_NEW ?? "",
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://api.resend.com https://vercel.live wss://*.pusher.com https://*.pusher.com",
              "frame-src 'self' https://checkout.square.site https://web.squarecdn.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; ')
          }
        ],
      },
    ];
  },
};

export default nextConfig;
