import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { AUTH_RETURN_TO_HEADER } from "@/lib/auth-utils";
import { SWIPESTATS_HOME_MARKDOWN } from "@/lib/agent-content";
import {
  markdownResponse,
  negotiatePageRepresentation,
} from "@/lib/content-negotiation";

export function proxy(request: NextRequest): Response {
  if (request.nextUrl.pathname === "/") {
    const selected = negotiatePageRepresentation(request.headers.get("accept"));
    if (selected === null) {
      return new Response(
        "Not Acceptable\n\nAvailable representations: text/html, text/markdown\n",
        {
          status: 406,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            Vary: "Accept, Accept-Encoding",
          },
        },
      );
    }
    if (selected === "text/markdown") {
      return markdownResponse(SWIPESTATS_HOME_MARKDOWN);
    }
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    AUTH_RETURN_TO_HEADER,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/", "/app/:path*", "/admin/:path*"],
};
