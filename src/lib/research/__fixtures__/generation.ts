import { expect, mock } from "bun:test";
import { getTableName } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { gunzipSync } from "node:zlib";
let state = "PENDING";
let uploads = 0;
let encoded = Buffer.alloc(0);
let selected = 0;
const profile = {
  tinderId: "preserved-id",
  bio: "Research bio",
  userId: "account-secret",
  futureResearchMetric: "new-metric",
};
const record = {
  id: "export-fixture",
  tier: "STARTER",
  recency: "MIXED",
  profileCount: 1,
};
await mock.module("@/server/db", () => ({
  db: {
    query: {
      datasetExportTable: {
        findFirst: async () => ({ ...record, status: state }),
      },
      profileMetaTable: { findFirst: async () => null },
    },
    update: () => ({
      set: (values: { status: string }) => ({
        where: (condition: Parameters<PgDialect["sqlToQuery"]>[0]) => {
          if (values.status === "GENERATING")
            return {
              returning: async () => {
                const query = new PgDialect({
                  casing: "snake_case",
                }).sqlToQuery(condition);
                expect(query.sql).toContain('"status"');
                expect(query.params).toContain("PENDING");
                if (state !== "PENDING") return [];
                state = "GENERATING";
                return [{ id: record.id }];
              },
            };
          state = values.status;
          return Promise.resolve();
        },
      }),
    }),
    select: () => ({
      from: (table: Parameters<typeof getTableName>[0]) => {
        const name = getTableName(table);
        const result =
          name === "tinder_profile"
            ? [profile]
            : name === "match"
              ? [{ count: "2" }]
              : [];
        const builder = {
          where: () => builder,
          orderBy: () => builder,
          limit: async () => {
            selected++;
            return result;
          },
          then: (resolve: (r: unknown[]) => void) =>
            Promise.resolve(result).then(resolve),
        };
        return builder;
      },
    }),
  },
}));
await mock.module("@/server/services/research-storage", () => ({
  researchUploadOptions: () => ({ access: "public", token: "fixture" }),
}));
await mock.module("@/server/services/lemonSqueezy.service", () => ({
  DATASET_PRODUCTS: {},
}));
await mock.module("@/server/services/analytics.service", () => ({
  trackServerEvent: () => undefined,
}));
await mock.module("@vercel/blob", () => ({
  put: async (_path: string, stream: AsyncIterable<Uint8Array>) => {
    uploads++;
    const parts: Uint8Array[] = [];
    for await (const part of stream) parts.push(part);
    encoded = Buffer.concat(parts);
    return {
      url: "https://fixture.public.blob.vercel-storage.com/datasets/fixture.jsonl.gz",
    };
  },
}));
const { generateDatasetForExport } =
  await import("@/server/services/datasetExport.service");
await Promise.all([
  generateDatasetForExport(record.id),
  generateDatasetForExport(record.id),
]);
expect(uploads).toBe(1);
expect(selected).toBe(1);
expect(state).toBe("READY");
const output = gunzipSync(encoded).toString("utf8");
expect(output).toContain("preserved-id");
expect(output).toContain("Research bio");
expect(output).not.toContain("account-secret");
expect(output).toContain("new-metric");
await generateDatasetForExport(record.id);
expect(uploads).toBe(1);
expect(state).toBe("READY");
console.log("Generation checks passed");
