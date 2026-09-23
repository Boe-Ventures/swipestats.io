/** Research-table columns flow through as the schema evolves. Application fields
 * attached to a research profile retain the established export exclusions.
 */
export const RESEARCH_DATASET_VERSION = "1.0";
type Row = Record<string, unknown>;
export function serializeResearchProfile(input: {
  profile: Row;
  meta: Row | null;
  usage: Row[];
  matchCount: number | string;
}) {
  const sourceId = input.profile.tinderId;
  if (typeof sourceId !== "string" || !sourceId)
    throw new Error("Missing research profile ID");
  if (
    !Number.isInteger(Number(input.matchCount)) ||
    Number(input.matchCount) < 0
  )
    throw new Error("Invalid match count");
  const assertOwner = (row: Row) => {
    if (row.tinderProfileId !== sourceId || row.hingeProfileId != null)
      throw new Error(
        "Research row does not belong to the selected Tinder profile",
      );
  };
  if (input.meta) assertOwner(input.meta);
  const {
    userId: _userId,
    computed: _computed,
    llmAnalyzedAt: _llmAnalyzedAt,
    bioOriginal: _bioOriginal,
    ...profile
  } = input.profile;
  return {
    type: "profile" as const,
    profile,
    meta: input.meta,
    usage: input.usage.map((row) => {
      assertOwner(row);
      return row;
    }),
    matchCount: input.matchCount,
  };
}
