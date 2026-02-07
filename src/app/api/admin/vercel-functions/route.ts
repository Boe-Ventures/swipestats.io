import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { geolocation, ipAddress, getEnv } from "@vercel/functions";

/**
 * Admin showcase endpoint for @vercel/functions helpers.
 * Demonstrates geolocation, ipAddress, and getEnv utilities.
 *
 * Only works in production on Vercel — locally most values will be undefined/empty.
 */
export async function GET(request: NextRequest) {
  // @vercel/functions helpers
  const geo = geolocation(request);
  const ip = ipAddress(request);
  const env = getEnv();

  // Raw headers for comparison
  const rawHeaders = {
    city: request.headers.get("x-vercel-ip-city") ?? undefined,
    country: request.headers.get("x-vercel-ip-country") ?? undefined,
    countryRegion: request.headers.get("x-vercel-ip-country-region") ?? undefined,
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
      region: env.VERCEL_REGION,
      env: env.VERCEL_ENV,
      url: env.VERCEL_URL,
      branchUrl: env.VERCEL_BRANCH_URL,
      gitCommitSha: env.VERCEL_GIT_COMMIT_SHA,
      gitCommitRef: env.VERCEL_GIT_COMMIT_REF,
      gitProvider: env.VERCEL_GIT_PROVIDER,
      gitRepoOwner: env.VERCEL_GIT_REPO_OWNER,
      gitRepoSlug: env.VERCEL_GIT_REPO_SLUG,
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
