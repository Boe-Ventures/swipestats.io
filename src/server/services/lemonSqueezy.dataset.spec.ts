import { afterEach, describe, expect, mock, test, spyOn } from "bun:test";

process.env.SKIP_ENV_VALIDATION = "1";
process.env.LEMON_SQUEEZY_API_KEY ??= "test-key";

const sdk = await import("@lemonsqueezy/lemonsqueezy.js");
const createCheckoutMock = mock(
  async (..._args: Parameters<typeof sdk.createCheckout>) => ({
    data: {
      data: { attributes: { url: "https://example.com/test-checkout" } },
    },
    error: null,
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
afterEach(() => {
  fetchSpy?.mockRestore();
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

describe("dataset purchase quantities", () => {
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
