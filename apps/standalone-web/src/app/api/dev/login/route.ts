/**
 * DEV-ONLY passwordless login for local agent / computer-use testing.
 *
 * This mints a real Better Auth session for an existing user without knowing
 * their password. It exists so local automation can act as a known dev user in
 * browser tabs or cookie-backed HTTP calls. It returns 404 unless the app is
 * running under `next dev` (`NODE_ENV === "development"`).
 *
 * Usage:
 *
 * 1. Browser / computer-use:
 *      http://localhost:3000/api/dev/login
 *    Sets the signed Better Auth session cookie and redirects to /app/dashboard.
 *
 * 2. Headless:
 *      curl -s "http://localhost:3000/api/dev/login?mode=token"
 *    Returns { cookieName, signedToken, cookieHeader, userId, email, expiresAt }.
 *    Pass the cookie header to authenticated requests:
 *      curl -H "Cookie: <cookieHeader>" http://localhost:3000/api/auth/get-session
 *
 * Query params:
 *   ?email=<addr>     user to log in as (default: kristian.e.boe@gmail.com)
 *   ?userId=<id>      look up by id instead of email (takes precedence)
 *   ?mode=token       return JSON instead of redirecting
 *   ?redirect=<path>  where to 302 after setting the cookie (default: /app/dashboard)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { makeSignature } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import { env } from "@/env";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { userTable } from "@/server/db/schema";

const DEFAULT_EMAIL = "kristian.e.boe@gmail.com";
const DEFAULT_REDIRECT = "/app/dashboard";

function notFound() {
  return new NextResponse("Not Found", { status: 404 });
}

function safeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_REDIRECT;
  }
  return value;
}

export async function GET(req: NextRequest) {
  if (env.NODE_ENV !== "development") {
    return notFound();
  }

  const { searchParams } = req.nextUrl;
  const email = searchParams.get("email") ?? DEFAULT_EMAIL;
  const userId = searchParams.get("userId");
  const mode = searchParams.get("mode");
  const redirectPath = safeRedirectPath(searchParams.get("redirect"));

  const user = userId
    ? await db.query.userTable.findFirst({ where: eq(userTable.id, userId) })
    : await db.query.userTable.findFirst({
        where: eq(userTable.email, email),
      });

  if (!user) {
    return NextResponse.json(
      { error: "User not found", email, userId },
      { status: 404 },
    );
  }

  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(user.id);
  const signature = await makeSignature(session.token, ctx.secret);
  const signedToken = `${session.token}.${signature}`;
  const signedValue = encodeURIComponent(signedToken);
  const cookieName = ctx.authCookies.sessionToken.name;

  if (mode === "token") {
    return NextResponse.json({
      userId: user.id,
      email: user.email,
      cookieName,
      signedToken,
      cookieHeader: `${cookieName}=${signedValue}`,
      expiresAt: session.expiresAt,
    });
  }

  const res = NextResponse.redirect(new URL(redirectPath, req.url), {
    status: 302,
  });

  const attrs = ctx.authCookies.sessionToken.attributes;
  const parts = [`${cookieName}=${signedValue}`];
  parts.push(`Max-Age=${ctx.sessionConfig.expiresIn}`);
  parts.push(`Path=${attrs.path ?? "/"}`);
  if (attrs.httpOnly) parts.push("HttpOnly");
  if (attrs.secure) parts.push("Secure");
  if (attrs.sameSite) {
    const sameSite = String(attrs.sameSite);
    parts.push(
      `SameSite=${sameSite.charAt(0).toUpperCase()}${sameSite.slice(1)}`,
    );
  }
  if (attrs.domain) parts.push(`Domain=${attrs.domain}`);

  res.headers.append("Set-Cookie", parts.join("; "));

  return res;
}
