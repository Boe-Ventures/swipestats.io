import { afterEach, describe, expect, test, spyOn } from "bun:test";
import { createDatasetCheckout, getOrderDetails } from "./lemonSqueezy.service";

let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;
afterEach(() => fetchSpy?.mockRestore());

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
    let quantities: unknown;
    mockFetch(async (_, init) => {
      const request = JSON.parse(init?.body as string) as {
        data: {
          attributes: { checkout_data: { variant_quantities: unknown } };
        };
      };
      quantities = request.data.attributes.checkout_data.variant_quantities;
      return Response.json({
        data: { attributes: { url: "https://example.com/test-checkout" } },
      });
    });
    const result = await createDatasetCheckout(
      "STANDARD",
      undefined,
      "research_pricing",
      12,
    );
    expect(quantities).toEqual([
      { variant_id: Number(result.providerVariantId), quantity: 12 },
    ]);
    expect(result.amount).toBe(60000);
  });

  test("rejects invalid quantities before contacting the provider", async () => {
    mockFetch(async () => {
      throw new Error("Unexpected network request");
    });
    for (const quantity of [0, -1, 1.5, 13, NaN]) {
      expect(
        createDatasetCheckout(
          "STANDARD",
          undefined,
          "research_pricing",
          quantity,
        ),
      ).rejects.toThrow();
    }
    expect(
      createDatasetCheckout("FRESH", undefined, "research_pricing", 2),
    ).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
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
      if (
        (url instanceof Request ? url.url : url.toString()).endsWith(
          "/order-items/99",
        )
      )
        return Response.json({ data: { attributes: { quantity: 12 } } });
      throw new Error("Unexpected URL");
    });
    expect(await getOrderDetails("42")).toEqual({
      orderId: "42",
      variantId: 1269608,
      customerEmail: "fixture@example.com",
      quantity: 12,
    });
  });

  test("does not silently downgrade a purchase if the item lookup fails", async () => {
    mockFetch(async (url) =>
      (url instanceof Request ? url.url : url.toString()).endsWith("/orders/42")
        ? Response.json({
            data: {
              attributes: {
                first_order_item: { id: 99, variant_id: 1269608 },
                user_email: "fixture@example.com",
              },
            },
          })
        : Response.json(
            { errors: [{ detail: "Temporarily unavailable" }] },
            { status: 503 },
          ),
    );
    expect(await getOrderDetails("42")).toBeNull();
  });
});
