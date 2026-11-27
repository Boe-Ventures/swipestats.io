import type { AuthInfo } from "@modelcontextprotocol/server";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import {
  SWIPESTATS_AUTH_ISSUER,
  SWIPESTATS_JWKS_URL,
  SWIPESTATS_MCP_RESOURCE,
  SWIPESTATS_MCP_RESOURCE_METADATA,
  SWIPESTATS_MCP_SCOPE,
} from "@/server/mcp/config";
import { connectorContext, swipeStatsMcpHandler } from "@/server/mcp/server";
import { verifyMcpApiKey } from "@/server/mcp/api-key-auth";
import { SWIPESTATS_API_KEY_PREFIX } from "@/lib/api-keys";
const { verifyAccessToken } = oauthProviderResourceClient().getActions();
function unauthorized() {
  return Response.json(
    { error: "invalid_token" },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": `Bearer resource_metadata="${SWIPESTATS_MCP_RESOURCE_METADATA}", scope="${SWIPESTATS_MCP_SCOPE}"`,
      },
    },
  );
}
async function handle(request: Request) {
  const bearer = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i)?.[1];
  const apiKey = request.headers.get("x-api-key");
  if (apiKey && bearer)
    return Response.json(
      { error: "Use one authentication header" },
      { status: 400 },
    );
  const token = apiKey ?? bearer;
  if (!token) return unauthorized();
  let authInfo: AuthInfo;
  try {
    if (apiKey !== null || token.startsWith(SWIPESTATS_API_KEY_PREFIX)) {
      const verified = await verifyMcpApiKey(token);
      if (!verified.authInfo) {
        if (verified.status === 429)
          return Response.json(
            { error: "API key rate limit exceeded" },
            {
              status: 429,
              headers: { "Retry-After": "60", "Cache-Control": "no-store" },
            },
          );
        return unauthorized();
      }
      authInfo = verified.authInfo;
    } else {
      const claims = await verifyAccessToken(token, {
        verifyOptions: {
          audience: SWIPESTATS_MCP_RESOURCE,
          issuer: SWIPESTATS_AUTH_ISSUER,
        },
        jwksUrl: SWIPESTATS_JWKS_URL,
      });
      if (typeof claims.sub !== "string" || typeof claims.azp !== "string")
        return unauthorized();
      authInfo = {
        token,
        clientId: claims.azp,
        scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
        expiresAt: claims.exp,
        resource: new URL(SWIPESTATS_MCP_RESOURCE),
        extra: { userId: claims.sub },
      };
    }
    await connectorContext(authInfo);
  } catch {
    return unauthorized();
  }
  return swipeStatsMcpHandler.fetch(request, { authInfo });
}
export { handle as GET, handle as POST, handle as DELETE };
export const maxDuration = 800;
