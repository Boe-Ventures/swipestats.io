export type SwipeRankPublicationLocationGranularity =
  | "NONE"
  | "COUNTRY"
  | "REGION"
  | "CITY";

export interface SwipeRankDescriptorDisclosure {
  showGender: boolean;
  showAgeBand: boolean;
  showInterestedIn: boolean;
  locationGranularity: SwipeRankPublicationLocationGranularity;
}

const LOCATION_DISCLOSURE_LEVEL: Record<
  SwipeRankPublicationLocationGranularity,
  number
> = {
  NONE: 0,
  COUNTRY: 1,
  REGION: 2,
  CITY: 3,
};

/** True when a public update reveals any descriptor more precisely than now. */
export function expandsSwipeRankDescriptorDisclosure(
  current: SwipeRankDescriptorDisclosure,
  next: SwipeRankDescriptorDisclosure,
): boolean {
  return (
    (!current.showGender && next.showGender) ||
    (!current.showAgeBand && next.showAgeBand) ||
    (!current.showInterestedIn && next.showInterestedIn) ||
    LOCATION_DISCLOSURE_LEVEL[next.locationGranularity] >
      LOCATION_DISCLOSURE_LEVEL[current.locationGranularity]
  );
}

export function requiresSwipeRankPublicationConsent(
  status: "PRIVATE" | "PUBLIC" | null,
  current: SwipeRankDescriptorDisclosure,
  next: SwipeRankDescriptorDisclosure,
): boolean {
  return (
    status !== "PUBLIC" || expandsSwipeRankDescriptorDisclosure(current, next)
  );
}
