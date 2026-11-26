import { relations } from "drizzle-orm";
import { index, pgTable } from "drizzle-orm/pg-core";

import { sessionTable, userTable } from "./schema";

export const jwksTable = pgTable("jwks", (t) => ({
  id: t.text().primaryKey(),
  publicKey: t.text().notNull(),
  privateKey: t.text().notNull(),
  createdAt: t.timestamp().notNull(),
  expiresAt: t.timestamp(),
}));

export const oauthClientTable = pgTable(
  "oauth_client",
  (t) => ({
    id: t.text().primaryKey(),
    clientId: t.text().notNull().unique(),
    clientSecret: t.text(),
    disabled: t.boolean().default(false),
    skipConsent: t.boolean(),
    enableEndSession: t.boolean(),
    subjectType: t.text(),
    scopes: t.text().array(),
    userId: t.text().references(() => userTable.id, { onDelete: "cascade" }),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
    name: t.text(),
    uri: t.text(),
    icon: t.text(),
    contacts: t.text().array(),
    tos: t.text(),
    policy: t.text(),
    softwareId: t.text(),
    softwareVersion: t.text(),
    softwareStatement: t.text(),
    redirectUris: t.text().array().notNull(),
    postLogoutRedirectUris: t.text().array(),
    tokenEndpointAuthMethod: t.text(),
    grantTypes: t.text().array(),
    responseTypes: t.text().array(),
    public: t.boolean(),
    type: t.text(),
    requirePKCE: t.boolean(),
    referenceId: t.text(),
    metadata: t.jsonb(),
  }),
  (table) => [index("oauth_client_user_id_idx").on(table.userId)],
);

export const oauthRefreshTokenTable = pgTable(
  "oauth_refresh_token",
  (t) => ({
    id: t.text().primaryKey(),
    token: t.text().notNull().unique(),
    clientId: t
      .text()
      .notNull()
      .references(() => oauthClientTable.clientId, { onDelete: "cascade" }),
    sessionId: t
      .text()
      .references(() => sessionTable.id, { onDelete: "set null" }),
    userId: t
      .text()
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    referenceId: t.text(),
    expiresAt: t.timestamp(),
    createdAt: t.timestamp(),
    revoked: t.timestamp(),
    authTime: t.timestamp(),
    scopes: t.text().array().notNull(),
  }),
  (table) => [
    index("oauth_refresh_token_client_id_idx").on(table.clientId),
    index("oauth_refresh_token_session_id_idx").on(table.sessionId),
    index("oauth_refresh_token_user_id_idx").on(table.userId),
  ],
);

export const oauthAccessTokenTable = pgTable(
  "oauth_access_token",
  (t) => ({
    id: t.text().primaryKey(),
    token: t.text().unique(),
    clientId: t
      .text()
      .notNull()
      .references(() => oauthClientTable.clientId, { onDelete: "cascade" }),
    sessionId: t
      .text()
      .references(() => sessionTable.id, { onDelete: "set null" }),
    userId: t.text().references(() => userTable.id, { onDelete: "cascade" }),
    referenceId: t.text(),
    refreshId: t
      .text()
      .references(() => oauthRefreshTokenTable.id, { onDelete: "cascade" }),
    expiresAt: t.timestamp(),
    createdAt: t.timestamp(),
    scopes: t.text().array().notNull(),
  }),
  (table) => [
    index("oauth_access_token_client_id_idx").on(table.clientId),
    index("oauth_access_token_session_id_idx").on(table.sessionId),
    index("oauth_access_token_user_id_idx").on(table.userId),
    index("oauth_access_token_refresh_id_idx").on(table.refreshId),
  ],
);

export const oauthConsentTable = pgTable(
  "oauth_consent",
  (t) => ({
    id: t.text().primaryKey(),
    clientId: t
      .text()
      .notNull()
      .references(() => oauthClientTable.clientId, { onDelete: "cascade" }),
    userId: t.text().references(() => userTable.id, { onDelete: "cascade" }),
    referenceId: t.text(),
    scopes: t.text().array().notNull(),
    createdAt: t.timestamp(),
    updatedAt: t.timestamp(),
  }),
  (table) => [
    index("oauth_consent_client_id_idx").on(table.clientId),
    index("oauth_consent_user_id_idx").on(table.userId),
  ],
);

export const oauthClientRelations = relations(
  oauthClientTable,
  ({ one, many }) => ({
    user: one(userTable, {
      fields: [oauthClientTable.userId],
      references: [userTable.id],
    }),
    refreshTokens: many(oauthRefreshTokenTable),
    accessTokens: many(oauthAccessTokenTable),
    consents: many(oauthConsentTable),
  }),
);

export const oauthRefreshTokenRelations = relations(
  oauthRefreshTokenTable,
  ({ one, many }) => ({
    client: one(oauthClientTable, {
      fields: [oauthRefreshTokenTable.clientId],
      references: [oauthClientTable.clientId],
    }),
    session: one(sessionTable, {
      fields: [oauthRefreshTokenTable.sessionId],
      references: [sessionTable.id],
    }),
    user: one(userTable, {
      fields: [oauthRefreshTokenTable.userId],
      references: [userTable.id],
    }),
    accessTokens: many(oauthAccessTokenTable),
  }),
);

export const oauthAccessTokenRelations = relations(
  oauthAccessTokenTable,
  ({ one }) => ({
    client: one(oauthClientTable, {
      fields: [oauthAccessTokenTable.clientId],
      references: [oauthClientTable.clientId],
    }),
    session: one(sessionTable, {
      fields: [oauthAccessTokenTable.sessionId],
      references: [sessionTable.id],
    }),
    user: one(userTable, {
      fields: [oauthAccessTokenTable.userId],
      references: [userTable.id],
    }),
    refreshToken: one(oauthRefreshTokenTable, {
      fields: [oauthAccessTokenTable.refreshId],
      references: [oauthRefreshTokenTable.id],
    }),
  }),
);

export const oauthConsentRelations = relations(
  oauthConsentTable,
  ({ one }) => ({
    client: one(oauthClientTable, {
      fields: [oauthConsentTable.clientId],
      references: [oauthClientTable.clientId],
    }),
    user: one(userTable, {
      fields: [oauthConsentTable.userId],
      references: [userTable.id],
    }),
  }),
);
