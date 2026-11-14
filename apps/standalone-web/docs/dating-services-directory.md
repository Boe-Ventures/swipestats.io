# SwipeStats Dating Services Directory

**Status:** Product and design brief

**Scope:** SwipeStats first; reusable catalog model for Homi later

**Last updated:** 2026-07-14

## Decision summary

SwipeStats should add a curated directory of people, organizations, websites,
and apps that help people improve their online dating outcomes.

This is adjacent to, but distinct from, the existing public profile directory.
The current `/directory` lets visitors browse anonymous dating profiles and
their statistics. The new directory helps visitors find a service or product.
The first design should preserve that distinction rather than silently
repurposing `/directory`.

The initial categories are:

1. Dating coaches
2. Dating photographers
3. Matchmakers
4. AI photo generation
5. Dating apps and tools

Profile review, bio writing, messaging coaching, image selection, platform
specialization, audience specialization, and similar concepts should begin as
tags or capabilities rather than additional top-level categories.

The product should feel like a trusted editorial guide with useful commercial
connections, not an open classifieds marketplace.

## Product thesis

SwipeStats already helps a visitor understand what is happening in their
dating-app results. A directory is a natural next step: once someone identifies
a problem, SwipeStats can help them find an appropriate way to improve it.

The categories share several useful properties:

- Results often depend on location or remote availability.
- A provider may be a person, a one-person organization, a larger company, a
  website, or an app.
- Trust, specialization, and evidence matter more than a strict legal entity
  type.
- Conversion may happen through a booking link, an affiliate link, or an
  explicit request for help.
- The same catalog foundation can later support real-estate professionals in
  Homi without coupling the two products.

## Users and jobs to be done

### Visitor

- Find the right kind of help for a dating-profile or dating-app problem.
- Filter by location, remote availability, platform, audience, service, or
  price signal.
- Understand why a listing is included and whether it is verified, claimed,
  sponsored, or monetized through an affiliate link.
- Visit, book, or contact a provider without unnecessary account creation.
- Submit a broader request when they do not know which provider to choose.

### Catalog member

- Claim an existing public listing.
- Correct basic listing information.
- Manage links, services, service areas, and presentation after approval.
- Eventually receive relevant customer requests.

### SwipeStats editor or administrator

- Create and curate listings before providers claim them.
- Verify claims and listings.
- Control editorial descriptions, category placement, and disclosures.
- Distinguish organic inclusion from sponsored placement.

## Information architecture

### Existing surface

- `/directory` remains the public profile directory during the first phase.

### Recommended new surface

- A sibling landing page called **Dating Services**.
- Category landing pages for each initial category.
- A stable listing detail route that does not depend on the listing's category,
  because one listing may belong to several categories.

The exact URLs are a design and SEO decision. A reasonable starting point is:

```text
/dating-services
/dating-services/dating-coaches
/dating-services/dating-photographers
/dating-services/matchmakers
/dating-services/ai-photo-generation
/dating-services/dating-apps
/dating-services/listing/[slug]
```

Existing links to `/dating-profile-photographers` can redirect to, or become an
SEO alias for, the photographer category page.

The global navigation can present **Profiles** and **Services** as neighboring
destinations. A future redesign may turn `/directory` into a broader hub, but
that is not required for the first release.

## MVP experience

### 1. Dating Services landing page

The landing page should explain the directory in one short statement, then make
the categories immediately browsable.

Required elements:

- Clear distinction between browsing dating profiles and finding help.
- Category cards with concise descriptions and representative imagery or
  restrained iconography.
- Location input or location-aware entry point.
- A way to browse providers available remotely.
- A small editorial or methodology block explaining how listings are selected.
- A secondary CTA for providers: **Claim or add your listing**.

The page should not lead with a giant search box if the catalog is initially
small. Category-led exploration will make a sparse catalog feel intentional.

### 2. Category page

The category page is the main browse and SEO surface.

Required elements:

- Category-specific heading and editorial introduction.
- Location and remote-availability filters where relevant.
- A small set of category-appropriate filters.
- Listing cards in an editorial grid or list.
- Transparent labels for verified, claimed, featured, and affiliate listings.
- Useful empty states that can collect an email or explicit request.

Filters should be derived from capabilities rather than being identical across
every category. Examples:

| Category | Useful early filters |
| --- | --- |
| Dating coaches | Remote, platform expertise, audience, profile review, messaging |
| Photographers | City, travel radius, studio/outdoor, dating specialization |
| Matchmakers | Service area, remote consultation, audience, relationship goal |
| AI photo generation | Price signal, turnaround, realism/style, refund policy |
| Dating apps and tools | Audience, relationship goal, platform, free/paid |

Do not build ratings, crowdsourced reviews, or algorithmic ranking in the MVP.
Ordering can be editorial, featured, and then alphabetical or recently added.

### 3. Listing card

A card should answer four questions quickly:

1. What is this?
2. Who or where is it for?
3. Why might I trust it?
4. What can I do next?

Suggested content:

- Person photo, company mark, or product icon.
- Display name and short descriptor.
- Primary category and up to three useful tags.
- City/service area or **Available remotely**.
- Claimed or verified state when applicable.
- A short editorial summary.
- One primary CTA: **View profile**, **Book**, or **Visit app**.

Do not visually force a solo professional to choose between looking like a
person and looking like a business. The same entry can be presented with a
human portrait while also showing an organization or brand name.

### 4. Listing detail page

Required elements:

- Strong identity block: name, image, descriptor, categories, trust states.
- Editorial summary separated from provider-supplied copy.
- Services or capabilities.
- Service area and remote availability.
- Relevant external links.
- Primary conversion CTA.
- Affiliate or sponsored disclosure beside the affected CTA or placement.
- **Claim this listing** state for unclaimed listings.
- Related listings or nearby alternatives when the catalog has enough depth.

Human service providers should usually lead to booking or an explicit request.
Apps, websites, and AI products should usually lead to the official or affiliate
destination.

### 5. Explicit request flow

The MVP can include a light request form, but it should only create a durable
request after the visitor explicitly submits intent. Page views and ordinary
outbound clicks belong in analytics.

A request can either target one listing or an entire category. It may collect:

- Service needed
- Location or remote preference
- Short brief
- Timeline
- Optional budget signal
- Email address or authenticated user
- Consent for private delivery or a future broader broadcast

An anonymous visitor should be able to submit with an email address. Do not
require a full SwipeStats account merely to contact a provider.

The future marketplace may broadcast an anonymized request to eligible,
verified catalog members. Providers can respond through SwipeStats, and the
requester controls when direct contact details are disclosed. Bidding,
competitive proposals, and provider outreach are not part of the MVP.

### 6. Claim flow

The first release only needs a visible **Claim this listing** action and a short
form that captures the claimant, their relationship to the listing, and evidence
or an official-domain contact method.

Claim approval creates management access. Claiming a listing is not the same as
connecting to a SwipeStats customer or accessing their dating profile.

## Trust and monetization

Trust labels must have precise meanings:

- **Claimed:** an approved user manages the listing.
- **Verified:** SwipeStats has performed a defined verification check.
- **Featured:** the listing has paid or received special placement.
- **Affiliate link:** SwipeStats may receive compensation from the outbound
  action.
- **Editorial pick:** selected by SwipeStats independently of payment.

These labels can overlap and must not be collapsed into one generic badge.
Featured placement must not imply quality verification or editorial preference.

For the first release:

- Booking and affiliate links are the strongest direct conversion path.
- Track ordinary outbound clicks in product analytics.
- Add a durable referral ledger only if financial reconciliation requires it.
- Keep editorial summaries controlled by SwipeStats even after a listing is
  claimed.

## Visual direction

Extend the current SwipeStats marketing and directory language:

- Editorial and data-informed rather than luxury-marketplace styling.
- Predominantly white, gray, and near-black surfaces with the existing rose
  accent.
- Restrained cards, clear typography, and compact evidence/trust details.
- Location should be visible without turning the initial experience into a map
  product.
- Support both human portraits and product/company marks without making either
  look like an exception.
- Use photography selectively; avoid generic hearts, couples, handshakes, and
  stock-photo dating cliches.
- Make monetized states legible but not visually dominant.

Use the existing `/directory`, `/design-system`, marketing navigation, cards,
badges, buttons, and empty states as implementation references. The new surface
may improve hierarchy and polish, but it should still be recognizably
SwipeStats.

Design desktop and mobile versions of:

1. Dating Services landing page
2. Dating photographers category page with location filtering
3. A claimed solo dating coach detail page
4. An AI photo product detail page with an affiliate CTA
5. Request-help modal or sheet
6. Unclaimed and verified card states

## Catalog model

The public object is a market-facing catalog entry, not a legal identity record.

### `catalog_entry`

Stable, frequently queried fields remain relational:

```text
id
slug
name
primary_category
status
verification_status
data JSONB
created_at
updated_at
```

The JSONB document can contain:

```json
{
  "entityTypes": ["person", "organization"],
  "displayStyle": "person",
  "categories": ["dating_coach"],
  "tags": ["profile_review", "hinge", "remote"],
  "serviceAreas": [
    { "city": "New York", "region": "NY", "country": "US" },
    { "remote": true }
  ],
  "links": [
    { "type": "official", "url": "https://example.com" },
    { "type": "booking", "url": "https://cal.com/example" },
    {
      "type": "affiliate",
      "url": "https://example.com/?ref=swipestats",
      "network": "direct"
    }
  ],
  "attributes": {
    "languages": ["en"],
    "offersFreeConsultation": true,
    "priceRange": "$$"
  },
  "sourceRefs": []
}
```

`person`, `organization`, `website`, and `app` are descriptive entity types, not
mutually exclusive table types. `displayStyle` controls the primary visual
presentation.

### Supporting tables

```text
catalog_entry_member
  entry_id
  user_id
  role

catalog_entry_claim
  entry_id
  claimant_user_id nullable
  claimant_email nullable
  status
  evidence JSONB
  reviewed_by nullable
  created_at
  reviewed_at nullable

catalog_request
  requester_user_id nullable
  anonymous_session_id nullable
  target_entry_id nullable
  category
  status
  visibility
  contact JSONB
  data JSONB
  expires_at nullable
  created_at
  updated_at
```

The schema should enforce that a request has a usable requester identity or
contact method. Sensitive contact details should not be exposed to catalog
members merely because a future request is broadcast.

## Product-specific relationships

The shared catalog must not become a generic permissions system.

In a future SwipeStats coaching product, a coach may connect to a SwipeStats
user. That relationship should use a separate table with optional access to
specific resources such as Tinder, Hinge, or other provider profiles. The user
is the durable customer identity; provider profiles are optional scoped
resources. Nothing in the directory MVP grants that access.

In Homi, an agent can claim a catalog entry, but access to a customer's saved
home collection should continue through Homi's existing collection-access
model. The claim and the customer-resource permission are different actions.

## External registries and provenance

The catalog should not replace operational provider registries.

For Homi later:

- `real-estate-portal-schemas` remains the source of truth for executable portal
  facts such as provider identifiers, countries, URL schemas, filters, and
  serialization.
- Homi's known-provider constant remains its broad runtime-recognition list.
- Catalog entries own editorial, commercial, claim, and presentation data.
- `sourceRefs` connect a catalog entry to an operational provider identifier.
- Search-friendly fields may be snapshotted into the catalog, but operational
  behavior is read from the package rather than written back from the catalog.

Towers.club suggests one additional future relationship: a catalog member may
pay for a clearly disclosed placement on a city, building, guide, or other
editorial surface. Model that later as a real placement record, not merely a tag.

## Explicit non-goals for the first release

- Coach access to student accounts or dating profiles
- Marketplace bidding or broadcast responses
- Provider-to-customer messaging inbox
- Payments between visitors and providers
- Crowdsourced ratings and reviews
- Automated ranking or quality scores
- A provider self-service dashboard beyond the minimum claim workflow
- Replacing SwipeStats' existing profile directory
- Replacing Homi's provider constants or `real-estate-portal-schemas`
- Sharing catalog tables directly between the SwipeStats and Homi databases

## Suggested delivery phases

### Phase 1: Design and editorial prototype

- Approve information architecture and route names.
- Design landing, category, listing, request, and claim states.
- Seed enough representative listings to test every entity and CTA type.
- Validate whether category-led browsing feels useful with a small catalog.

### Phase 2: Catalog foundation

- Add catalog entry, member, claim, and request schema.
- Add public read APIs and editorial admin workflow.
- Implement landing, category, and detail pages.
- Add direct, booking, and affiliate link tracking.

### Phase 3: Claims and demand capture

- Ship claim review and approved listing management.
- Ship explicit requests for selected categories.
- Measure outbound actions, requests, and provider interest.

### Phase 4: Marketplace and product connections

- Add request recipients and provider responses if demand exists.
- Add the separate coach-to-user relationship with explicit resource scopes.
- Add sponsored placements with clear disclosures.
- Reuse the catalog pattern in Homi while keeping its operational registries and
  collection permissions separate.

## Handoff prompt for Claude Design

Use this document as the product contract. Explore a polished, responsive
SwipeStats Dating Services directory that feels editorial, evidence-aware, and
trustworthy rather than like a generic marketplace. Preserve the conceptual
distinction from the current anonymous Profile Directory. Design the six screens
and states listed under **Visual direction**, using the existing SwipeStats
marketing site and design-system route as visual references. Prioritize category
exploration for a small initial catalog, visible location/remote context, support
for both human and product listings, transparent trust and monetization labels,
and a low-friction explicit request flow. Do not introduce ratings, bidding,
payments, student-account access, or a large provider dashboard.
