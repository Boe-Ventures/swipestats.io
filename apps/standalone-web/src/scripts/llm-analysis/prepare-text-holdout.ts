import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { textProfileSchema } from "@/lib/research/text-redaction";

const [input, priorDirectory, destination] = process.argv.slice(2);
if (!input || !priorDirectory || !destination)
  throw new Error(
    "Usage: prepare-text-holdout.ts input.jsonl prior-audit-directory output-directory",
  );
const profiles = (await readFile(input, "utf8"))
  .trim()
  .split("\n")
  .map((line) => textProfileSchema.parse(JSON.parse(line)));
const excluded = new Set<string>();
for (const file of await readdir(priorDirectory)) {
  if (!file.endsWith(".json") || file.endsWith("-screen.json")) continue;
  const prior = JSON.parse(
    await readFile(path.join(priorDirectory, file), "utf8"),
  ) as { redacted?: { id: string } };
  if (prior.redacted) excluded.add(prior.redacted.id);
}
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const candidates = profiles
  .flatMap((profile) =>
    profile.conversations.map((conversation) => ({ profile, conversation })),
  )
  .filter(
    ({ conversation }) =>
      conversation.messages.length > 0 &&
      !excluded.has(conversation.id) &&
      JSON.stringify(conversation).length < 50000,
  )
  .sort((a, b) =>
    digest(`holdout-20261116:${a.conversation.id}`).localeCompare(
      digest(`holdout-20261116:${b.conversation.id}`),
    ),
  );
const general = candidates.slice(0, 60);
const selectedIds = new Set(general.map(({ conversation }) => conversation.id));
const contactPattern =
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\s().-]*){8,}|(?:instagram|snapchat|whatsapp|insta|snap)\b|(?:m\.me|t\.me|wa\.me)\//i;
const enriched = candidates
  .filter(
    ({ conversation }) =>
      !selectedIds.has(conversation.id) &&
      conversation.messages.some((message) =>
        contactPattern.test(message.content),
      ),
  )
  .slice(0, 40);
if (general.length !== 60 || enriched.length !== 40)
  throw new Error("Not enough unused conversations for the requested holdout");
const selected = [...general, ...enriched];
if (new Set(selected.map(({ conversation }) => conversation.id)).size !== 100)
  throw new Error("Duplicate conversation in holdout");
await mkdir(destination, { recursive: true, mode: 0o700 });
await writeFile(
  path.join(destination, "input.jsonl"),
  selected
    .map(({ profile, conversation }) =>
      JSON.stringify({ ...profile, conversations: [conversation] }),
    )
    .join("\n") + "\n",
  { mode: 0o600, flag: "wx" },
);
const manifest = {
  seed: "holdout-20261116",
  sourceSha256: digest(await readFile(input, "utf8")),
  excludedConversations: excluded.size,
  conversations: selected.length,
  profiles: new Set(selected.map(({ profile }) => profile.profileId)).size,
  messages: selected.reduce(
    (n, { conversation }) => n + conversation.messages.length,
    0,
  ),
  maxConversationCharacters: Math.max(
    ...selected.map(({ conversation }) => JSON.stringify(conversation).length),
  ),
  generalSample: 60,
  contactEnrichedSample: 40,
  limitation:
    "New conversations from existing pilot profiles, not unseen profiles. Evaluate the two strata separately. No external model calls made during preparation.",
  subjects: selected.map(({ conversation }, index) => ({
    hash: digest(conversation.id),
    stratum: index < 60 ? "general" : "contact-enriched",
  })),
};
await writeFile(
  path.join(destination, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  { mode: 0o600, flag: "wx" },
);
console.log(JSON.stringify({ ...manifest, subjects: undefined }));
