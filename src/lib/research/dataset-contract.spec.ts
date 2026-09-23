import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { serializeResearchProfile } from "./dataset-contract";
import { isResearchLicenseValid, isExportExpired } from "./access-policy";

test("free sample retains every shipped field and stable join ID", () => {
  const lines = readFileSync(
    "public/downloads/swipestats-demo-dataset.jsonl",
    "utf8",
  )
    .trim()
    .split("\n");
  for (const line of lines) {
    const row = JSON.parse(line) as Parameters<
      typeof serializeResearchProfile
    >[0] & { type: "profile" };
    if (row.type === "profile")
      expect(serializeResearchProfile(row)).toEqual(row);
  }
});
test("research columns flow through while established internal fields stay excluded", () => {
  const profile = {
    tinderId: "stable-id",
    bio: "Agreed research bio",
    interests: ["music"],
    userId: "account-secret",
    computed: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-02",
    llmAnalyzedAt: "internal",
    bioOriginal: "internal",
    swipestatsVersion: "V4",
    futureResearchMetric: 42,
  };
  const meta = {
    id: "meta-id",
    tinderProfileId: "stable-id",
    messagesSentTotal: 20,
    futureResearchMetric: 42,
  };
  const usage = [
    {
      tinderProfileId: "stable-id",
      messagesSent: 2,
      futureResearchMetric: 42,
    },
  ];
  const result = serializeResearchProfile({
    profile,
    meta,
    usage,
    matchCount: 3,
  });
  expect(result.profile).toEqual({
    tinderId: "stable-id",
    bio: "Agreed research bio",
    interests: ["music"],
    futureResearchMetric: 42,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-02",
    swipestatsVersion: "V4",
  });
  expect(result.meta?.id).toBe("meta-id");
  expect(result.usage[0]?.tinderProfileId).toBe("stable-id");
  expect(JSON.stringify(result)).not.toContain("secret");
  expect(JSON.stringify(result)).not.toContain("internal");
  expect(result.meta?.futureResearchMetric).toBe(42);
  expect(result.usage[0]?.futureResearchMetric).toBe(42);
  expect(() =>
    serializeResearchProfile({
      profile,
      meta,
      usage: [{ tinderProfileId: "other" }],
      matchCount: 3,
    }),
  ).toThrow();
  expect(() =>
    serializeResearchProfile({
      profile,
      meta: { ...meta, hingeProfileId: "hinge" },
      usage,
      matchCount: 3,
    }),
  ).toThrow();
});
const evidence = {
  valid: true,
  license_key: {
    status: "active",
    expires_at: null as string | null,
    test_mode: false,
  },
  meta: { store_id: 97795, variant_id: 456562 },
};
const expected = {
  storeId: "97795",
  variantIds: ["470938", "456562", "470945", "1783971"],
  production: true,
};
test("every purchased product requires valid same-store live entitlement", () => {
  for (const id of expected.variantIds)
    expect(
      isResearchLicenseValid(
        { ...evidence, meta: { ...evidence.meta, variant_id: Number(id) } },
        expected,
      ),
    ).toBe(true);
  expect(isResearchLicenseValid({ ...evidence, valid: false }, expected)).toBe(
    false,
  );
  expect(
    isResearchLicenseValid(
      { ...evidence, meta: { ...evidence.meta, store_id: 1 } },
      expected,
    ),
  ).toBe(false);
  expect(
    isResearchLicenseValid(
      { ...evidence, meta: { ...evidence.meta, variant_id: 624630 } },
      expected,
    ),
  ).toBe(false);
  for (const status of ["disabled", "expired"])
    expect(
      isResearchLicenseValid(
        { ...evidence, license_key: { ...evidence.license_key, status } },
        expected,
      ),
    ).toBe(false);
  expect(
    isResearchLicenseValid(
      {
        ...evidence,
        license_key: { ...evidence.license_key, test_mode: true },
      },
      expected,
    ),
  ).toBe(false);
  for (const expires_at of ["invalid", "2000-01-01"])
    expect(
      isResearchLicenseValid(
        { ...evidence, license_key: { ...evidence.license_key, expires_at } },
        expected,
      ),
    ).toBe(false);
  expect(isExportExpired(new Date("invalid"))).toBe(true);
});
