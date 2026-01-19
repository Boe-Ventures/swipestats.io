import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/", // Home
          "/blog", // Blog
          "/blog/*", // Blog posts
          "/upload", // Upload pages
          "/research", // Research
          "/directory", // Directory
          "/how-to-request-your-data",
          "/contact",
          "/privacy",
          "/tos",
        ],
        disallow: [
          "/insights/*", // Block all user insights (sensitive dating data)
          "/app/*", // Block authenticated app pages
          "/api/*", // Block API routes
          "/share/*", // Block share pages (may contain user data)
          "/demo", // Block demo page
          "/signin", // Block auth pages
          "/signup",
          "/reset-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: "https://www.swipestats.io/sitemap.xml",
  };
}
