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
  startsAt?: string;
  endsAt?: string;
  proof: ReadonlyArray<{
    value: string;
    label: string;
  }>;
}

export const ACTIVE_SPONSOR_CAMPAIGN: SponsorCampaign = {
  id: "house-research-datasets-2026-08",
  kind: "house",
  sponsorName: "SwipeStats",
  eyebrow: "SwipeStats Research",
  barMessage: "Interested in dating app research?",
  title: "Real dating app datasets for research",
  description:
    "294M swipes, 3.1M matches, and 12,000+ real Tinder profiles, available as research datasets.",
  ctaText: "See our datasets",
  href: "/research",
  proof: [
    { value: "294M", label: "swipes" },
    { value: "3.1M", label: "matches" },
    { value: "12,000+", label: "real profiles" },
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

export function isSponsorCampaignActive(
  campaign: SponsorCampaign,
  now = new Date(),
) {
  const currentTime = now.getTime();
  const startsAt = campaign.startsAt
    ? Date.parse(campaign.startsAt)
    : Number.NEGATIVE_INFINITY;
  const endsAt = campaign.endsAt
    ? Date.parse(campaign.endsAt)
    : Number.POSITIVE_INFINITY;

  return currentTime >= startsAt && currentTime < endsAt;
}
