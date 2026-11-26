import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { z } from "zod";

import {
  locationText,
  missingLocationPatch,
  type LocationValues,
} from "@/lib/location";
import { fetchBlobJson } from "@/server/services/blob.service";
import { locationRegistrySyncCte } from "@/server/services/user/location-registry";
import { swipeRankBuildLockName } from "@/server/services/swipe-rank/constants";
import {
  extractLocationHints,
  generateLocationProposal,
  locationBasis,
  locationJsonSchema,
  locationOutputSchema,
  locationPrompt,
  redactLocationMessage,
  subjectKey,
  type LocationProfile,
  type LocationSubject,
} from "./location-extraction";

const fields = ["city", "region", "country", "timeZone", "continent"] as const;
const locationField = z.string().max(100).nullable().optional();
const locationSchema = z
  .object({
    city: locationField,
    region: locationField,
    country: locationField,
    timeZone: locationField,
    continent: locationField,
  })
  .strict();
const manifestSchema = z.object({
  version: z.literal(2),
  database: z.string(),
  model: z.string(),
  ai: z.boolean(),
  users: z.array(z.string()),
});
const savedResultSchema = z.object({
  userId: z.string(),
  basis: z.string(),
  proposal: locationSchema,
});

interface Options {
  outputDir: string;
  resume: boolean;
  apply: boolean;
  ai: boolean;
  limit: number;
  model: string;
  provider: "TINDER" | "HINGE" | null;
  userId: string | null;
  timeoutMs: number;
}

function help() {
  console.log(`Location extraction v2, using the signed-in local Codex CLI.

  bun locations:extract --limit 25
  bun locations:extract --no-ai --limit 100
  bun locations:extract --resume temp/location-extraction/<run>
  bun locations:extract --resume temp/location-extraction/<run> --apply

Options:
  --limit N          Maximum users in a new run (default 25; unknown countries first)
  --provider NAME    TINDER or HINGE; selects users with that provider
  --user-id ID       Process one specific uploader
  --model MODEL      Codex model (default gpt-6.1-sol)
  --timeout-seconds N  Per-user Codex timeout (default 180)
  --output-dir DIR   New run directory (default temp/location-extraction/<timestamp>)
  --resume DIR       Resume the same candidate list and reuse saved proposals
  --no-ai            Opt into rules-only reconciliation instead of AI-first post-fill
  --apply            Apply saved proposals from --resume; never runs inference

DATABASE_URL selects the database. No implicit production connection is fetched.
Default mode reads the database and writes private local proposals, never database rows.
Apply fills missing USER fields only. Existing profile rows are preserved; analytics
already use user-location fallbacks. No schema changes or historical-location claims.
`);
}

export function parseLocationOptions(args: string[]): Options {
  const flags = new Set(["--apply", "--no-ai"]);
  const values = new Set([
    "--limit",
    "--provider",
    "--user-id",
    "--model",
    "--timeout-seconds",
    "--output-dir",
    "--resume",
  ]);
  const parsed = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const name = args[i]!;
    if (flags.has(name)) parsed.set(name, "true");
    else if (values.has(name)) {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`Missing value for ${name}`);
      parsed.set(name, value);
    } else throw new Error(`Unknown option: ${name}`);
  }
  const integer = (name: string, fallback: number, max: number) => {
    const n = Number(parsed.get(name) ?? fallback);
    if (!Number.isSafeInteger(n) || n < 1 || n > max)
      throw new Error(`${name} must be between 1 and ${max}`);
    return n;
  };
  const resume = parsed.get("--resume");
  if (parsed.has("--apply") && !resume)
    throw new Error(
      "--apply requires --resume with saved proposals. Generate a dry run first.",
    );
  if (
    resume &&
    [
      "--output-dir",
      "--limit",
      "--provider",
      "--user-id",
      "--model",
      "--no-ai",
    ].some((name) => parsed.has(name))
  ) {
    throw new Error(
      "--resume uses the saved candidates/model; do not combine it with selection or model options.",
    );
  }
  const provider = parsed.get("--provider")?.toUpperCase();
  if (provider && provider !== "TINDER" && provider !== "HINGE")
    throw new Error("--provider must be TINDER or HINGE");
  return {
    outputDir: resolve(
      resume ??
        parsed.get("--output-dir") ??
        join(
          "temp",
          "location-extraction",
          new Date().toISOString().replace(/[:.]/g, "-"),
        ),
    ),
    resume: Boolean(resume),
    apply: parsed.has("--apply"),
    ai: !parsed.has("--no-ai"),
    limit: integer("--limit", 25, 100_000),
    model: parsed.get("--model") ?? "gpt-6.1-sol",
    provider: provider === "TINDER" || provider === "HINGE" ? provider : null,
    userId: parsed.get("--user-id") ?? null,
    timeoutMs: integer("--timeout-seconds", 180, 1800) * 1000,
  };
}

async function saveJson(path: string, data: unknown) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporary, path);
}

async function optionalJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

function databaseIdentity(url: string) {
  const parsed = new URL(url);
  // Pooling and direct endpoints are the same branch. No credentials are persisted.
  return createHash("sha256")
    .update(`${parsed.hostname.replace("-pooler.", ".")}${parsed.pathname}`)
    .digest("hex");
}

function codexEnvironment() {
  return Object.fromEntries(
    ["PATH", "HOME", "CODEX_HOME", "TMPDIR", "LANG", "SYSTEMROOT"].flatMap(
      (key) => (process.env[key] ? [[key, process.env[key]]] : []),
    ),
  );
}

async function requireChatGptLogin() {
  const child = Bun.spawn(["codex", "login", "status"], {
    env: codexEnvironment(),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0 || !/logged in using chatgpt/i.test(`${out}\n${err}`)) {
    throw new Error(
      "Sign into the Codex CLI with ChatGPT before running AI extraction. API-key login is not used by this script.",
    );
  }
}

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : "Unknown error")
    .replace(/(?:postgres(?:ql)?|https?):\/\/\S+/gi, "[URL]")
    .replace(/(?:sk-|sb_secret_)[\w-]+/g, "[SECRET]")
    .slice(0, 500);
}

type Query = NeonQueryFunction<false, false>;

async function getSubject(
  query: Query,
  userId: string,
): Promise<LocationSubject | null> {
  const users =
    await query`SELECT city, region, country, time_zone AS "timeZone", continent FROM "user" WHERE id = ${userId}`;
  if (!users[0]) return null;
  const profiles = await query`
    SELECT 'TINDER' AS provider, tinder_id AS id, city, region, country, created_at::text AS "uploadedAt", NULL::text[] AS hometowns
    FROM tinder_profile WHERE user_id = ${userId}
    UNION ALL
    SELECT 'HINGE', hinge_id, NULL, NULL, country, created_at::text, hometowns
    FROM hinge_profile WHERE user_id = ${userId}
    ORDER BY "uploadedAt" DESC, provider, id
  `;
  return {
    userId,
    location: locationSchema.parse(users[0]) as LocationValues,
    profiles: profiles as LocationProfile[],
  };
}

async function gatherEvidence(query: Query, subject: LocationSubject) {
  const files = await query`
    SELECT id, file, blob_url FROM original_anonymized_file
    WHERE user_id = ${subject.userId} AND data_provider IN ('TINDER', 'HINGE')
    ORDER BY created_at DESC, id LIMIT 4
  `;
  const exports: { hints: ReturnType<typeof extractLocationHints> }[] = [];
  let unavailableExports = 0;
  for (const file of files) {
    try {
      const data: unknown =
        file.file ??
        (file.blob_url ? await fetchBlobJson(String(file.blob_url)) : null);
      if (data) exports.push({ hints: extractLocationHints(data) });
      else unavailableExports++;
    } catch {
      // Never print a private blob URL, signed token, or export content on errors.
      unavailableExports++;
    }
  }
  const messages: Record<string, unknown>[] = [];
  for (const profile of subject.profiles) {
    // Query each indexed provider FK separately. Diversify over conversations,
    // rather than letting one thread consume the entire evidence budget.
    const column =
      profile.provider === "TINDER" ? "tinder_profile_id" : "hinge_profile_id";
    const rows = await query(
      `
      WITH sampled AS (
        SELECT match_id, sent_date, content, "to",
          row_number() OVER (PARTITION BY match_id ORDER BY sent_date DESC, id) AS position
        FROM message WHERE ${column} = $1 AND message_type = 'TEXT'
          AND char_length(content) BETWEEN 15 AND 1000
      )
      SELECT match_id, sent_date::text, content, "to" FROM sampled
      WHERE position <= 4 ORDER BY sent_date DESC, match_id LIMIT 60
    `,
      [profile.id],
    );
    for (const row of rows)
      messages.push({
        provider: profile.provider,
        conversation: subjectKey(String(row.match_id)),
        date: row.sent_date,
        recipient: row.to,
        text: redactLocationMessage(String(row.content)),
      });
  }
  return {
    saved: subject.location,
    profiles: subject.profiles.map(({ id: _id, ...profile }) => profile),
    exports,
    messages,
    unavailableExports,
  };
}

export async function inferLocationWithCodex(
  evidence: unknown,
  directory: string,
  model: string,
  timeoutMs: number,
) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const schemaPath = join(directory, "schema.json");
  const outputPath = join(directory, "location.json");
  await saveJson(schemaPath, locationJsonSchema);
  // Only the existing CLI sign-in and OS runtime are inherited. No DB/provider keys.
  const env = codexEnvironment();
  const child = Bun.spawn(
    [
      "codex",
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--skip-git-repo-check",
      "--sandbox",
      "read-only",
      "--color",
      "never",
      "--json",
      "--disable",
      "shell_tool",
      "--disable",
      "apps",
      "--disable",
      "plugins",
      "--disable",
      "code_mode",
      "--disable",
      "code_mode_host",
      "--disable",
      "view_image",
      "--config",
      'web_search="disabled"',
      "--config",
      "model_reasoning_effort=low",
      "--model",
      model,
      "--output-schema",
      schemaPath,
      "--output-last-message",
      outputPath,
      "--cd",
      directory,
      "-",
    ],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe", env },
  );
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, timeoutMs);
  try {
    await child.stdin.write(locationPrompt(evidence));
    await child.stdin.end();
    const [events, stderr, exit] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    await writeFile(join(directory, "codex-events.jsonl"), events, {
      mode: 0o600,
    });
    await writeFile(join(directory, "codex-stderr.log"), stderr, {
      mode: 0o600,
    });
    if (timedOut)
      throw new Error("Codex timed out; resume to retry this user.");
    if (exit !== 0)
      throw new Error(
        `Codex exited ${exit}; inspect the private per-user log.`,
      );
    return locationOutputSchema.parse(await optionalJson(outputPath));
  } finally {
    clearTimeout(timer);
  }
}

/** A single conditional statement protects manual edits and profile ownership races. */
export async function applyLocationProposal(
  query: Query,
  subject: LocationSubject,
  proposal: LocationValues,
) {
  // Saved proposals contain only missing fields, so retain the saved country
  // anchor when revalidating a city/region patch at apply time.
  const patch = missingLocationPatch(subject.location, {
    ...subject.location,
    ...proposal,
  });
  const changed = fields.filter((field) => locationText(patch[field]));
  if (!changed.length) return false;
  const columns = {
    city: "city",
    region: "region",
    country: "country",
    timeZone: "time_zone",
    continent: "continent",
  };
  const params: unknown[] = [subject.userId];
  const bind = (value: unknown) => {
    params.push(value ?? null);
    return `$${params.length}`;
  };
  const assignments = changed.map(
    (field) => `${columns[field]} = ${bind(patch[field])}`,
  );
  const preimage = fields.map(
    (field) =>
      `${columns[field]} IS NOT DISTINCT FROM ${bind(subject.location[field])}`,
  );
  const ownership = subject.profiles.map((profile) => {
    const table =
      profile.provider === "TINDER" ? "tinder_profile" : "hinge_profile";
    const id = profile.provider === "TINDER" ? "tinder_id" : "hinge_id";
    const descriptorGuard =
      profile.provider === "TINDER"
        ? `AND city IS NOT DISTINCT FROM ${bind(profile.city)} AND region IS NOT DISTINCT FROM ${bind(profile.region)}`
        : `AND hometowns IS NOT DISTINCT FROM ${bind(profile.hometowns)}::text[]`;
    return `EXISTS (SELECT 1 FROM ${table} WHERE user_id = $1 AND ${id} = ${bind(profile.id)}
      AND country IS NOT DISTINCT FROM ${bind(profile.country)} ${descriptorGuard})`;
  });
  if (!ownership.length) return false;
  const results = await query.transaction([
    query`SELECT pg_advisory_xact_lock_shared(hashtextextended(${swipeRankBuildLockName("TINDER")}, 0))`,
    query(
      `WITH updated AS (
      UPDATE "user" SET ${assignments.join(", ")}, updated_at = now() WHERE id = $1 AND ${preimage.join(" AND ")}
        AND ${ownership.join(" AND ")} RETURNING *
    ), ${locationRegistrySyncCte} SELECT id FROM updated`,
      params,
    ),
  ]);
  const rows = results[1] ?? [];
  return rows.length > 0;
}

export async function main(args = process.argv.slice(2)) {
  if (args.includes("--help")) {
    help();
    return;
  }
  const options = parseLocationOptions(args);
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error(
      "DATABASE_URL is required. Select the intended database explicitly in your environment.",
    );
  const identity = databaseIdentity(url);
  const query = neon(url);
  // Create a new directory exclusively: an existing run must be opened via --resume.
  if (!options.resume) {
    await mkdir(dirname(options.outputDir), { recursive: true, mode: 0o700 });
    await mkdir(options.outputDir, { recursive: false, mode: 0o700 });
  }
  const manifestPath = join(options.outputDir, "run.json");
  let manifest: z.infer<typeof manifestSchema>;
  if (options.resume) {
    manifest = manifestSchema.parse(await optionalJson(manifestPath));
    if (manifest.database !== identity)
      throw new Error(
        "Run belongs to a different database. Refusing to reuse its proposals.",
      );
  } else {
    const candidates = await query`
      SELECT u.id FROM "user" u WHERE
        (${options.userId}::text IS NULL OR u.id = ${options.userId}) AND
        (lower(coalesce(trim(u.country), '')) IN ('', 'unknown', 'n/a', 'null', 'undefined') OR lower(coalesce(trim(u.city), '')) IN ('', 'unknown', 'n/a', 'null', 'undefined') OR lower(coalesce(trim(u.region), '')) IN ('', 'unknown', 'n/a', 'null', 'undefined')) AND
        (EXISTS (SELECT 1 FROM tinder_profile t WHERE t.user_id = u.id AND (${options.provider}::text IS NULL OR ${options.provider} = 'TINDER')) OR
         EXISTS (SELECT 1 FROM hinge_profile h WHERE h.user_id = u.id AND (${options.provider}::text IS NULL OR ${options.provider} = 'HINGE')))
      ORDER BY (lower(coalesce(trim(u.country), '')) IN ('', 'unknown', 'n/a', 'null', 'undefined')) DESC, u.created_at, u.id LIMIT ${options.limit}
    `;
    manifest = {
      version: 2,
      database: identity,
      model: options.model,
      ai: options.ai,
      users: candidates.map((row) => String(row.id)),
    };
    await saveJson(manifestPath, manifest);
  }
  const resultsDir = join(options.outputDir, "results");
  if (manifest.ai && !options.apply) await requireChatGptLogin();
  await mkdir(resultsDir, { recursive: true, mode: 0o700 });
  const totals = {
    candidates: manifest.users.length,
    proposed: 0,
    applied: 0,
    unchanged: 0,
    stale: 0,
    errors: 0,
  };
  console.log(
    `${options.apply ? "APPLY SAVED PROPOSALS" : "DRY RUN"}: ${manifest.users.length} users; database ${new URL(url).hostname}; ${options.outputDir}`,
  );
  for (const [index, userId] of manifest.users.entries()) {
    const key = subjectKey(userId);
    try {
      const subject = await getSubject(query, userId);
      if (!subject?.profiles.length) {
        totals.stale++;
        continue;
      }
      const resultPath = join(resultsDir, `${key}.json`);
      const cached = await optionalJson(resultPath);
      let result: z.infer<typeof savedResultSchema>;
      if (cached !== undefined) {
        result = savedResultSchema.parse(cached);
        if (result.userId !== userId)
          throw new Error("Saved proposal has the wrong user.");
        if (result.basis !== locationBasis(subject)) {
          if (
            Object.values(
              missingLocationPatch(subject.location, {
                ...subject.location,
                ...result.proposal,
              }),
            ).some(Boolean)
          )
            totals.stale++;
          else totals.unchanged++;
          continue;
        }
      } else {
        if (options.apply) {
          totals.unchanged++;
          continue;
        }
        const proposal = await generateLocationProposal(
          subject,
          manifest.ai
            ? async () => {
                const evidence = await gatherEvidence(query, subject);
                let inferred: unknown;
                // Message-only candidates are valid. Empty evidence should abstain without a model call.
                if (
                  evidence.messages.length ||
                  evidence.exports.some((file) => file.hints.length) ||
                  Object.values(evidence.saved).some((value) =>
                    Boolean(locationText(value)),
                  ) ||
                  subject.profiles.some(
                    (p) =>
                      p.city || p.region || p.country || p.hometowns?.length,
                  )
                ) {
                  inferred = await inferLocationWithCodex(
                    evidence,
                    join(options.outputDir, "codex", key),
                    manifest.model,
                    options.timeoutMs,
                  );
                }
                if (evidence.unavailableExports)
                  console.log(
                    `${key}: ${evidence.unavailableExports} exports unavailable; other evidence retained`,
                  );
                return inferred;
              }
            : undefined,
        );
        result = { userId, basis: locationBasis(subject), proposal };
        await saveJson(resultPath, result);
      }
      if (!Object.values(result.proposal).some(Boolean)) totals.unchanged++;
      else if (options.apply) {
        if (
          await applyLocationProposal(
            query,
            subject,
            result.proposal as LocationValues,
          )
        )
          totals.applied++;
        else totals.stale++;
      } else totals.proposed++;
      console.log(
        `[${index + 1}/${manifest.users.length}] ${key}: ${Object.keys(result.proposal).join(", ") || "no change"}`,
      );
    } catch (error) {
      totals.errors++;
      // Provider/database errors can contain credentials; only emit our bounded status here.
      console.error(
        `[${index + 1}/${manifest.users.length}] ${key}: failed; no location written for this user`,
      );
      console.error(safeError(error));
      await saveJson(join(resultsDir, `${key}.error.json`), {
        error: safeError(error),
      });
    }
  }
  await saveJson(
    join(
      options.outputDir,
      options.apply ? "apply-summary.json" : "summary.json",
    ),
    totals,
  );
  console.log(JSON.stringify(totals));
  if (!options.apply)
    console.log(
      `To apply these saved proposals: bun locations:extract --resume ${JSON.stringify(options.outputDir)} --apply`,
    );
  if (totals.errors) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(`Location extraction stopped: ${safeError(error)}`);
    process.exitCode = 1;
  });
}
