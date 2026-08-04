/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { extractTinderData } from "./extract-tinder-data";
import { filterPayloadByConsent } from "@/lib/utils/filterTinderPayload";

const rawExport = {
  Usage: {
    app_opens: { "2026-01-12T00:00:00.000Z": 1 },
    swipes_likes: { "2026-01-12T00:00:00.000Z": 3 },
    swipes_passes: {},
    matches: {},
    messages_sent: {},
    messages_received: {},
  },
  User: {
    email: "private@example.com",
    full_name: "Private Person",
    name: "Private",
    username: "private-user",
    phone_id: "private-phone",
    birth_date: "2001-01-01T00:00:00.000Z",
    create_date: "2025-01-01T00:00:00.000Z",
    gender: "M",
    gender_filter: "F",
    interested_in: "F",
  },
  Messages: [],
  Photos: [],
};

describe("extractTinderData", () => {
  test("validates and normalizes the raw export before anonymizing it", async () => {
    const payload = await extractTinderData(JSON.stringify(rawExport));

    expect(payload.tinderId).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.anonymizedTinderJson.Usage.app_opens).toEqual({
      "2026-01-12": 1,
    });
    expect(payload.anonymizedTinderJson.Usage.swipes_likes).toEqual({
      "2026-01-12": 3,
    });
    expect(payload.anonymizedTinderJson.User).not.toHaveProperty("email");
    expect(payload.anonymizedTinderJson.User).not.toHaveProperty("full_name");
    expect(payload.anonymizedTinderJson.User.create_date_inferred).toBe(false);
  });

  test("marks an observation-derived create date as inferred", async () => {
    const { create_date: _createDate, ...userWithoutCreateDate } =
      rawExport.User;
    const payload = await extractTinderData(
      JSON.stringify({ ...rawExport, User: userWithoutCreateDate }),
    );

    expect(payload.anonymizedTinderJson.User.create_date).toBe("2026-01-12");
    expect(payload.anonymizedTinderJson.User.create_date_inferred).toBe(true);
  });

  test("fails locally when a count is not a nonnegative integer", async () => {
    const invalid = {
      ...rawExport,
      Usage: {
        ...rawExport.Usage,
        app_opens: { "2026-01-12": -1 },
      },
    };

    let error: unknown;
    try {
      await extractTinderData(JSON.stringify(invalid));
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("Usage.app_opens");
  });

  test("projects raw exports onto the strict public allowlist", async () => {
    const exportWithPrivateMetadata = {
      ...rawExport,
      private_top_level: { token: "never-upload" },
      Usage: {
        ...rawExport.Usage,
        advertising_id: { "2026-01-12": "ad-id" },
        idfa: { "2026-01-12": "idfa" },
        future_private_metric: { secret: "never-upload" },
      },
      User: {
        ...rawExport.User,
        ip_address: "203.0.113.10",
        pos: { lat: 59.91, lon: 10.75 },
        travel_pos: { lat: 40.71, lon: -74 },
        authIds: { phone: "private" },
        future_private_field: "never-upload",
        city: {
          name: "Oslo",
          region: "Oslo",
          coords: { lat: 59.91, lon: 10.75 },
        },
        jobs: [
          {
            company: {
              displayed: true,
              name: "Acme",
              employee_id: "private",
            },
          },
        ],
      },
      Messages: [
        {
          match_id: "provider-match",
          partner_id: "private",
          messages: [
            {
              to: 1,
              from: "Private Person",
              message: "hello",
              sent_date: "2026-01-12T12:00:00.000Z",
              recipient_phone: "private",
            },
          ],
        },
      ],
      Photos: [
        {
          id: "provider-photo-id",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
          type: "photo",
          url: "https://example.com/photo.jpg",
          prompt_id: "provider-prompt-id",
          prompt_text: "My public prompt",
          filename: "private-filename.jpg",
          fb_id: "private-facebook-id",
        },
      ],
    };

    const payload = await extractTinderData(
      JSON.stringify(exportWithPrivateMetadata),
    );
    const publicData = payload.anonymizedTinderJson;

    expect(Object.keys(publicData).sort()).toEqual([
      "Messages",
      "Photos",
      "Usage",
      "User",
    ]);
    expect(publicData.Usage).not.toHaveProperty("advertising_id");
    expect(publicData.Usage).not.toHaveProperty("idfa");
    expect(publicData.Usage).not.toHaveProperty("future_private_metric");
    expect(publicData.User).not.toHaveProperty("ip_address");
    expect(publicData.User).not.toHaveProperty("pos");
    expect(publicData.User).not.toHaveProperty("travel_pos");
    expect(publicData.User).not.toHaveProperty("authIds");
    expect(publicData.User).not.toHaveProperty("future_private_field");
    expect(publicData.User.city).toEqual({ name: "Oslo", region: "Oslo" });
    expect(publicData.User.jobs?.[0]?.company).toEqual({
      displayed: true,
      name: "Acme",
    });
    expect(publicData.Messages[0]).toEqual({
      match_id: "provider-match",
      messages: [
        {
          to: 1,
          message: "hello",
          sent_date: "2026-01-12T12:00:00.000Z",
        },
      ],
    });
    expect(publicData.Photos).toEqual([
      {
        type: "photo",
        url: "https://example.com/photo.jpg",
        prompt_text: "My public prompt",
      },
    ]);

    const withoutOptionalConsent = filterPayloadByConsent(payload, {
      photos: false,
      work: false,
      terms: true,
    });
    expect(withoutOptionalConsent.anonymizedTinderJson.Photos).toEqual([]);
    expect(
      withoutOptionalConsent.anonymizedTinderJson.User.jobs,
    ).toBeUndefined();
  });
});
