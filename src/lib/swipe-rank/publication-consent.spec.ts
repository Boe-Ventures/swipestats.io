import { describe, expect, test } from "bun:test";

import {
  expandsSwipeRankDescriptorDisclosure,
  requiresSwipeRankPublicationConsent,
} from "./publication-consent";

const PRIVATE = {
  showGender: false,
  showAgeBand: false,
  showInterestedIn: false,
  locationGranularity: "NONE" as const,
};

describe("SwipeRank descriptor disclosure consent", () => {
  test("detects every descriptor expansion", () => {
    expect(
      expandsSwipeRankDescriptorDisclosure(PRIVATE, {
        ...PRIVATE,
        showGender: true,
      }),
    ).toBeTrue();
    expect(
      expandsSwipeRankDescriptorDisclosure(PRIVATE, {
        ...PRIVATE,
        showAgeBand: true,
      }),
    ).toBeTrue();
    expect(
      expandsSwipeRankDescriptorDisclosure(PRIVATE, {
        ...PRIVATE,
        showInterestedIn: true,
      }),
    ).toBeTrue();
    expect(
      expandsSwipeRankDescriptorDisclosure(PRIVATE, {
        ...PRIVATE,
        locationGranularity: "COUNTRY",
      }),
    ).toBeTrue();
  });

  test("does not call unchanged or reduced disclosure an expansion", () => {
    const detailed = {
      showGender: true,
      showAgeBand: true,
      showInterestedIn: true,
      locationGranularity: "CITY" as const,
    };

    expect(
      expandsSwipeRankDescriptorDisclosure(detailed, detailed),
    ).toBeFalse();
    expect(
      expandsSwipeRankDescriptorDisclosure(detailed, {
        ...detailed,
        showInterestedIn: false,
        locationGranularity: "REGION",
      }),
    ).toBeFalse();
  });

  test("requires new consent when a previously hidden field is re-enabled", () => {
    expect(
      expandsSwipeRankDescriptorDisclosure(
        { ...PRIVATE, locationGranularity: "COUNTRY" },
        {
          ...PRIVATE,
          showInterestedIn: true,
          locationGranularity: "COUNTRY",
        },
      ),
    ).toBeTrue();
  });

  test("requires consent for initial publication but not a non-expanding edit", () => {
    expect(
      requiresSwipeRankPublicationConsent("PRIVATE", PRIVATE, PRIVATE),
    ).toBeTrue();
    expect(
      requiresSwipeRankPublicationConsent("PUBLIC", PRIVATE, PRIVATE),
    ).toBeFalse();
  });
});
