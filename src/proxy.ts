import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_RETURN_TO_HEADER } from "@/lib/auth-utils";

export function proxy(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    AUTH_RETURN_TO_HEADER,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
