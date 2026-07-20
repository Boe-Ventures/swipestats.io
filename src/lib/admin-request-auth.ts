import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "@/env";
import { checkAdminAuth } from "@/lib/admin-auth";

function equalSecret(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return (
    leftBytes.length === rightBytes.length &&
    timingSafeEqual(leftBytes, rightBytes)
  );
}

/**
 * Admin routes accept either the same verified-email browser session used by
 * admin tRPC/page access, or ADMIN_TOKEN as a Bearer credential for scripts.
 * Secrets are never accepted in URLs, where proxies and logs retain them.
 */
export async function isAdminRequestAuthorized(
  request: Request,
): Promise<boolean> {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token, ...extra] = authorization.trim().split(/\s+/);
  if (
    extra.length === 0 &&
    scheme?.toLowerCase() === "bearer" &&
    token &&
    equalSecret(token, env.ADMIN_TOKEN)
  ) {
    return true;
  }

  return (await checkAdminAuth()).isAuthorized;
}
