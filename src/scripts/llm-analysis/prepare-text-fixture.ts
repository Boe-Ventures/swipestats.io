import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { z } from "zod";
import { textProfileSchema } from "@/lib/research/text-redaction";

// Input is a private JSON array of { sourceId, profileId, provider }.
// profileId is the existing research pseudonym; sourceId is used only to query.
const [cohortFile, outputFile, limitArgument = "20"] = process.argv.slice(2);
if (!cohortFile || !outputFile)
  throw new Error(
    "Usage: prepare-text-fixture.ts cohort.json output.jsonl [limit]",
  );
const limit = z.coerce.number().int().positive().parse(limitArgument);
const cohort = z
  .array(
    z.object({
      sourceId: z.string().min(1),
      profileId: z.string().min(1),
      provider: z.enum(["TINDER", "HINGE"]),
    }),
  )
  .parse(JSON.parse(await readFile(cohortFile, "utf8")))
  .slice(0, limit);
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL is required for the selected source database");
const sql = neon(process.env.DATABASE_URL);
const partial = `${outputFile}.partial`;
await mkdir(path.dirname(outputFile), { recursive: true, mode: 0o700 });
const profiles = [];
for (const member of cohort) {
  const present =
    member.provider === "TINDER"
      ? await sql`SELECT 1 FROM tinder_profile WHERE tinder_id = ${member.sourceId}`
      : await sql`SELECT 1 FROM hinge_profile WHERE hinge_id = ${member.sourceId}`;
  if (present.length !== 1)
    throw new Error("Cohort profile is missing from source database");
  const rows = await sql`
    SELECT m.id, coalesce(json_agg(json_build_object(
      'id', msg.id, 'content', msg.content, 'order', msg."order",
      'sentDate', msg.sent_date_raw, 'messageType', msg.message_type
    ) ORDER BY msg."order", msg.id) FILTER (WHERE msg.id IS NOT NULL), '[]') AS messages
    FROM match m LEFT JOIN message msg ON msg.match_id = m.id
    WHERE (${member.provider} = 'TINDER' AND m.tinder_profile_id = ${member.sourceId})
       OR (${member.provider} = 'HINGE' AND m.hinge_profile_id = ${member.sourceId})
    GROUP BY m.id, m."order" ORDER BY m."order", m.id`;
  profiles.push(
    textProfileSchema.parse({
      profileId: member.profileId,
      provider: member.provider,
      conversations: rows,
    }),
  );
  console.log(
    JSON.stringify({
      extracted: profiles.length,
      total: cohort.length,
      conversations: rows.length,
    }),
  );
}
await writeFile(
  partial,
  profiles.map((profile) => JSON.stringify(profile)).join("\n") + "\n",
  { mode: 0o600, flag: "wx" },
);
await rename(partial, outputFile);
const lengths = profiles
  .map((profile) => JSON.stringify(profile).length)
  .sort((a, b) => a - b);
console.log(
  JSON.stringify({
    profiles: profiles.length,
    messages: profiles.reduce(
      (total, profile) =>
        total +
        profile.conversations.reduce(
          (count, conversation) => count + conversation.messages.length,
          0,
        ),
      0,
    ),
    profileCharacters: {
      min: lengths[0],
      median: lengths[Math.floor(lengths.length / 2)],
      max: lengths.at(-1),
    },
  }),
);
