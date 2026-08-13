import { describe, expect, test } from "bun:test";

const PROFILE_SERVICE = await Bun.file(
  new URL("./profile.service.ts", import.meta.url),
).text();
const ROUTER = await Bun.file(
  new URL("../../api/routers/profileRouter.ts", import.meta.url),
).text();

describe("same-account Tinder re-upload", () => {
  test("routes repeat exports to canonical replacement", () => {
    expect(ROUTER).toContain("replaceTinderProfileRevision");
    expect(ROUTER).not.toContain("additiveUpdateProfile({");
  });

  test("rebuilds derived facts instead of upserting usage rows", () => {
    const replacement = PROFILE_SERVICE.slice(
      PROFILE_SERVICE.indexOf(
        "export async function replaceTinderProfileRevision",
      ),
    );
    for (const table of [
      "messageTable",
      "matchTable",
      "tinderUsageTable",
      "mediaTable",
      "profileMetaTable",
      "jobTable",
      "schoolTable",
      "aiOutputTable",
    ]) {
      expect(replacement).toContain(`.delete(${table})`);
    }
    expect(replacement).not.toContain("onConflictDoUpdate");
    expect(replacement).not.toContain("IS DISTINCT FROM ROW");
  });
});
