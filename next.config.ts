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
};

export default config;
