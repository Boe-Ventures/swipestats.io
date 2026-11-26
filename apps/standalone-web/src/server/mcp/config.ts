import "server-only";

import { env } from "@/env";

export const SWIPESTATS_MCP_SCOPE = "swipestats:read";
export const SWIPESTATS_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  SWIPESTATS_MCP_SCOPE,
] as const;

const configuredBaseUrl = new URL(env.NEXT_PUBLIC_BASE_URL);

export const SWIPESTATS_PUBLIC_ORIGIN = configuredBaseUrl.origin;
export const SWIPESTATS_AUTH_ISSUER = new URL(
  "/api/auth",
  SWIPESTATS_PUBLIC_ORIGIN,
)
  .toString()
  .replace(/\/$/, "");
export const SWIPESTATS_JWKS_URL = `${SWIPESTATS_AUTH_ISSUER}/jwks`;
export const SWIPESTATS_MCP_RESOURCE = new URL(
  "/api/mcp",
  SWIPESTATS_PUBLIC_ORIGIN,
).toString();
export const SWIPESTATS_MCP_RESOURCE_METADATA = new URL(
  "/.well-known/oauth-protected-resource",
  SWIPESTATS_PUBLIC_ORIGIN,
).toString();
