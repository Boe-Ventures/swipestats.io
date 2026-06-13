import "server-only";

import { NextResponse } from "next/server";

import { env } from "@/env";
import { getSession } from "@/server/better-auth/server";

export type DevGuardResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/**
 * Guard for the `/api/dev/*` endpoints.
 *
 * These are developer conveniences (bulk photo/library/export downloads) and
 * must never be reachable from a deployed environment — on Vercel both preview
 * and production run `next build`, so `NODE_ENV` is "production" there and only
 * `next dev` (local) reports "development". We therefore 404 everywhere except
 * local dev, then require an authenticated session and hand back the user id.
 */
export async function resolveDevUser(): Promise<DevGuardResult> {
  if (env.NODE_ENV !== "development") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }

  const session = await getSession();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true, userId: session.user.id };
}
