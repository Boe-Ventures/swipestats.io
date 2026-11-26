import "server-only";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { auth } from "@/server/better-auth";
import {
  apiKeyScopes,
  SWIPESTATS_API_KEY_PERMISSIONS,
  SWIPESTATS_API_KEY_PREFIX,
} from "@/lib/api-keys";
import { SWIPESTATS_MCP_RESOURCE } from "./config";

export async function verifyMcpApiKey(
  key: string,
): Promise<
  { authInfo: AuthInfo; status?: never } | { authInfo?: never; status: number }
> {
  if (!key.startsWith(SWIPESTATS_API_KEY_PREFIX)) return { status: 401 };
  const verified = await auth.api.verifyApiKey({
    body: {
      key,
      permissions: SWIPESTATS_API_KEY_PERMISSIONS,
    },
  });
  if (!verified.valid || !verified.key) {
    return { status: verified.error?.code === "RATE_LIMITED" ? 429 : 401 };
  }
  return {
    authInfo: {
      token: key,
      clientId: `api-key:${verified.key.id}`,
      scopes: apiKeyScopes(verified.key.permissions),
      ...(verified.key.expiresAt
        ? { expiresAt: Math.floor(verified.key.expiresAt.getTime() / 1000) }
        : {}),
      resource: new URL(SWIPESTATS_MCP_RESOURCE),
      extra: { userId: verified.key.referenceId, apiKeyId: verified.key.id },
    },
  };
}
