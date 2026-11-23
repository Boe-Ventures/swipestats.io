export const SWIPESTATS_API_KEY_PREFIX = "swipestats_";
export const SWIPESTATS_API_KEY_PERMISSIONS = { swipestats: ["read"] };
export const API_KEY_LIFETIMES = [30, 90, 365, null] as const;
export const LOVE_STORIES_ACCESS = ["read", "write"] as const;
export type LoveStoriesAccess = (typeof LOVE_STORIES_ACCESS)[number];
export type McpPermission =
  | "swipestats:read"
  | "loveStories:read"
  | "loveStories:write";

export function apiKeyPermissions(access: LoveStoriesAccess) {
  return {
    ...SWIPESTATS_API_KEY_PERMISSIONS,
    loveStories: access === "write" ? ["read", "write"] : ["read"],
  };
}

export function apiKeyScopes(value: unknown): McpPermission[] {
  let permissions: unknown = value;
  if (typeof permissions === "string") {
    try {
      permissions = JSON.parse(permissions);
    } catch {
      return [];
    }
  }
  if (!permissions || typeof permissions !== "object") return [];
  const has = (resource: string, action: string) => {
    const actions: unknown = Reflect.get(permissions, resource);
    return Array.isArray(actions) && actions.includes(action);
  };
  const scopes: McpPermission[] = [];
  if (has("swipestats", "read")) scopes.push("swipestats:read");
  if (has("loveStories", "read")) {
    scopes.push("loveStories:read");
    if (has("loveStories", "write")) scopes.push("loveStories:write");
  }
  return scopes;
}

export function loveStoriesAccess(value: unknown): LoveStoriesAccess | "none" {
  const scopes = apiKeyScopes(value);
  return scopes.includes("loveStories:write")
    ? "write"
    : scopes.includes("loveStories:read")
      ? "read"
      : "none";
}
