import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { geolocation, ipAddress, getEnv } from "@vercel/functions";
import { env } from "@/env";

/**
 * Admin showcase endpoint for @vercel/functions helpers.
 * Demonstrates geolocation, ipAddress, and getEnv utilities.
 *
 * GET /api/admin/vercel-functions?token=xxx
 *
 * Only works in production on Vercel — locally most values will be undefined/empty.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Verify admin token
  if (!token || token !== env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // @vercel/functions helpers
  const geo = geolocation(request);
  const ip = ipAddress(request);
  const vercelEnv = getEnv();

  // Raw headers for comparison
  const rawHeaders = {
    city: request.headers.get("x-vercel-ip-city") ?? undefined,
    country: request.headers.get("x-vercel-ip-country") ?? undefined,
    countryRegion:
      request.headers.get("x-vercel-ip-country-region") ?? undefined,
    latitude: request.headers.get("x-vercel-ip-latitude") ?? undefined,
    longitude: request.headers.get("x-vercel-ip-longitude") ?? undefined,
    timezone: request.headers.get("x-vercel-ip-timezone") ?? undefined,
    forwardedFor: request.headers.get("x-forwarded-for") ?? undefined,
  };

  const showcase = {
    timestamp: new Date().toISOString(),
    // Helper: geolocation() - includes flag emoji and region!
    geolocation: geo,
    // Helper: ipAddress() - extracts IP from headers
    ipAddress: ip,
    // Helper: getEnv() - Vercel system environment variables
    vercelEnv: {
      region: vercelEnv.VERCEL_REGION,
      env: vercelEnv.VERCEL_ENV,
      url: vercelEnv.VERCEL_URL,
      branchUrl: vercelEnv.VERCEL_BRANCH_URL,
      gitCommitSha: vercelEnv.VERCEL_GIT_COMMIT_SHA,
      gitCommitRef: vercelEnv.VERCEL_GIT_COMMIT_REF,
      gitProvider: vercelEnv.VERCEL_GIT_PROVIDER,
      gitRepoOwner: vercelEnv.VERCEL_GIT_REPO_OWNER,
      gitRepoSlug: vercelEnv.VERCEL_GIT_REPO_SLUG,
    },
    // Raw headers for comparison
    rawHeaders,
  };

  return NextResponse.json(showcase, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
