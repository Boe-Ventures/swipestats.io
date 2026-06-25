# Billing — LemonSqueezy (how we interface)

How to work with our LemonSqueezy (LS) account programmatically, so we never have to relearn it. SwipeStats runs billing on LS: **subscriptions** (SwipeStats+), **lifetime** purchases, and **research datasets** (license-key based).

> A parallel Polar integration exists on the `review-billing-lemonsqueezy-vs-polar` branch (subscriptions only) but **we are staying on LemonSqueezy for now.** See "Polar (parked)" at the bottom.

## TL;DR

- **No CLI exists.** Use the REST API (JSON:API) at `https://api.lemonsqueezy.com/v1`, or the `@lemonsqueezy/lemonsqueezy.js` SDK (already a dependency).
- **Auth:** header `Authorization: Bearer $LEMON_SQUEEZY_API_KEY` + `Accept: application/vnd.api+json` (and `Content-Type: application/vnd.api+json` for writes).
- **⚠️ Test and Live use SEPARATE API keys.** The key decides the mode — there is **no** `test_mode` query param. A test key returns `404` for live objects and vice-versa.
  - **Test/dev key:** in the worktree `.env` (`LEMON_SQUEEZY_API_KEY`).
  - **Live/prod key:** Vercel production env (operator-owned). Not in local `.env`.
- **Store:** `97795` ("Swipestats"). Same store id in both modes; the data you get back depends on which key you use.
- The mode the *app* uses is driven by `NEXT_PUBLIC_IS_PRODUCTION` via `envSelect({ test, prod })` in `src/env.ts`.

## Quick start — read the catalog

```bash
# Uses the key in .env (test/dev):
bun run ls:overview

# Target live/prod by overriding the key inline:
LEMON_SQUEEZY_API_KEY="<prod key>" bun run ls:overview
```

Script: `src/scripts/lemonsqueezy/overview.ts` (read-only; lists stores + products + variants).

Raw curl equivalent:

```bash
curl -sS \
  -H "Accept: application/vnd.api+json" \
  -H "Authorization: Bearer $LEMON_SQUEEZY_API_KEY" \
  "https://api.lemonsqueezy.com/v1/products?include=variants&page%5Bsize%5D=100"
```

## Common endpoints

| Endpoint | Use |
|---|---|
| `GET /stores` | stores + `total_revenue` (cents) + `total_sales` |
| `GET /products?include=variants&page[size]=100` | products with their variants |
| `GET /variants/{id}` | single variant (probe whether a key sees an id) |
| `GET /orders`, `GET /orders/{id}` | orders |
| `GET /subscriptions`, `GET /subscriptions/{id}` | subscriptions |
| `GET /license-keys`, `GET /license-keys/{id}` | dataset license keys |
| `POST /checkouts` | create checkout (we use the SDK helper) |
| `/webhooks` | webhook endpoints |

Pagination is `page[size]` + `page[number]` (URL-encode brackets as `%5B%5D`).

## How the app uses LS (code map)

- **`src/server/services/lemonSqueezy.service.ts`** — SDK init; variant config via `envSelect({ test, prod })`; `createUpgradeCheckout`, `createDatasetCheckout`, `getSubscriptionDetails`, `getCustomerPortalUrl`, `validateDatasetLicenseKey`, `getOrderFromLicenseKey`, `getTierFromVariantId`, `getDatasetTierFromVariant`, `verifyWebhookSignature`.
- **`src/app/api/webhooks/lemon-squeezy/route.ts`** — verifies signature, then maps `order_created/refunded` + `subscription_created/updated/resumed/cancelled/expired` onto `userTable`: `swipestatsTier`, `subscriptionProviderId`, `subscriptionCurrentPeriodEnd`, `isLifetime`. The user id comes from checkout `custom_data.user_id`.
- **Datasets** are fulfilled **on-demand via license key** in `researchRouter` + `datasetExport.service.ts` — NOT via the webhook.
- **Env:** `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_WEBHOOK_SECRET`.

### Webhook signature

HMAC-SHA256 of the raw request body keyed with `LEMON_SQUEEZY_WEBHOOK_SECRET`, compared to the `X-Signature` header (see `verifyWebhookSignature`). Also validate `X-Event-Name` matches `meta.event_name`.

## Live catalog snapshot — store `97795` (as of 2026-06-21, $3,859 revenue / 141 sales)

| Product | Variant | ID (live) | Price | Wired in code |
|---|---|---|---|---|
| Swipestats+ | Default | `1269532` | $9/mo | PLUS monthly (prod) |
| Swipestats Plus Lifetime | Default | `624630` | $49 | PLUS lifetime (prod) |
| Research Dataset | Sample | `470938` | $15 | dataset STARTER |
| Research Dataset | Full package | `456562` | $50 | dataset STANDARD |
| Research Dataset | Fresh | `470945` | $150 | **FRESH = `"TBD"` ⚠️** |
| Research Dataset | Premium | `1783971` | $300 | **PREMIUM = `"TBD"` ⚠️** |
| The Swipe Guide | Default | `491105` | $9 | not wired |
| AI Dating Photos | from Swipestats | `455719` | $199 | not wired |
| AI Dating Profile Review | Unlimited / 1 review | `1223203` / `1223211` | $19 / $5 | not wired |

(Test/dev store has its own variant ids — e.g. PLUS monthly `624661`, lifetime `433959`, dataset Starter `537493`, Standard `1269608`.)

## Gotchas / known issues

- **Separate keys per mode** is the #1 source of confusion — a `404` usually means "wrong-mode key," not "doesn't exist."
- **Variant `status`:** the auto-created "Default" variant often shows `pending`; the real, sellable ones are `published`.
- **One-time products report `interval: year`** in the API — ignore the interval for non-subscription products.
- **⚠️ Dataset Fresh (`470945`, $150) and Premium (`1783971`, $300) are live + published in LS, but `datasetVariants.FRESH`/`PREMIUM` are `"TBD"` in `lemonSqueezy.service.ts`.** `getDatasetTierFromVariant()` returns `null` for them → those license keys won't be recognized for download. Fix the ids before selling those tiers.
- **Duplicate "Plus" products** in the live catalog: `805039` (Swipestats+, the live $9/mo we use), `420882` (Swipestats Plus), `748773` (Swipestats Plus (Copy), draft), `408932` (Lifetime). Cleanup candidate.

## Polar (parked)

A subscriptions-only Polar integration was built on the `review-billing-lemonsqueezy-vs-polar` branch (`polar.service.ts`, `/api/webhooks/polar`, `billingRouter` switched to Polar) but is **not in use** — we're staying on LS. If that branch is ever merged, revert the `billingRouter` import back to `lemonSqueezy.service` or keep both behind a provider switch. Polar's one advantage over LS is an official MCP server; both are equally scriptable via REST.
