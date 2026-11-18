import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { textProfileSchema } from "@/lib/research/text-redaction";

const output = process.argv[2];
if (!output || !process.env.DATABASE_URL)
  throw new Error(
    "Usage: DATABASE_URL=... prepare-large-text-fixture.ts output-directory",
  );
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const sql = neon(process.env.DATABASE_URL);
const memberSchema = z.object({
  sourceId: z.string(),
  profileId: z.string(),
  provider: z.enum(["TINDER", "HINGE"]),
});
const ali = z
  .array(memberSchema)
  .parse(
    JSON.parse(await readFile("temp/text-redaction/ali-cohort.json", "utf8")),
  );
const previous = new Set(ali.slice(0, 20).map((p) => p.sourceId));
const tinder = ali
  .filter((p) => !previous.has(p.sourceId))
  .sort((a, b) =>
    hash(`large-v9:${a.sourceId}`).localeCompare(
      hash(`large-v9:${b.sourceId}`),
    ),
  )
  .slice(0, 120);
const hingeRows =
  await sql`SELECT h.hinge_id AS id FROM hinge_profile h WHERE EXISTS (SELECT 1 FROM match m WHERE m.hinge_profile_id = h.hinge_id AND m.total_message_count > 0) ORDER BY md5(h.hinge_id || 'large-v9') LIMIT 40`;
const hinge = z
  .array(z.object({ id: z.string() }))
  .parse(hingeRows)
  .map(({ id }) => ({
    sourceId: id,
    profileId: `hinge-test-${hash(id).slice(0, 16)}`,
    provider: "HINGE" as const,
  }));
const members = [...tinder, ...hinge];
await mkdir(output, { recursive: true, mode: 0o700 });
await writeFile(`${output}/private-members.json`, JSON.stringify(members), {
  mode: 0o600,
  flag: "wx",
});
const selectedRows = await sql`
WITH members AS (SELECT * FROM jsonb_to_recordset(${JSON.stringify(members)}::jsonb) AS x("sourceId" text, "profileId" text, provider text)),
ranked AS (
 SELECT m.id, x."profileId", x.provider,
 row_number() OVER (PARTITION BY x.provider, x."sourceId" ORDER BY md5(m.id || 'large-v9')) AS ordinal
 FROM members x JOIN match m ON
 (x.provider = 'TINDER' AND m.tinder_profile_id = x."sourceId") OR
 (x.provider = 'HINGE' AND m.hinge_profile_id = x."sourceId")
 WHERE m.total_message_count > 0
)
SELECT id, "profileId", provider FROM ranked WHERE ordinal <= 12 ORDER BY md5(id || 'large-v9')`;
const rows = z
  .array(
    z.object({
      id: z.string(),
      profileId: z.string(),
      provider: z.enum(["TINDER", "HINGE"]),
    }),
  )
  .parse(selectedRows);
const hingeSelected = rows.filter((r) => r.provider === "HINGE").slice(0, 200);
const selected = [
  ...rows
    .filter((r) => r.provider === "TINDER")
    .slice(0, 1000 - hingeSelected.length),
  ...hingeSelected,
];
const profiles = [];
const excluded = [];
for (let start = 0; start < selected.length; start += 50) {
  const batch = selected.slice(start, start + 50);
  const messages =
    await sql`SELECT msg.match_id AS id, json_agg(json_build_object('id', msg.id, 'content', msg.content, 'order', msg."order", 'sentDate', msg.sent_date_raw, 'messageType', msg.message_type) ORDER BY msg."order", msg.id) AS messages FROM message msg WHERE msg.match_id = ANY(${batch.map((b) => b.id)}::text[]) GROUP BY msg.match_id`;
  for (const row of messages) {
    const member = batch.find((b) => b.id === row.id)!;
    const profile = textProfileSchema.parse({
      profileId: member.profileId,
      provider: member.provider,
      conversations: [row],
    });
    const modelSize = JSON.stringify(
      profile.conversations.map((c) => ({
        id: c.id,
        messages: c.messages.map(({ id, content, messageType }) => ({
          id,
          content,
          messageType,
        })),
      })),
    ).length;
    if (modelSize > 60000) {
      excluded.push({
        subject: hash(member.id),
        reason: "over-60000-characters",
        modelSize,
      });
      continue;
    }
    profiles.push(profile);
  }
  await writeFile(
    `${output}/input.partial.jsonl`,
    profiles.map((p) => JSON.stringify(p)).join("\n") + "\n",
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      extracted: profiles.length,
      selected: selected.length,
      excluded: excluded.length,
    }),
  );
}
await rename(`${output}/input.partial.jsonl`, `${output}/input.jsonl`);
const manifest = {
  seed: "large-v9",
  selection:
    "Deterministic general sample, max 12 conversations per newly sampled profile; excludes original 20 Tinder pilot profiles",
  selected: selected.length,
  conversations: profiles.length,
  messages: profiles.reduce(
    (n, p) => n + p.conversations[0]!.messages.length,
    0,
  ),
  profiles: new Set(profiles.map((p) => `${p.provider}:${p.profileId}`)).size,
  byProvider: {
    TINDER: profiles.filter((p) => p.provider === "TINDER").length,
    HINGE: profiles.filter((p) => p.provider === "HINGE").length,
  },
  excluded,
  inputDigest: hash(await readFile(`${output}/input.jsonl`, "utf8")),
  subjects: profiles.map((p) => ({
    subject: hash(p.conversations[0]!.id),
    provider: p.provider,
  })),
};
await writeFile(`${output}/manifest.json`, JSON.stringify(manifest, null, 2), {
  mode: 0o600,
});
console.log(JSON.stringify({ ...manifest, subjects: undefined }));
