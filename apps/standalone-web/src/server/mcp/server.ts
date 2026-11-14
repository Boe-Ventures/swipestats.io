import "server-only";
import {
  createMcpHandler,
  McpServer,
  type AuthInfo,
} from "@modelcontextprotocol/server";
import { call, type AnyProcedure } from "@orpc/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  oauthClientTable,
  oauthConsentTable,
  userTable,
} from "@/server/db/schema";
import type { DomainContext } from "@/server/domains/context";
import { domainRouter } from "@/server/domains/router";
import { readConsent } from "@/lib/analytics/consent";
import { SWIPESTATS_MCP_SCOPE } from "./config";

// Explicit read-only projection. Imports, purchases, admin and raw messages are not tools.
export const toolProcedures = {
  listMyProfiles: {
    procedure: domainRouter.user.getUploadedProfiles,
    description:
      "List the dating-app profiles owned by your SwipeStats account.",
  },
  getSubscriptionStatus: {
    procedure: domainRouter.billing.getStatus,
    description: "Read your current SwipeStats tier and feature limits.",
  },
  getMySwipeRankSummary: {
    procedure: domainRouter.swipeRank.summary,
    description:
      "Read your own Tinder SwipeRank summary using a profile ID from listMyProfiles.",
  },
};

export async function connectorContext(
  authInfo: AuthInfo,
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
    !user?.email ||
    user.isAnonymous ||
    (user.banned && (!user.banExpires || user.banExpires > new Date())) ||
    !consent?.scopes.includes(SWIPESTATS_MCP_SCOPE)
  )
    throw new Error("Account connection is unavailable");
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
export function createSwipeStatsMcpServer() {
  const server = new McpServer({
    name: "swipestats",
    version: "0.1.0",
    title: "SwipeStats experiment",
  });
  for (const [name, entry] of Object.entries(toolProcedures)) {
    const procedure: AnyProcedure = entry.procedure;
    const schemas = procedure["~orpc"].inputSchemas ?? [];
    if (schemas.length > 1) throw new Error(`Unsupported tool schema: ${name}`);
    const schema = schemas[0];
    const inputSchema = schema instanceof z.ZodObject ? schema : z.object({});
    server.registerTool(
      name,
      {
        description: entry.description,
        inputSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async (input, extra) => {
        try {
          const info = extra.http?.authInfo;
          if (!info) throw new Error("Authentication required");
          const context = await connectorContext(info);
          const result = await call(
            procedure,
            schemas.length ? input : undefined,
            { context },
          );
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
            structuredContent: { result },
          };
        } catch {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: "Unable to read this record. Check the selected account, connection, and profile ownership.",
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
