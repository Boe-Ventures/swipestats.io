import "server-only";
import {
  createMcpHandler,
  McpServer,
  type AuthInfo,
  type McpRequestContext,
} from "@modelcontextprotocol/server";
import { call, ORPCError, type AnyProcedure } from "@orpc/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  oauthClientTable,
  oauthConsentTable,
  userTable,
  apiKeyTable,
} from "@/server/db/schema";
import type { DomainContext } from "@/server/domains/context";
import { domainRouter } from "@/server/domains/router";
import { readConsent } from "@/lib/analytics/consent";
import { apiKeyScopes, type McpPermission } from "@/lib/api-keys";
import { SWIPESTATS_MCP_SCOPE } from "./config";

type ToolDefinition = {
  procedure: AnyProcedure;
  description: string;
  permission: McpPermission;
  readOnly: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  inputSchema?: z.ZodObject;
};
function procedureInput(procedure: AnyProcedure): z.ZodObject {
  const schemas = procedure["~orpc"].inputSchemas ?? [];
  if (schemas.length === 0) return z.strictObject({});
  if (schemas.length !== 1 || !(schemas[0] instanceof z.ZodObject))
    throw new Error("Unsupported MCP input schema");
  return schemas[0];
}
function datedInput(procedure: AnyProcedure, field: string, nested = false) {
  const schema = procedureInput(procedure);
  const date = z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .nullable()
    .optional();
  if (!nested) return schema.extend({ [field]: date });
  const changes: unknown = schema.shape.changes;
  if (!(changes instanceof z.ZodObject))
    throw new Error("Expected changes object");
  return schema.extend({ changes: changes.extend({ [field]: date }) });
}
const love = domainRouter.loveStories;
const readTool = (
  procedure: AnyProcedure,
  description: string,
): ToolDefinition => ({
  procedure,
  description,
  permission: "loveStories:read",
  readOnly: true,
});
const writeTool = (
  procedure: AnyProcedure,
  description: string,
  options: Pick<
    ToolDefinition,
    "inputSchema" | "destructive" | "idempotent"
  > = {},
): ToolDefinition => ({
  procedure,
  description,
  permission: "loveStories:write",
  readOnly: false,
  ...options,
});
const createHelp =
  " Supply a new UUID requestId for each capture; reuse it only when retrying the identical payload.";
const editHelp =
  " Use the latest version from a read. On CONFLICT, reload and reconcile before retrying. Omitted fields stay unchanged; null clears a nullable field.";
const loveStoryTools = {
  listLoveStoryPeople: readTool(
    love.person.list,
    "List your private Love Stories people, paginated by limit and offset.",
  ),
  getLoveStoryPerson: readTool(
    love.person.get,
    "Read one of your Love Stories people and their current version.",
  ),
  createLoveStoryPerson: writeTool(
    love.person.create,
    "Capture a person in your private Love Stories. Only record details supplied by the user. Dates use ISO 8601 with an offset; use time context for uncertainty." +
      createHelp,
    {
      idempotent: true,
      inputSchema: datedInput(love.person.create, "firstContactAt"),
    },
  ),
  updateLoveStoryPerson: writeTool(
    love.person.update,
    "Update a person's current information or overall reflection. Dates use ISO 8601 with an offset." +
      editHelp,
    {
      destructive: true,
      inputSchema: datedInput(love.person.update, "firstContactAt", true),
    },
  ),
  deleteLoveStoryPerson: writeTool(
    love.person.delete,
    "Permanently delete a person and their encounters. Entries remain, with links removed. Obtain the user's explicit instruction to delete." +
      editHelp,
    { destructive: true },
  ),
  listLoveStoryEncounters: readTool(
    love.encounter.list,
    "List a person's encounters in story order, including undated encounters. Supports limit and offset.",
  ),
  createLoveStoryEncounter: writeTool(
    love.encounter.create,
    "Append an encounter to a person's story. Instagram DMs use kind message, medium messaging, platform Instagram. occurredAt is ISO 8601 with an offset; dates are optional and timeContext captures uncertainty." +
      createHelp,
    {
      idempotent: true,
      inputSchema: datedInput(love.encounter.create, "occurredAt"),
    },
  ),
  updateLoveStoryEncounter: writeTool(
    love.encounter.update,
    "Update an encounter, place, map URL or reflection. occurredAt is ISO 8601 with an offset." +
      editHelp,
    {
      destructive: true,
      inputSchema: datedInput(love.encounter.update, "occurredAt", true),
    },
  ),
  reorderLoveStoryEncounters: writeTool(
    love.encounter.reorder,
    "Set chronological story order independently of dates. Supply every encounter ID and its latest version for this person in desired order. Read all pages first; on CONFLICT reload before retrying.",
  ),
  deleteLoveStoryEncounter: writeTool(
    love.encounter.delete,
    "Permanently delete an encounter. Entries remain; links and relative-date anchors are removed. Obtain the user's explicit instruction to delete." +
      editHelp,
    { destructive: true },
  ),
  listLoveStoryEntries: readTool(
    love.entry.list,
    "List your private reflections, optionally filtered by person or encounter, with limit and offset.",
  ),
  getLoveStoryEntry: readTool(
    love.entry.get,
    "Read one reflection, including its preserved original wording and linked people and encounters.",
  ),
  createLoveStoryEntry: writeTool(
    love.entry.create,
    "Capture a reflection and optionally link it to owned people or encounters. Preserve the user's wording. Use sourceKind transcript for dictation and summary for generated analysis." +
      createHelp,
    { idempotent: true },
  ),
  updateLoveStoryEntry: writeTool(
    love.entry.update,
    "Update a reflection or replace its links; the original body stays preserved. Omitted link arrays stay unchanged; an empty array clears those links." +
      editHelp,
    { destructive: true },
  ),
  deleteLoveStoryEntry: writeTool(
    love.entry.delete,
    "Permanently delete a reflection, including original wording and links. Obtain the user's explicit instruction to delete." +
      editHelp,
    { destructive: true },
  ),
  exportLoveStories: readTool(
    love.export,
    "Export all of your private Love Stories people, encounters, entries and links. Use only when the user requests a complete export or review.",
  ),
};

// Explicit projection. Imports, purchases, admin and raw dating-app messages are not tools.
export const toolProcedures = {
  listMyProfiles: {
    permission: "swipestats:read",
    readOnly: true,
    procedure: domainRouter.user.getUploadedProfiles,
    description:
      "List the dating-app profiles owned by your SwipeStats account.",
  },
  getSubscriptionStatus: {
    permission: "swipestats:read",
    readOnly: true,
    procedure: domainRouter.billing.getStatus,
    description: "Read your current SwipeStats tier and feature limits.",
  },
  getMySwipeRankSummary: {
    permission: "swipestats:read",
    readOnly: true,
    procedure: domainRouter.swipeRank.summary,
    description:
      "Read your own Tinder SwipeRank summary using a profile ID from listMyProfiles.",
  },
  ...loveStoryTools,
} satisfies Record<string, ToolDefinition>;

export async function connectorContext(
  authInfo: AuthInfo,
  required: McpPermission = "swipestats:read",
): Promise<DomainContext> {
  const userId = authInfo.extra?.userId;
  if (
    typeof userId !== "string" ||
    !authInfo.scopes.includes(SWIPESTATS_MCP_SCOPE)
  )
    throw new Error("Account grant required");
  const user = await db.query.userTable.findFirst({
    where: eq(userTable.id, userId),
  });
  if (
    !user?.email ||
    user.isAnonymous ||
    (user.banned && (!user.banExpires || user.banExpires > new Date()))
  ) {
    throw new Error("Account connection is unavailable");
  }
  const apiKeyId = authInfo.extra?.apiKeyId;
  if (typeof apiKeyId === "string") {
    const key = await db.query.apiKeyTable.findFirst({
      where: and(
        eq(apiKeyTable.id, apiKeyId),
        eq(apiKeyTable.referenceId, userId),
      ),
      columns: { enabled: true, expiresAt: true, permissions: true },
    });
    if (
      !key?.enabled ||
      (key.expiresAt && key.expiresAt <= new Date()) ||
      !apiKeyScopes(key.permissions).includes(required)
    ) {
      throw new ORPCError("FORBIDDEN", {
        message: "API key permission required",
      });
    }
  } else {
    if (required !== "swipestats:read")
      throw new ORPCError("FORBIDDEN", {
        message: "Love Stories requires a scoped API key",
      });
    const client = await db.query.oauthClientTable.findFirst({
      where: eq(oauthClientTable.clientId, authInfo.clientId),
    });
    const consent = await db.query.oauthConsentTable.findFirst({
      where: and(
        eq(oauthConsentTable.userId, userId),
        eq(oauthConsentTable.clientId, authInfo.clientId),
      ),
    });
    if (
      !client ||
      client.disabled ||
      !consent?.scopes.includes(SWIPESTATS_MCP_SCOPE)
    )
      throw new Error("Account connection is unavailable");
  }
  return {
    db,
    headers: new Headers(),
    analyticsConsent: readConsent(user.analyticsConsent),
    session: {
      session: { id: `mcp:${authInfo.clientId}` },
      user: {
        ...user,
        email: user.email,
        name: user.name ?? "",
        isAnonymous: user.isAnonymous ?? false,
        banned: user.banned ?? false,
        role: user.role ?? undefined,
        banReason: user.banReason ?? undefined,
        banExpires: user.banExpires ?? undefined,
      },
    },
  };
}
export function createSwipeStatsMcpServer({ authInfo }: McpRequestContext) {
  const server = new McpServer({
    name: "swipestats",
    version: "0.1.0",
    title: "SwipeStats experiment",
  });
  for (const [name, entry] of Object.entries(toolProcedures) as [
    string,
    ToolDefinition,
  ][]) {
    if (!authInfo?.scopes.includes(entry.permission)) continue;
    const procedure: AnyProcedure = entry.procedure;
    const hasInput = (procedure["~orpc"].inputSchemas?.length ?? 0) > 0;
    const inputSchema = entry.inputSchema ?? procedureInput(procedure);
    server.registerTool(
      name,
      {
        description: entry.description,
        inputSchema,
        annotations: {
          readOnlyHint: entry.readOnly,
          destructiveHint: entry.destructive ?? false,
          idempotentHint: entry.readOnly || (entry.idempotent ?? false),
          openWorldHint: false,
        },
      },
      async (input, extra) => {
        try {
          const info = extra.http?.authInfo;
          if (!info) throw new Error("Authentication required");
          const context = await connectorContext(info, entry.permission);
          const result = await call(procedure, hasInput ? input : undefined, {
            context,
          });
          const serialized = JSON.stringify(result);
          return {
            content: [{ type: "text" as const, text: serialized }],
            structuredContent: { result: JSON.parse(serialized) as unknown },
          };
        } catch (error) {
          const code: unknown =
            error instanceof ORPCError ? error.code : "INTERNAL_SERVER_ERROR";
          const message =
            code === "CONFLICT"
              ? "CONFLICT: The record or capture request changed. Reload the latest version and reconcile; do not blindly retry."
              : code === "BAD_REQUEST"
                ? "BAD_REQUEST: Check the input fields and linked records."
                : code === "FORBIDDEN"
                  ? "FORBIDDEN: This key does not have the required permission."
                  : "Unable to access this record. Check the account, connection and record ownership.";
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: message,
              },
            ],
          };
        }
      },
    );
  }
  return server;
}
export const swipeStatsMcpHandler = createMcpHandler(
  createSwipeStatsMcpServer,
  { legacy: "stateless", responseMode: "auto" },
);
