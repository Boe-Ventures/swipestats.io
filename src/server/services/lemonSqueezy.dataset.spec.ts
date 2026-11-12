import { afterEach, describe, expect, test, spyOn } from "bun:test";
import { getOrderDetails } from "./lemonSqueezy.service";

// These fixtures test our fulfillment decisions, not provider availability or
// checkout URL acceptance. The real SDK is used; only HTTP is isolated.
let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;
afterEach(() => fetchSpy?.mockRestore());

function orderFixture(itemResponse: () => Response) {
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async (input: Parameters<typeof fetch>[0]) => {
        const url = input instanceof Request ? input.url : input.toString();
        if (url === "https://api.lemonsqueezy.com/v1/orders/42") {
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
        }
        if (url === "https://api.lemonsqueezy.com/v1/order-items/99")
          return itemResponse();
        throw new Error(`Unexpected request: ${url}`);
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  );
}

describe("dataset fulfillment decisions (HTTP fixtures)", () => {
  test("uses the purchased quantity instead of discount or custom metadata", async () => {
    orderFixture(() =>
      Response.json({ data: { attributes: { quantity: 12 } } }),
    );
    expect(await getOrderDetails("42")).toEqual({
      orderId: "42",
      variantId: 1269608,
      customerEmail: "fixture@example.com",
      quantity: 12,
    });
  });

  test("does not silently downgrade a purchase when its item lookup fails", async () => {
    orderFixture(() =>
      Response.json({ errors: [{ detail: "Unavailable" }] }, { status: 503 }),
    );
    expect(await getOrderDetails("42")).toBeNull();
  });
});
