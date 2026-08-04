export type SwipeRankGender = "MALE" | "FEMALE" | "OTHER" | "MORE" | "UNKNOWN";

export type SwipeRankOrientation =
  | "Straight"
  | "Gay"
  | "Bi"
  | "Queer"
  | "Not specified";

/** A compact public label inferred from current profile preferences. */
export function formatSwipeRankOrientation(
  gender: SwipeRankGender | null,
  interestedIn: SwipeRankGender | null,
): SwipeRankOrientation {
  if (
    !gender ||
    !interestedIn ||
    gender === "UNKNOWN" ||
    interestedIn === "UNKNOWN"
  ) {
    return "Not specified";
  }
  if (interestedIn === "MORE") return "Bi";
  const genderIsBinary = gender === "MALE" || gender === "FEMALE";
  const interestIsBinary = interestedIn === "MALE" || interestedIn === "FEMALE";
  if (genderIsBinary && interestIsBinary) {
    return gender === interestedIn ? "Gay" : "Straight";
  }
  return "Queer";
}
