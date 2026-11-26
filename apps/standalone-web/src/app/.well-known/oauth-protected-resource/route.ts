import {
  SWIPESTATS_AUTH_ISSUER,
  SWIPESTATS_MCP_RESOURCE,
  SWIPESTATS_MCP_SCOPE,
} from "@/server/mcp/config";

export function GET() {
  return Response.json(
    {
      resource: SWIPESTATS_MCP_RESOURCE,
      authorization_servers: [SWIPESTATS_AUTH_ISSUER],
      scopes_supported: [SWIPESTATS_MCP_SCOPE, "offline_access"],
    },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
