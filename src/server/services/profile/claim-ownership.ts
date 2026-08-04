/** Unknown cleanup state must fail closed: retaining an orphan is recoverable. */
export function canDeleteClaimedAnonymousUser(
  hasRemainingData: boolean | undefined,
): boolean {
  return hasRemainingData === false;
}
