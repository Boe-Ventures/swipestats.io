/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { parseAnonymizedTinderData } from "./validation.service";
const minimalExport = {
  Messages: [],
  Usage: {
    app_opens: { "2026-01-12": 1, "2026-02-20": 2 },
    swipes_likes: {},
    swipes_passes: {},
    matches: {},
    messages_sent: {},
    messages_received: {},
  },
  User: {
    active_time: "2026-07-02T22:00:00.000Z",
    birth_date: "2001-01-01T00:00:00.000Z",
    create_date: "2025-01-01T00:00:00.000Z",
    gender: "M",
    gender_filter: "F",
    interested_in: "F",
    instagram: false,
    spotify: false,
  },
};
describe("parseAnonymizedTinderData", () => {
  test("rejects invalid usage counts and calendar keys", () => {
    for (const appOpens of [
      { "2026-01-12": -1 },
      { "2026-01-12": 1.5 },
      { "2026-02-30": 1 },
    ]) {
      expect(() =>
        parseAnonymizedTinderData({
          ...minimalExport,
          Usage: { ...minimalExport.Usage, app_opens: appOpens },
        }),
      ).toThrow("Usage.app_opens");
    }
  });
  test("enforces photo and work consent on the server contract", () => {
    expect(() =>
      parseAnonymizedTinderData(
        { ...minimalExport, Photos: ["https://example.com/photo.jpg"] },
        { photos: false, work: true },
      ),
    ).toThrow("without photo consent");
    expect(() =>
      parseAnonymizedTinderData(
        {
          ...minimalExport,
          User: {
            ...minimalExport.User,
            jobs: [{ company: { displayed: true, name: "Private Employer" } }],
          },
        },
        { photos: true, work: false },
      ),
    ).toThrow("without work consent");
  });
});
