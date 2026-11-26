import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyAndValidateRedactions,
  deterministicLeakWarnings,
  isReplacementOnly,
  main,
  messageChunkManifest,
  messageChunks,
  messageSetDigest,
  parseOptions,
  type MessageCodexResult,
  type PreparedMessage,
} from "./anonymize-local-codex";

interface RunArtifact {
  sourceTransaction: string;
  mode: string;
}

interface SummaryArtifact {
  counts: Record<string, number>;
  subjects: Array<{ subjectId: string }>;
}

describe("isReplacementOnly", () => {
  test("accepts a single typed replacement", () => {
    expect(
      isReplacementOnly(
        "Text me at 555-123-4567 tonight",
        "Text me at [PHONE_NUMBER] tonight",
      ),
    ).toBe(true);
  });

  test("accepts multiple typed replacements", () => {
    expect(
      isReplacementOnly(
        "Email a@example.com or call 5551234567",
        "Email [EMAIL] or call [PHONE_NUMBER]",
      ),
    ).toBe(true);
  });

  test("rejects ordinary edits", () => {
    expect(
      isReplacementOnly(
        "Text me at 555-123-4567 tonight",
        "Please text me at [PHONE_NUMBER] tonight",
      ),
    ).toBe(false);
  });

  test("rejects a token that replaces no source text", () => {
    expect(isReplacementOnly("hello", "hello[OTHER]")).toBe(false);
  });
});

describe("operator boundaries", () => {
  test("allows offline preparation without confirmations", () => {
    const options = parseOptions([
      "--input",
      "/private/tmp/research.jsonl",
      "--output-dir",
      "/private/tmp/anonymized",
      "--offset",
      "20",
    ]);

    expect(options.run).toBe(false);
    expect(options.offset).toBe(20);
    expect(options.includeImages).toBe(false);
  });

  test("requires confirmation before a database read", () => {
    expect(() => parseOptions(["--latest-production"])).toThrow(
      "--confirm-database-read",
    );
  });

  test("treats optional image preparation as a database-backed read", () => {
    expect(() =>
      parseOptions([
        "--input",
        "/private/tmp/research.jsonl",
        "--include-images",
      ]),
    ).toThrow("--confirm-database-read");
  });

  test("requires confirmation before model processing", () => {
    expect(() =>
      parseOptions(["--input", "/private/tmp/research.jsonl", "--run"]),
    ).toThrow("--confirm-model-processing");
  });
});

describe("message preparation", () => {
  const messages = Array.from({ length: 201 }, (_, index) => ({
    id: `m${index + 1}`,
    thread: "T1",
    order: index + 1,
    text: "hello",
  }));

  test("chunks deterministically at the message ceiling", () => {
    expect(messageChunks(messages).map((chunk) => chunk.length)).toEqual([
      200, 1,
    ]);
  });

  test("starts a new chunk before crossing the character ceiling", () => {
    const largeMessages = [
      { id: "m1", thread: "T1", order: 1, text: "a".repeat(30_000) },
      { id: "m2", thread: "T1", order: 2, text: "b".repeat(20_000) },
    ];

    expect(messageChunks(largeMessages).map((chunk) => chunk.length)).toEqual([
      1, 1,
    ]);
  });

  test("writes a content-free chunk manifest with stable digests", () => {
    const first = messageChunkManifest(messages);
    const second = messageChunkManifest(messages);

    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({
      index: 1,
      messageCount: 200,
      characterCount: 1_000,
    });
    expect(first[0]?.digest).toHaveLength(64);
    expect(JSON.stringify(first)).not.toContain("hello");
  });

  test("flags direct identifiers that remain after token removal", () => {
    expect(
      deterministicLeakWarnings([
        {
          id: "m1",
          thread: "T1",
          order: 1,
          text: "email me at person@example.com or [PHONE_NUMBER]",
        },
      ]),
    ).toEqual(["m1: email-like text"]);
  });

  test("applies typed replacements while preserving message metadata", () => {
    const messages: PreparedMessage[] = [
      {
        id: "m1",
        thread: "T1",
        order: 1,
        text: "email person@example.com",
        sentDate: "2026-01-01T00:00:00.000Z",
        to: 0,
      },
    ];
    const result: MessageCodexResult = {
      subjectId: "subject-1",
      messageSetDigest: messageSetDigest(messages),
      redactions: [
        {
          messageId: "m1",
          sanitizedText: "email [EMAIL]",
          piiTypes: ["EMAIL"],
        },
      ],
    };

    expect(applyAndValidateRedactions("subject-1", messages, result)).toEqual(
      [],
    );
    expect(messages[0]).toEqual({
      id: "m1",
      thread: "T1",
      order: 1,
      text: "email [EMAIL]",
      sentDate: "2026-01-01T00:00:00.000Z",
      to: 0,
    });
  });

  test("rejects replacement tokens that disagree with the declared PII type", () => {
    const messages: PreparedMessage[] = [
      {
        id: "m1",
        thread: "T1",
        order: 1,
        text: "email person@example.com",
      },
    ];
    const result: MessageCodexResult = {
      subjectId: "subject-1",
      messageSetDigest: messageSetDigest(messages),
      redactions: [
        {
          messageId: "m1",
          sanitizedText: "email [EMAIL]",
          piiTypes: ["PHONE_NUMBER"],
        },
      ],
    };

    expect(() =>
      applyAndValidateRedactions("subject-1", messages, result),
    ).toThrow("PII types do not match");
  });
});

describe("offline preparation", () => {
  test("prepares content-free manifests without database or model access", async () => {
    const directory = await mkdtemp(join(tmpdir(), "swipestats-anonymize-"));
    const input = join(directory, "source.jsonl");
    const output = join(directory, "output");
    const privateMessage = "reach me at person@example.com";
    await writeFile(
      input,
      `${JSON.stringify({
        profile: { tinderId: "fixture-profile" },
        matches: [
          {
            messages: [
              {
                content: privateMessage,
                contentRaw: privateMessage,
                messageType: "TEXT",
                order: 1,
                sentDate: "2026-01-01T00:00:00.000Z",
                to: 0,
              },
            ],
          },
        ],
      })}\n`,
    );

    try {
      await main(["--input", input, "--output-dir", output, "--limit", "1"]);

      const run = JSON.parse(
        await readFile(join(output, "run.json"), "utf8"),
      ) as RunArtifact;
      const summary = JSON.parse(
        await readFile(join(output, "summary.json"), "utf8"),
      ) as SummaryArtifact;
      const subject = summary.subjects[0]!.subjectId;
      const manifest = await readFile(
        join(output, "subjects", subject, "manifest.json"),
        "utf8",
      );

      expect(run.sourceTransaction).toBe("NONE");
      expect(run.mode).toBe("PREPARE_ONLY");
      expect(summary.counts.PREPARED).toBe(1);
      expect(manifest).not.toContain(privateMessage);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
