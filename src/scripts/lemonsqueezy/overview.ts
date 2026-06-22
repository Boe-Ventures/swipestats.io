/**
 * LemonSqueezy catalog overview (read-only).
 *
 * Lists stores + products + variants for whichever API key is in the
 * environment. LemonSqueezy uses SEPARATE keys for test vs live — the key
 * decides the mode (there is no test_mode query param).
 *
 * Usage:
 *   bun run ls:overview                     # uses LEMON_SQUEEZY_API_KEY from .env (test/dev)
 *   LEMON_SQUEEZY_API_KEY="<prod key>" bun run ls:overview   # target live/prod
 *
 * See BILLING_LEMONSQUEEZY.md for the full reference.
 */

const API = "https://api.lemonsqueezy.com/v1";
const KEY = process.env.LEMON_SQUEEZY_API_KEY;

if (!KEY) {
  console.error("LEMON_SQUEEZY_API_KEY is not set");
  process.exit(1);
}

const headers = {
  Accept: "application/vnd.api+json",
  Authorization: `Bearer ${KEY}`,
};

interface JsonApiResource {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
}
interface JsonApiResponse {
  data?: JsonApiResource[];
  included?: JsonApiResource[];
  errors?: { status?: string; title?: string; detail?: string }[];
}

async function get(path: string): Promise<JsonApiResponse> {
  const res = await fetch(`${API}${path}`, { headers });
  return (await res.json()) as JsonApiResponse;
}

function dollars(cents: unknown): string {
  const n = typeof cents === "number" ? cents : 0;
  return `$${(n / 100).toFixed(2)}`;
}

async function main() {
  const stores = await get("/stores");
  if (stores.errors) {
    console.error("API error:", JSON.stringify(stores.errors));
    process.exit(1);
  }

  console.log("=== STORES ===");
  for (const s of stores.data ?? []) {
    const a = s.attributes;
    console.log(
      `  ${s.id}: ${String(a.name)} | plan=${String(a.plan)} | revenue=${dollars(a.total_revenue)} | sales=${String(a.total_sales)}`,
    );
  }

  const products = await get(
    "/products?include=variants&page%5Bsize%5D=100",
  );

  const variantsByProduct = new Map<string, JsonApiResource[]>();
  for (const it of products.included ?? []) {
    if (it.type !== "variants") continue;
    const pid = String(it.attributes.product_id);
    const arr = variantsByProduct.get(pid) ?? [];
    arr.push(it);
    variantsByProduct.set(pid, arr);
  }

  console.log(`\n=== PRODUCTS + VARIANTS (${(products.data ?? []).length}) ===`);
  for (const p of products.data ?? []) {
    const a = p.attributes;
    console.log(
      `\nPRODUCT ${p.id}: ${String(a.name)}  [status=${String(a.status)}, test_mode=${String(a.test_mode)}]`,
    );
    const variants = (variantsByProduct.get(p.id) ?? []).sort(
      (x, y) => Number(x.attributes.sort ?? 0) - Number(y.attributes.sort ?? 0),
    );
    for (const v of variants) {
      const va = v.attributes;
      const interval = (va.interval as string) || "one-time";
      console.log(
        `    ${v.id}: ${String(va.name)}  ${dollars(va.price)}/${interval}  status=${String(va.status)}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
