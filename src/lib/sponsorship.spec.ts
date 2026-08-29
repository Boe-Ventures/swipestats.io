import { describe, expect, test } from "bun:test";

import {
  ACTIVE_SPONSOR_CAMPAIGN,
  isSponsorCampaignActive,
  type SponsorCampaign,
} from "./sponsorship";

describe("isSponsorCampaignActive", () => {
  test("the research datasets campaign runs with no end date", () => {
    expect(isSponsorCampaignActive(ACTIVE_SPONSOR_CAMPAIGN)).toBe(true);
    expect(
      isSponsorCampaignActive(
        ACTIVE_SPONSOR_CAMPAIGN,
        new Date("2030-01-01T00:00:00Z"),
      ),
    ).toBe(true);
  });

  test("respects a configured start and end window", () => {
    const windowed: SponsorCampaign = {
      ...ACTIVE_SPONSOR_CAMPAIGN,
      startsAt: "2026-07-14T14:00:00+02:00",
      endsAt: "2026-08-04T14:00:00+02:00",
    };

    expect(
      isSponsorCampaignActive(windowed, new Date("2026-07-14T13:59:59+02:00")),
    ).toBe(false);
    expect(
      isSponsorCampaignActive(windowed, new Date("2026-07-18T12:00:00+02:00")),
    ).toBe(true);
    expect(
      isSponsorCampaignActive(windowed, new Date("2026-08-04T14:00:00+02:00")),
    ).toBe(false);
  });
});
