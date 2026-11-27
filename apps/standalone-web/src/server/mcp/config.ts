import "server-only";

import { env } from "@/env";
import {
  SWIPESTATS_ACCOUNT_SCOPE,
  SWIPESTATS_LEGACY_READ_SCOPE,
} from "@/lib/mcp-permissions";

export const SWIPESTATS_MCP_SCOPE = SWIPESTATS_ACCOUNT_SCOPE;
export const SWIPESTATS_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  SWIPESTATS_MCP_SCOPE,
] as const;
// Existing read-only clients can reconnect without gaining write access.
export const SWIPESTATS_SUPPORTED_OAUTH_SCOPES = [
  ...SWIPESTATS_OAUTH_SCOPES,
  SWIPESTATS_LEGACY_READ_SCOPE,
];

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
