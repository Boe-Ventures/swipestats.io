import { describe, expect, it } from "bun:test";
import {
  extractHingeCsvData,
  parseHingeCsv,
  type HingeCsvFiles,
} from "./hinge-csv";
import { parseAnonymizedHingeBlob } from "./hinge-runtime-schema";
import {
  mergeHingeCsvActivity,
  summarizeHingeCsvActivity,
} from "@/lib/hinge/csv-activity";
import { filterHingeJsonByConsent } from "@/lib/utils/filterHingePayload";

function csv(headers: string[], rows: string[][]) {
  return [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
}
const signup = "2025-01-01T00:00:00.000Z";
const later = "2025-02-01T12:00:00.000Z";
function files(messages = ["hello,\nthere", "hello,\nthere"]): HingeCsvFiles {
  return {
    user: csv(
      [
        "timestamp",
        "signup_timestamp",
        "age",
        "gender",
        "email",
        "phone_number",
        "birthday",
        "workplaces",
        "job_title",
      ],
      [
        [
          signup,
          signup,
          "30",
          "male",
          "private@example.com",
          "+15555550123",
          "1995-01-01",
          "[Private Workplace]",
          "Private Job",
        ],
        [later, "", "", "", "", "", "", "", ""],
      ],
    ),
    // A later authentication timestamp must not replace the signup identity.
    registration: csv(["timestamp"], [["2025-01-01T00:10:00.000Z"]]),
    chat_message: csv(
      ["timestamp", "message", "action", "match_id"],
      messages.map((message) => [
        later,
        message,
        "sent",
        "raw-private-conversation-id",
      ]),
    ),
    match_likes: csv(
      ["timestamp", "comment"],
      [[later, "private like comment"]],
    ),
    match_skips: csv(["timestamp", "comment"], [[later, ""]]),
  };
}

describe("Hinge CSV import integrity", () => {
  it("folds sparse updates, strips identifiers/content before transport, and exposes only measured activity", async () => {
    const payload = await extractHingeCsvData(files());
    const json = parseAnonymizedHingeBlob(payload.anonymizedHingeJson);
    expect(json.User.profile).toMatchObject({ age: 30, gender: "male" });
    expect(json.User.account.signup_time).toBe(signup);
    expect(json.Matches).toEqual([]);
    const serialized = JSON.stringify(json);
    for (const secret of [
      "private@example.com",
      "+15555550123",
      "1995-01-01",
      "raw-private-conversation-id",
      "hello,",
      "private like comment",
    ])
      expect(serialized).not.toContain(secret);
    expect(() =>
      parseAnonymizedHingeBlob({
        ...json,
        CsvActivity: {
          ...json.CsvActivity!,
          events: [
            { ...json.CsvActivity!.events[0]!, raw_match_id: "sensitive" },
          ],
        },
      }),
    ).toThrow();
    const summary = summarizeHingeCsvActivity(json.CsvActivity!);
    expect(summary).toMatchObject({
      conversations: 1,
      counts: { LIKE: 1, SKIP: 1, MESSAGE_SENT: 2 },
    });
    expect(summary.tables).not.toContain("match_blocks");
    expect(JSON.stringify(summary)).not.toContain(
      json.CsvActivity!.events[0]!.id,
    );
    const filtered = filterHingeJsonByConsent(json, {
      sharePhotos: false,
      shareWorkInfo: false,
    });
    expect(JSON.stringify(filtered)).not.toContain("Private Workplace");
    expect(JSON.stringify(filtered)).not.toContain("Private Job");
    expect(filtered.Media).toEqual([]);
  });
  it("preserves duplicate occurrences and retained history across reordered/narrower retries", async () => {
    const first = (await extractHingeCsvData(files())).anonymizedHingeJson
      .CsvActivity!;
    const narrow = (await extractHingeCsvData(files(["hello,\nthere"])))
      .anonymizedHingeJson.CsvActivity!;
    const merged = mergeHingeCsvActivity(first, narrow)!;
    expect(merged.events).toHaveLength(first.events.length);
    expect(summarizeHingeCsvActivity(merged).counts.MESSAGE_SENT).toBe(2);
    expect(mergeHingeCsvActivity(merged, first)!.events).toHaveLength(
      first.events.length,
    );
    const changed = (
      await extractHingeCsvData(
        files(["different", "hello,\nthere", "hello,\nthere"]),
      )
    ).anonymizedHingeJson.CsvActivity!;
    expect(
      summarizeHingeCsvActivity(mergeHingeCsvActivity(first, changed)!).counts
        .MESSAGE_SENT,
    ).toBe(3);
  });
  it("rejects damaged rows, ambiguous signup history, and unsupported message direction instead of corrupting analytics", async () => {
    expect(() => parseHingeCsv('a,b\n"unterminated')).toThrow();
    expect(() => parseHingeCsv("a,b\n1,2,3")).toThrow();
    const mixed = files();
    mixed.user += `\r\n${csv([], [[later, later, "30", "", "", "", "", "", ""]])
      .split("\r\n")
      .pop()}`;
    const mixedError: unknown = await extractHingeCsvData(mixed).catch(
      (error: unknown) => error,
    );
    expect(mixedError instanceof Error && mixedError.message).toContain(
      "more than one account",
    );
    const invalid = files();
    invalid.chat_message = csv(
      ["timestamp", "message", "action", "match_id"],
      [[later, "hello", "unknown", "some-id"]],
    );
    const directionError: unknown = await extractHingeCsvData(invalid).catch(
      (error: unknown) => error,
    );
    expect(directionError instanceof Error && directionError.message).toContain(
      "unsupported message direction",
    );
  });
});

// Duplicate transactions and corrected end dates must not multiply timeline
// periods or let a narrower/older upload erase newer subscription evidence.
describe("Hinge subscription timeline imports", () => {
  it("deduplicates transactions, retains newer corrections, and excludes billing details", async () => {
    const source = files();
    const columns = [
      "timestamp",
      "start_timestamp",
      "end_timestamp",
      "currency",
      "price_shown",
      "cancel_reason",
    ];
    source.store_subscription_purchases = csv(columns, [
      [
        "2025-01-02T00:00:00Z",
        signup,
        "2025-02-01T00:00:00Z",
        "NOK",
        "149.00",
        "sensitive reason",
      ],
      [
        "2025-01-03T00:00:00Z",
        signup,
        "2025-03-01T00:00:00Z",
        "NOK",
        "149.00",
        "",
      ],
      ["2025-01-03T00:00:00Z", signup, "2025-03-01T00:00:00Z", "NOK", "", ""],
    ]);
    const current = (await extractHingeCsvData(source)).anonymizedHingeJson
      .CsvActivity!;
    expect(current.subscriptions).toHaveLength(1);
    expect(current.subscriptions![0]!.endAt).toBe("2025-03-01T00:00:00.000Z");
    for (const secret of ["149.00", "NOK", "sensitive reason", "price_shown"])
      expect(JSON.stringify(current)).not.toContain(secret);
    source.store_subscription_purchases = csv(columns, [
      [
        "2025-01-02T00:00:00Z",
        signup,
        "2025-02-01T00:00:00Z",
        "NOK",
        "149.00",
        "",
      ],
    ]);
    const older = (await extractHingeCsvData(source)).anonymizedHingeJson
      .CsvActivity!;
    expect(mergeHingeCsvActivity(current, older)!.subscriptions).toEqual(
      current.subscriptions,
    );
    expect(mergeHingeCsvActivity(current, current)!.subscriptions).toHaveLength(
      1,
    );
  });
});
