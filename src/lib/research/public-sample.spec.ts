import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import JSZip from "jszip";
import { z } from "zod";
import { serializeResearchProfile } from "./dataset-contract";
test("public JSONL and ZIP preserve the research sample", async () => {
  const text = readFileSync(
    "public/downloads/swipestats-demo-dataset.jsonl",
    "utf8",
  );
  const zip = await JSZip.loadAsync(
    readFileSync("public/downloads/swipestats-demo-dataset.jsonl.zip"),
  );
  expect(await zip.file("swipestats-demo-dataset.jsonl")?.async("string")).toBe(
    text,
  );
  expect(await zip.file("README.md")?.async("string")).toBe(
    readFileSync("public/downloads/README.md", "utf8"),
  );
  const profileSchema = z
    .object({
      type: z.literal("profile"),
      profile: z.record(z.string(), z.unknown()),
      meta: z.record(z.string(), z.unknown()).nullable(),
      usage: z.array(z.record(z.string(), z.unknown())),
      matchCount: z.union([z.number(), z.string()]),
    })
    .strict();
  for (const line of text.trim().split("\n")) {
    const row: unknown = JSON.parse(line);
    if (z.object({ type: z.string() }).parse(row).type !== "profile") continue;
    const p = profileSchema.parse(row);
    expect(serializeResearchProfile(p)).toEqual(p);
  }
});
