import { afterEach, describe, expect, mock, test, spyOn } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LEMON_SQUEEZY_API_KEY ??= "test-key";

const sdk = await import("@lemonsqueezy/lemonsqueezy.js");
const createCheckoutMock = mock(
  async (..._args: Parameters<typeof sdk.createCheckout>) => ({
    data: {
      data: { attributes: { url: "https://example.com/test-checkout" } },
    },
    error: null as Error | null,
    statusCode: 201,
  }),
);
const getOrderItemMock = mock(async () => ({
  data: { data: { attributes: { quantity: 12 } } },
  error: null,
}));
await mock.module("@lemonsqueezy/lemonsqueezy.js", () => ({
  ...sdk,
  createCheckout: createCheckoutMock,
  getOrderItem: getOrderItemMock,
}));

const { createDatasetCheckout, getOrderDetails } =
  await import("./lemonSqueezy.service");

let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;
let errorSpy: ReturnType<typeof spyOn<typeof console, "error">> | undefined;
afterEach(() => {
  fetchSpy?.mockRestore();
  errorSpy?.mockRestore();
  createCheckoutMock.mockClear();
  getOrderItemMock.mockClear();
});

function mockFetch(
  implementation: (
    ...args: Parameters<typeof fetch>
  ) => ReturnType<typeof fetch>,
) {
  const replacement = Object.assign(implementation, {
    preconnect: globalThis.fetch.preconnect,
  });
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(replacement);
}

describe("dataset checkout and fulfillment", () => {
  test("uses a plain receipt link for every tier and keeps redirect license keys out of query strings", async () => {
    for (const tier of ["STARTER", "STANDARD", "FRESH", "PREMIUM"] as const) {
      const result = await createDatasetCheckout(tier);
      const options = createCheckoutMock.mock.lastCall?.[2]?.productOptions;
      expect(options?.receiptLinkUrl).toEndWith("/research/download");
      expect(options?.receiptLinkUrl).not.toContain("[license_key]");
      expect(options?.redirectUrl).toEndWith(
        "/research/download#licenseKey=[license_key]",
      );
      expect(options?.redirectUrl).not.toContain("?licenseKey=");
      expect(result.checkoutUrl).toBe("https://example.com/test-checkout");
    }
  });

  test("logs actionable provider failures without exposing email or license credentials", async () => {
    const receiptField = "/data/attributes/product_options/receipt_link_url";
    const privateValue = "fixture@example.com license-secret";
    const providerError = new Error(privateValue, {
      cause: [
        { detail: privateValue, source: { pointer: receiptField } },
        { source: { pointer: `/unexpected/${privateValue}` } },
        null,
      ],
    });
    createCheckoutMock.mockImplementationOnce(async () => ({
      data: null as never,
      error: providerError,
      statusCode: 422,
    }));
    errorSpy = spyOn(console, "error").mockImplementation(() => undefined);

    const failure: unknown = await createDatasetCheckout(
      "STARTER",
      "fixture@example.com",
    ).catch((error: unknown) => error);
    expect(failure).toEqual(
      new Error("Unable to create dataset checkout. Please try again shortly."),
    );
    expect(errorSpy).toHaveBeenCalledWith("Dataset checkout creation failed", {
      checkoutAttemptId: expect.stringMatching(/^chk_/) as string,
      tier: "STARTER",
      variantId: createCheckoutMock.mock.lastCall?.[1],
      reason: "provider_error",
      statusCode: 422,
      validationFields: [receiptField],
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(privateValue);
  });

  test.each(["request_exception", "missing_checkout_url"] as const)(
    "reports %s without leaking customer data or provider credentials",
    async (reason) => {
      const privateValue = "fixture@example.com license-secret";
      createCheckoutMock.mockImplementationOnce(async () => {
        if (reason === "request_exception") {
          throw new Error(privateValue, { cause: { apiKey: privateValue } });
        }
        return {
          data: {
            data: {
              attributes: { url: "", customerEmail: privateValue },
            },
          },
          error: null,
          statusCode: 201,
        };
      });
      errorSpy = spyOn(console, "error").mockImplementation(() => undefined);

      const failure: unknown = await createDatasetCheckout(
        "STARTER",
        "fixture@example.com",
      ).catch((error: unknown) => error);
      expect(failure).toEqual(
        new Error(
          "Unable to create dataset checkout. Please try again shortly.",
        ),
      );
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "Dataset checkout creation failed",
        {
          checkoutAttemptId: expect.stringMatching(/^chk_/) as string,
          tier: "STARTER",
          variantId: createCheckoutMock.mock.lastCall?.[1],
          reason,
          statusCode: reason === "request_exception" ? null : 201,
          validationFields: [],
        },
      );
      expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(privateValue);
    },
  );

  test("sends twelve Standard packs to the provider for a $600 checkout", async () => {
    const result = await createDatasetCheckout(
      "STANDARD",
      undefined,
      "research_pricing",
      12,
    );
    const checkoutCall = createCheckoutMock.mock.calls[0];
    expect(checkoutCall?.[0]).toBe("97795");
    expect(checkoutCall?.[1]).toBe(result.providerVariantId);
    expect(checkoutCall?.[2]?.checkoutData?.variantQuantities).toEqual([
      { variantId: Number(result.providerVariantId), quantity: 12 },
    ]);
    expect(result.amount).toBe(60000);
  });

  test("fulfillment reads quantity from the purchased item, independent of discounts and checkout metadata", async () => {
    mockFetch(async (url) => {
      if (
        (url instanceof Request ? url.url : url.toString()).endsWith(
          "/orders/42",
        )
      )
        return Response.json({
          data: {
            attributes: {
              first_order_item: { id: 99, variant_id: 1269608 },
              user_email: "fixture@example.com",
              discount_total: 10000,
              custom_data: { dataset_quantity: 1 },
            },
          },
        });
      throw new Error("Unexpected URL");
    });
    expect(await getOrderDetails("42")).toEqual({
      orderId: "42",
      variantId: 1269608,
      customerEmail: "fixture@example.com",
      quantity: 12,
    });
    expect(getOrderItemMock).toHaveBeenCalledWith(99);
  });

  test("does not silently downgrade a purchase if the item lookup fails", async () => {
    getOrderItemMock.mockImplementationOnce(async () => ({
      data: null as never,
      error: { message: "Temporarily unavailable" } as never,
    }));
    mockFetch(async () =>
      Response.json({
        data: {
          attributes: {
            first_order_item: { id: 99, variant_id: 1269608 },
            user_email: "fixture@example.com",
          },
        },
      }),
    );
    expect(await getOrderDetails("42")).toBeNull();
  });
});
