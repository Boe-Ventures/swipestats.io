/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.ts";
import type { NextConfig } from "next";

const config: NextConfig = {
  /** Enable MDX pages */
  pageExtensions: ["ts", "tsx", "md", "mdx"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
    localPatterns: [
      {
        pathname: "/api/**",
        // Omitting 'search' allows all query strings
      },
      {
        pathname: "/**",
        // Allow all local images (public folder)
      },
    ],
  },
  trailingSlash: false,
  skipTrailingSlashRedirect: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self'",
          },
        ],
      },
    ];
  },

  // PostHog reverse proxy (improves tracking reliability, bypasses ad blockers)
  async rewrites() {
    return [
      // PostHog static assets (session recordings, surveys, etc.)
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      // PostHog API (events, feature flags, decide endpoint, etc.)
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
};

export default config;
