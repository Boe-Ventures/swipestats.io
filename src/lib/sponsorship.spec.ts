import { describe, expect, test } from "bun:test";

import {
  ACTIVE_SPONSOR_CAMPAIGN,
  isSponsorCampaignActive,
} from "./sponsorship";

describe("isSponsorCampaignActive", () => {
  test("runs the blog sponsorship experiment inside its configured window", () => {
    expect(
      isSponsorCampaignActive(
        ACTIVE_SPONSOR_CAMPAIGN,
        new Date("2026-07-18T12:00:00+02:00"),
      ),
    ).toBe(true);

    expect(
      isSponsorCampaignActive(
        ACTIVE_SPONSOR_CAMPAIGN,
        new Date("2026-07-28T12:00:00+02:00"),
      ),
    ).toBe(true);
  });

  test("stays hidden before the experiment begins", () => {
    expect(
      isSponsorCampaignActive(
        ACTIVE_SPONSOR_CAMPAIGN,
        new Date("2026-07-14T13:59:59+02:00"),
      ),
    ).toBe(false);
  });

  test("stops at the configured end time", () => {
    expect(
      isSponsorCampaignActive(
        ACTIVE_SPONSOR_CAMPAIGN,
        new Date("2026-08-04T14:00:00+02:00"),
      ),
    ).toBe(false);
  });
});
