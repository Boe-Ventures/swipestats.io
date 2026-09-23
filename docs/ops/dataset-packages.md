# Research dataset packages

Standard is sold in packs of 1,000 Tinder profiles at $50 per pack. Buyers
can select up to 12 packs. The pricing page disables sizes larger than the
available dataset; checkout checks availability again. All packs from an
order are delivered in one export with distinct profiles.

The existing Lemon Squeezy Standard variant remains the billing product.
Checkout sends `variantQuantities`; fulfillment retrieves the purchased
order item through Lemon Squeezy and uses its quantity. Custom checkout
metadata does not determine the tier or number of profiles delivered.
Discounts do not reduce the profile entitlement. New checkout links expire
after 30 minutes.

Webhook provisioning and download-page recovery both persist the purchased
profile count on `dataset_export`. Retries use that stored count. If the
source pool has become too small, generation fails with a useful error
instead of marking a short file READY.

Exports retain the existing gzip JSONL format: metadata, profile records,
and a citation. Profile records contain `profile`, `meta`, `usage`, and
`matchCount`. Purchased exports exclude raw conversations and photos.
Generation reads 25 profiles per batch, with three database queries per
batch, and streams to Blob with backpressure. The webhook and tRPC routes
allow 800 seconds, matching the current Vercel Pro Fluid configuration.

## Validation on September 11, 2026

- Production contained 11,528 Tinder profiles, supporting 11 packs. The
  12-pack option becomes available when the count reaches 12,000.
- A read-only run of the real serializer processed 11,000 production
  profiles in 297 seconds, producing 11,002 JSONL records and about 2.50 GB
  before compression. Nothing was uploaded or persisted by this benchmark.
- Browser testing exercised the 9-pack selection on the local development
  database and reached a Lemon Squeezy test checkout showing $450. A
  separate 12-pack test checkout showed quantity 12 and a $600 total.
- No payment was submitted. The live payment/webhook/download round trip
  remains a post-release verification step.
- Automated tests cover checkout quantities, invalid inputs, provider order
  quantity lookup with discounts, and failure to retrieve an order item.
