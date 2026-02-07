import { NextResponse } from "next/server";
import { env } from "@/env";

/**
 * TEMPORARY DEBUG ENDPOINT
 * Remove after diagnosing production environment detection issue
 */
export async function GET() {
  console.log("🐛 [DEBUG-ENV] Endpoint called");

  const debugInfo = {
    timestamp: new Date().toISOString(),
    // Client-side env vars (baked in at build time)
    client: {
      NEXT_PUBLIC_IS_PRODUCTION: env.NEXT_PUBLIC_IS_PRODUCTION,
      NEXT_PUBLIC_VERCEL_ENV: env.NEXT_PUBLIC_VERCEL_ENV,
      NEXT_PUBLIC_BASE_URL: env.NEXT_PUBLIC_BASE_URL,
    },
    // Server-side env vars
    server: {
      NODE_ENV: env.NODE_ENV,
      DATABASE_URL: env.DATABASE_URL ? "✓ Set" : "✗ Not set",
    },
    // Raw process.env values (to see if Vercel is setting them)
    raw: {
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    },
    // Computed values
    computed: {
      showDevTools: !env.NEXT_PUBLIC_IS_PRODUCTION,
      isProductionCheck:
        process.env.VERCEL_ENV === "production" &&
        process.env.VERCEL_PROJECT_PRODUCTION_URL === "www.swipestats.io",
    },
  };

  console.log("🐛 [DEBUG-ENV] Debug info:", JSON.stringify(debugInfo, null, 2));

  return NextResponse.json(debugInfo, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
