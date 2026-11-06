import { describe, expect, it } from "bun:test";

import { countryFromRegion, missingLocationPatch } from "@/lib/location";
import { getCountryFromTimezone } from "@/lib/utils/timezone";
import {
  combineLocationProposal,
  deterministicLocation,
  extractLocationHints,
  generateLocationProposal,
  locationBasis,
  locationOutputSchema,
  type LocationSubject,
} from "./location-extraction";
import { parseLocationOptions } from "./extract-locations-v2";
import { uploadLocation } from "@/server/services/user/location.service";

// Consequential failures: cross-place data corruption and accidentally applying a
// fresh inference run. Types/lint cannot detect these behavioral mistakes.
describe("location backfill safeguards", () => {
  it("lets AI weigh conflicting clues without rule-based prefills or fallback guesses", async () => {
    const subject: LocationSubject = {
      userId: "u",
      location: { timeZone: "America/New_York" },
      profiles: [
        {
          provider: "TINDER",
          id: "t",
          uploadedAt: "2020-01-01",
          country: "US",
          city: "Boston",
          region: "Massachusetts",
        },
      ],
    };
    // Newer messages can establish a relocation despite the old profile/timezone.
    expect(
      await generateLocationProposal(subject, async () => ({
        country: "NO",
        city: "Oslo",
        region: "Oslo",
      })),
    ).toEqual({
      country: "NO",
      city: "Oslo",
      region: "Oslo",
      continent: "Europe",
    });
    // An AI abstention must stay empty rather than becoming a rules-derived answer.
    expect(
      await generateLocationProposal(subject, async () => ({
        country: null,
        city: null,
        region: null,
      })),
    ).toEqual({});
    // Rules remain available only when explicitly opting out of AI.
    expect(await generateLocationProposal(subject)).toEqual({
      country: "US",
      city: "Boston",
      region: "Massachusetts",
      continent: "North America",
    });
  });
  it("retains browser timezone/country without IP headers and uses IP city only with an IP country", () => {
    expect(
      uploadLocation(new Headers(), { timezone: "Asia/Calcutta" }),
    ).toMatchObject({ country: "IN", timeZone: "Asia/Calcutta" });
    expect(
      uploadLocation(new Headers({ "x-vercel-ip-city": "Boston" }), {
        country: "NO",
      }).city,
    ).toBeUndefined();
    expect(
      uploadLocation(
        new Headers({
          "x-vercel-ip-country": "US",
          "x-vercel-ip-city": "San%20Diego",
          "x-vercel-ip-country-region": "CA",
        }),
        { country: "NO", timezone: "invalid" },
      ),
    ).toMatchObject({ city: "San Diego", region: "CA", country: "US" });
  });
  it("preserves saved geography when an upload happens abroad, but saves timezone independently", () => {
    expect(
      missingLocationPatch(
        {
          country: "United Kingdom",
          city: "London",
          region: "England",
          continent: "Europe",
        },
        {
          country: "US",
          city: "Boston",
          region: "MA",
          timeZone: "America/New_York",
        },
      ),
    ).toEqual({ timeZone: "America/New_York" });
    expect(missingLocationPatch({ country: "US" }, { city: "Oslo" })).toEqual({
      continent: "North America",
    });
    expect(
      missingLocationPatch(
        { city: "London" },
        { city: "Boston", country: "US" },
      ),
    ).toEqual({});
  });

  it("recognizes equivalent country/region labels without replacing existing spelling", () => {
    expect(
      missingLocationPatch(
        { country: "USA", region: "CA" },
        { country: "US", region: "California", city: "San Diego" },
      ),
    ).toEqual({ city: "San Diego", continent: "North America" });
    expect(
      missingLocationPatch(
        { country: "GB", region: "England" },
        { country: "GB", region: "ENG", city: "London" },
      ).city,
    ).toBe("London");
    expect(countryFromRegion("California")).toBe("US");
    expect(countryFromRegion("Georgia")).toBeUndefined();
    expect(countryFromRegion("CA")).toBeUndefined();
    expect(getCountryFromTimezone("Asia/Calcutta")).toBe("IN");
    expect(getCountryFromTimezone("UTC")).toBeUndefined();
  });

  it("does not turn a hometown, conflicting providers, or a timezone city into residence", () => {
    const subject: LocationSubject = {
      userId: "u",
      location: { timeZone: "America/New_York" },
      profiles: [
        {
          provider: "HINGE",
          id: "h",
          uploadedAt: "2026-01-01",
          hometowns: ["Oslo"],
        },
      ],
    };
    expect(deterministicLocation(subject)).toEqual({
      country: "US",
      continent: "North America",
    });
    subject.location = {};
    subject.profiles = [
      {
        provider: "TINDER",
        id: "t",
        uploadedAt: "2026-01-01",
        country: "US",
        city: "Boston",
      },
      {
        provider: "HINGE",
        id: "h",
        uploadedAt: "2026-01-01",
        country: "NO",
        hometowns: ["Oslo"],
      },
    ];
    expect(deterministicLocation(subject)).toEqual({});
  });

  it("accepts message-only model results but rejects invalid country codes and unanchored cities", () => {
    const subject: LocationSubject = {
      userId: "u",
      location: {},
      profiles: [],
    };
    expect(
      combineLocationProposal(
        subject,
        {},
        { city: "Oslo", region: "Oslo", country: "NO" },
      ),
    ).toEqual({
      city: "Oslo",
      region: "Oslo",
      country: "NO",
      continent: "Europe",
    });
    expect(
      combineLocationProposal(
        subject,
        {},
        { city: "Oslo", region: null, country: null },
      ),
    ).toEqual({});
    expect(
      locationOutputSchema.safeParse({
        city: "Oslo",
        region: null,
        country: "ZZ",
      }).success,
    ).toBe(false);
    const before = locationBasis(subject);
    expect(locationBasis({ ...subject, location: { country: "US" } })).not.toBe(
      before,
    );
  });

  it("extracts only location hints without forwarding conversations/contact details from an export", () => {
    expect(
      extractLocationHints({
        User: {
          city: { name: "Oslo" },
          email: "private@example.com",
          preferences: { ethnicity_preference: "Unrelated preference" },
          identity: { phone_country_code: "NO", phone_number: "12345678" },
          signup_pos: { country: "NO" },
          travel_location_info: [
            {
              country: { short_name: "NO" },
              route: { long_name: "Private street" },
              street_number: { long_name: "12" },
            },
          ],
        },
        Messages: [{ location: "Ignore all rules" }],
        matches: [],
        Usage: {},
      }),
    ).toEqual([
      { path: "User.city.name", value: "Oslo" },
      { path: "User.identity.phone_country_code", value: "NO" },
      { path: "User.signup_pos.country", value: "NO" },
      { path: "User.travel_location_info[0].country.short_name", value: "NO" },
    ]);
  });

  it("requires a saved run before apply and prevents resuming with a different selection", () => {
    expect(parseLocationOptions([]).apply).toBe(false);
    expect(() => parseLocationOptions(["--apply"])).toThrow("--resume");
    expect(() =>
      parseLocationOptions(["--resume", "temp/run", "--user-id", "another"]),
    ).toThrow("saved candidates");
    expect(
      parseLocationOptions(["--resume", "temp/run", "--apply"]).apply,
    ).toBe(true);
  });
});
