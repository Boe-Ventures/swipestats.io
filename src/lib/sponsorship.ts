export const SPONSOR_PLACEMENTS = ["sitewide-bar", "blog-inline"] as const;

export type SponsorPlacement = (typeof SPONSOR_PLACEMENTS)[number];

export interface SponsorCampaign {
  id: string;
  kind: "house" | "paid";
  sponsorName: string;
  eyebrow: string;
  barMessage: string;
  title: string;
  description: string;
  ctaText: string;
  href: string;
  proof: ReadonlyArray<{
    value: string;
    label: string;
  }>;
}

export const ACTIVE_SPONSOR_CAMPAIGN: SponsorCampaign = {
  id: "house-sponsorship-2026-07",
  kind: "house",
  sponsorName: "SwipeStats",
  eyebrow: "Advertise with SwipeStats",
  barMessage: "Reach 50K+ dating readers every month.",
  title: "Reach 50K+ people actively improving their dating lives",
  description:
    "Sponsor a high-intent dating guide or product surface with clear placement and reporting from SwipeStats.",
  ctaText: "Sponsor SwipeStats",
  href: "mailto:paw@swipestats.io?subject=SwipeStats%20sponsorship%20inquiry",
  proof: [
    { value: "50K+", label: "monthly visitors" },
    { value: "Dating", label: "high-intent audience" },
    { value: "Clear", label: "placement reporting" },
  ],
};

export const PREVIEW_PAID_SPONSOR_CAMPAIGN: SponsorCampaign = {
  id: "preview-paid-sponsor",
  kind: "paid",
  sponsorName: "Your brand",
  eyebrow: "Sponsored partner",
  barMessage: "A useful offer from a SwipeStats partner.",
  title: "Put a relevant partner offer in front of dating-app users",
  description:
    "Paid campaigns use the same measured placement, with sponsor-specific creative, destination, and reporting.",
  ctaText: "Visit sponsor",
  href: "https://example.com",
  proof: [
    { value: "Your", label: "brand and offer" },
    { value: "One", label: "clear destination" },
    { value: "Real", label: "campaign reporting" },
  ],
};

/**
 * The house bar stays hidden on pages with a manually placed inline card so a
 * reader never sees the same sponsorship ask twice on one page.
 */
export const INLINE_SPONSOR_PATHS = ["/blog/tinder-statistics"] as const;
