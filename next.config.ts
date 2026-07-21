/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { envSelect } from "./src/env";
import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Pin the workspace root to this project. Without this, Next.js walks up to
// the parent boe-ventures/ directory (which has a stray package.json +
// bun.lock from an accidental `bun install`) and resolves modules from there,
// breaking CSS imports like `tw-animate-css` that only live in
// swipestats/node_modules.
const projectRoot = dirname(fileURLToPath(import.meta.url));

// RFC 8288 Link header for agent discovery on the homepage. Points crawlers
// and LLMs at machine-readable resources — llms.txt, sitemap, the public
// research dataset, and key policy/help pages — without them having to parse
// HTML first. Relation types are IANA-registered where possible; the dataset
// uses "alternate" as the closest registered fit for a downloadable data
// representation of the site.
const agentDiscoveryLinkHeader = [
  '</llms.txt>; rel="describedby"; type="text/plain"; title="SwipeStats for AI agents"',
  '</sitemap.xml>; rel="sitemap"; type="application/xml"',
  '</downloads/swipestats-demo-dataset.jsonl>; rel="alternate"; type="application/jsonl"; title="SwipeStats free demo dataset"',
  '</research>; rel="related"; title="Research datasets"',
  '</how-to-request-your-data>; rel="help"',
  '</contact>; rel="author"',
  '</privacy>; rel="privacy-policy"',
  '</tos>; rel="terms-of-service"',
].join(", ");

const config: NextConfig = {
  allowedDevOrigins: ["swipestats.localhost", "*.swipestats.localhost"],

  /** Enable MDX pages */
  pageExtensions: ["ts", "tsx", "md", "mdx"],

  turbopack: {
    root: projectRoot,
  },

  outputFileTracingRoot: projectRoot,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.vercel-storage.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.gotinder.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.hingecdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "hinge-res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.hingenexus.com",
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
      {
        source: "/",
        headers: [{ key: "Link", value: agentDiscoveryLinkHeader }],
      },
    ];
  },

  async redirects() {
    return [
      // Legacy insights URL redirect
      {
        source: "/insights/:tinderId",
        destination: "/insights/tinder/:tinderId",
        permanent: true, // 308 redirect for SEO
      },
      // /app has no index page — redirect to dashboard
      {
        source: "/app",
        destination: "/app/dashboard",
        permanent: false,
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

export default withPostHogConfig(config, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY ?? "",
  projectId: envSelect({ prod: "26095", test: "132105" }),
  host: "https://eu.posthog.com",
  sourcemaps: {
    enabled: true,
    deleteAfterUpload: true,
  },
});
