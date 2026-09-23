// Runs in its own process so service mocks cannot affect unrelated suites.
import { expect, mock } from "bun:test";
import { PgDialect } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";
let reads = 0;
let listCalls = 0;
let listOptions: { columns?: Record<string, boolean> } = {};
let valid = true;
let tier = "STANDARD";
let remaining = 1;
let storageFails = false;
let whereSql = "";
const record = {
  id: "export-one",
  tier: "STANDARD",
  status: "READY",
  profileCount: 1000,
  blobUrl:
    "https://source-store.public.blob.vercel-storage.com/datasets/one.jsonl.gz",
  blobSize: 4,
  downloadCount: 0,
  maxDownloads: 1,
  expiresAt: null as Date | null,
  generatedAt: new Date(),
  licenseKey: "license-secret",
  customerEmail: "buyer@example.com",
  orderId: "order-secret",
};
const fakeDb = {
  query: {
    datasetExportTable: {
      findFirst: async () => {
        reads++;
        return record;
      },
      findMany: async (options: typeof listOptions) => {
        listCalls++;
        listOptions = options;
        return [];
      },
    },
  },
  update: () => ({
    set: () => ({
      where: (condition: Parameters<PgDialect["sqlToQuery"]>[0]) => {
        whereSql = new PgDialect({ casing: "snake_case" }).sqlToQuery(
          condition,
        ).sql;
        return {
          returning: async () =>
            remaining-- > 0 ? [{ id: record.id, downloadCount: 1 }] : [],
        };
      },
    }),
  }),
};
await mock.module("@/env", () => ({
  env: { NODE_ENV: "test" },
  envSelect: ({ prod }: { prod: unknown }) => prod,
}));
await mock.module("@/server/db", () => ({ db: fakeDb }));
await mock.module("@/server/better-auth", () => ({
  auth: { api: { getSession: async () => null } },
}));
await mock.module("@/server/services/analytics.service", () => ({
  trackServerEvent: () => undefined,
}));
await mock.module("@/server/services/lemonSqueezy.service", () => ({
  DATASET_PRODUCTS: {
    STANDARD: { price: 5000, profileCount: 1000, recency: "MIXED" },
  },
  validateDatasetLicenseKey: async () => ({ valid, tier }),
  createDatasetCheckout: async () => ({}),
  getOrderFromLicenseKey: async () => null,
  isDatasetVariant: () => true,
  getDatasetTierFromVariant: () => "STANDARD",
}));
await mock.module("@/server/services/datasetExport.service", () => ({
  ensureDatasetExportForLicense: async () => ({}),
  generateDatasetForExport: async () => undefined,
}));
await mock.module("@/server/services/research-storage", () => ({
  readResearchBlob: async () => {
    if (storageFails) throw Error("private credentials must not be returned");
    return {
      statusCode: 200,
      stream: new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode("data"));
          c.close();
        },
      }),
      blob: { size: 4 },
    };
  },
}));
const { createTRPCRouter } = await import("@/server/api/trpc");
const { researchRouter } = await import("@/server/api/routers/researchRouter");
const router = createTRPCRouter(researchRouter);
async function denied(promise: Promise<unknown>) {
  let caught = false;
  try {
    await promise;
  } catch {
    caught = true;
  }
  expect(caught).toBe(true);
}
const caller = (
  user: null | { email: string; emailVerified: boolean; isAnonymous?: boolean },
) =>
  router.createCaller({
    db: fakeDb,
    session: user ? { user } : null,
    analyticsConsent: null,
    headers: new Headers(),
  } as never);
for (const user of [
  null,
  { email: "customer@example.com", emailVerified: true },
  { email: "anonymous@example.com", emailVerified: false, isAnonymous: true },
  { email: "kris@swipestats.io", emailVerified: false },
]) {
  await denied(caller(user).listExports());
}
expect(listCalls).toBe(0);
await caller({
  email: "kris@swipestats.io",
  emailVerified: true,
}).listExports();
expect(listCalls).toBe(1);
for (const field of ["licenseKey", "customerEmail", "blobUrl", "orderId"])
  expect(listOptions.columns?.[field]).not.toBe(true);
const publicCaller = caller(null);
const status = await publicCaller.getExportByLicenseKey({
  licenseKey: "license-secret",
});
const text = JSON.stringify(status);
expect(text).not.toContain("license-secret");
expect(text).not.toContain("buyer@example.com");
expect(text).not.toContain("source-store");
valid = false;
await denied(
  publicCaller.getExportByLicenseKey({ licenseKey: "license-secret" }),
);
await denied(publicCaller.retryGeneration({ licenseKey: "license-secret" }));
valid = true;
const { POST } = await import("@/app/api/download/route");
const request = () => {
  const form = new FormData();
  form.set("licenseKey", "license-secret");
  form.set("requestId", "00000000-0000-0000-0000-000000000000");
  return new NextRequest("https://swipestats.test/api/download", {
    method: "POST",
    body: form,
  });
};
valid = false;
const before = reads;
expect((await POST(request())).status).toBe(403);
expect(reads).toBe(before);
valid = true;
tier = "PREMIUM";
expect((await POST(request())).status).toBe(403);
tier = "STANDARD";
record.expiresAt = new Date("2000-01-01");
expect((await POST(request())).status).toBe(403);
record.expiresAt = null;
storageFails = true;
const failure = await POST(request());
expect(failure.status).toBe(503);
expect(await failure.text()).not.toContain("private credentials");
storageFails = false;
const responses = await Promise.all([POST(request()), POST(request())]);
expect(responses.map((r) => r.status).sort()).toEqual([200, 403]);
const success = responses.find((r) => r.status === 200)!;
expect(success.headers.get("cache-control")).toBe("private, no-store");
expect(await success.text()).toBe("data");
expect(success.headers.get("content-type")).toBe("application/gzip");
expect(success.headers.get("content-disposition")).toContain(".jsonl.gz");
expect(success.headers.get("set-cookie")).toContain(
  "research_download_started_00000000-0000-0000-0000-000000000000=1",
);
record.blobUrl =
  "https://fixture.public.blob.vercel-storage.com/datasets/legacy.json";
remaining = 1;
const legacy = await POST(request());
expect(legacy.status).toBe(200);
expect(legacy.headers.get("content-type")).toBe("application/json");
expect(legacy.headers.get("content-disposition")).toContain('.json"');
expect(await legacy.text()).toBe("data");
expect(whereSql).toContain(
  '"dataset_export"."download_count" < "dataset_export"."max_downloads"',
);
console.log("API boundary checks passed");
