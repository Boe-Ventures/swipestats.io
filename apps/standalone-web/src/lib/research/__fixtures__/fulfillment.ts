import { expect, mock } from "bun:test";
import { createHmac } from "node:crypto";
let mode: "valid" | "invalid" | "outage" = "valid";
let variant = 456562;
let queued = 0;
let queuedTier = "";
let queuedQuantity = 0;
globalThis.fetch = Object.assign(
  async () =>
    Response.json({
      data: {
        attributes: {
          first_order_item: { id: 99, variant_id: 456562 },
          user_email: "fixture@example.com",
        },
      },
    }),
  { preconnect: globalThis.fetch.preconnect },
);
await mock.module("@/env", () => ({
  env: {
    NEXT_PUBLIC_IS_PRODUCTION: true,
    LEMON_SQUEEZY_WEBHOOK_SECRET: "fixture-secret",
    NEXT_PUBLIC_BASE_URL: "https://swipestats.test",
  },
  envSelect: ({ prod }: { prod: unknown }) => prod,
}));
await mock.module("@lemonsqueezy/lemonsqueezy.js", () => ({
  lemonSqueezySetup: () => undefined,
  createCheckout: async () => ({}),
  getCustomer: async () => ({}),
  getOrderItem: async () => ({
    data: { data: { attributes: { quantity: 3 } } },
  }),
  getSubscription: async () => ({}),
  validateLicense: async () =>
    mode === "outage"
      ? { statusCode: 503, data: null, error: new Error("upstream") }
      : {
          statusCode: mode === "invalid" ? 400 : 200,
          error: mode === "invalid" ? new Error("invalid") : null,
          data: {
            valid: mode === "valid",
            license_key: {
              id: 1,
              status: "active",
              expires_at: null,
              test_mode: false,
            },
            meta: { store_id: 97795, variant_id: variant },
          },
        },
}));
await mock.module("@/server/db", () => ({ db: {} }));
await mock.module("@/server/services/analytics.service", () => ({
  trackServerEvent: () => undefined,
}));
await mock.module("@vercel/functions", () => ({ waitUntil: () => undefined }));
await mock.module("@/server/services/datasetExport.service", () => ({
  ensureDatasetExportForLicense: async (input: {
    tier: string;
    quantity: number;
  }) => {
    queued++;
    queuedTier = input.tier;
    queuedQuantity = input.quantity;
    return {
      created: true,
      exportRecord: {
        id: "fixture-export",
        tier: input.tier,
        profileCount: 1000,
        recency: "MIXED",
      },
    };
  },
  generateDatasetForExport: async () => undefined,
}));
const { validateDatasetLicenseKey } =
  await import("@/server/services/lemonSqueezy.service");
for (const id of [470938, 456562, 470945, 1783971]) {
  variant = id;
  expect((await validateDatasetLicenseKey("fixture")).valid).toBe(true);
}
variant = 624630;
expect((await validateDatasetLicenseKey("fixture")).valid).toBe(false);
variant = 456562;
const { POST } = await import("@/app/api/webhooks/lemon-squeezy/route");
const request = () => {
  const body = JSON.stringify({
    meta: {
      event_name: "license_key_created",
      test_mode: false,
      custom_data: { dataset_tier: "PREMIUM" },
    },
    data: {
      id: "1",
      attributes: {
        key: "fixture",
        order_id: 1,
        user_email: "fixture@example.com",
      },
    },
  });
  return new Request("https://swipestats.test/api/webhooks/lemon-squeezy", {
    method: "POST",
    headers: {
      "x-event-name": "license_key_created",
      "x-signature": createHmac("sha256", "fixture-secret")
        .update(body)
        .digest("hex"),
    },
    body,
  });
};
expect((await POST(request())).status).toBe(200);
expect(queuedTier).toBe("STANDARD");
expect(queuedQuantity).toBe(3);
expect(queued).toBe(1);
mode = "invalid";
expect((await validateDatasetLicenseKey("invalid")).valid).toBe(false);
expect((await POST(request())).status).toBe(200);
expect(queued).toBe(1);
mode = "outage";
const savedError = console.error;
console.error = () => undefined;
try {
  expect((await POST(request())).status).toBe(500);
  expect(queued).toBe(1);
} finally {
  console.error = savedError;
}
console.log("Fulfillment checks passed");
