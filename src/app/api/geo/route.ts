import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Returns geolocation information derived from Vercel's IP headers.
 * Only works in production on Vercel — locally all values will be undefined.
 *
 * Headers used:
 *  - X-Vercel-IP-City
 *  - X-Vercel-IP-Country
 *  - X-Vercel-IP-Country-Region
 *  - X-Vercel-IP-Latitude
 *  - X-Vercel-IP-Longitude
 *  - X-Vercel-IP-Timezone
 */
export async function GET(request: NextRequest) {
  const geo = {
    city: request.headers.get("x-vercel-ip-city") ?? undefined,
    country: request.headers.get("x-vercel-ip-country") ?? undefined,
    countryRegion:
      request.headers.get("x-vercel-ip-country-region") ?? undefined,
    latitude: request.headers.get("x-vercel-ip-latitude") ?? undefined,
    longitude: request.headers.get("x-vercel-ip-longitude") ?? undefined,
    timezone: request.headers.get("x-vercel-ip-timezone") ?? undefined,
    ip:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      undefined,
  };

  return NextResponse.json(geo, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
