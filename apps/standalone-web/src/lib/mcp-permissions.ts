import type { McpPermission } from "./api-keys";

export const SWIPESTATS_ACCOUNT_SCOPE = "swipestats:all";
export const SWIPESTATS_LEGACY_READ_SCOPE = "swipestats:read";

export function oauthPermissions(scopes: readonly string[]): McpPermission[] {
  if (scopes.includes(SWIPESTATS_ACCOUNT_SCOPE))
    return ["swipestats:read", "loveStories:read", "loveStories:write"];
  return scopes.includes(SWIPESTATS_LEGACY_READ_SCOPE)
    ? ["swipestats:read"]
    : [];
}

export function oauthGrantAllows(
  tokenScopes: readonly string[],
  consentScopes: readonly string[],
  permission: McpPermission,
) {
  return (
    oauthPermissions(tokenScopes).includes(permission) &&
    oauthPermissions(consentScopes).includes(permission)
  );
}
