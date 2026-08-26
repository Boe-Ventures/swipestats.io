import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { and, eq, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/server/db";
import { mediaTable } from "@/server/db/schema";
import { deleteBlob } from "@/server/services/blob.service";
import {
  approvedImageIndexes,
  combineImagePrivacyAudits,
  imagePrivacyAuditSchema,
  listSwipeRankPeriodImageTargets,
} from "@/server/services/swipe-rank/image-anonymization.service";
import type { ImagePrivacyAudit } from "@/server/services/swipe-rank/image-anonymization.service";
import { parseClosedSwipeRankPeriod } from "@/server/services/swipe-rank/periods";

interface CliOptions {
  period: string;
  offset: number;
  limit: number;
  model: string;
  reasoning: string;
  outputDir: string;
  write: boolean;
}

interface ApprovedMedia {
  id: string;
  providerProfileId: string;
  url: string;
}

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "summary", "images"],
  properties: {
    verdict: { type: "string", enum: ["PASS", "NEEDS_REVIEW"] },
    summary: { type: "string", minLength: 1, maxLength: 500 },
    images: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["imageNumber", "safe", "issues", "note"],
        properties: {
          imageNumber: { type: "integer", minimum: 1 },
          safe: { type: "boolean" },
          issues: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "RECOGNIZABLE_FACE",
                "NAME_OR_HANDLE",
                "CONTACT_DETAILS",
                "LICENSE_PLATE",
                "QR_OR_BARCODE",
                "OTHER_IDENTIFIER",
              ],
            },
          },
          note: { type: "string", maxLength: 300 },
        },
      },
    },
  },
};

function valueFor(args: string[], name: string) {
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function integerOption(args: string[], name: string, fallback: number) {
  const raw = valueFor(args, name);
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a nonnegative integer.`);
  }
  return value;
}

function runStamp() {
  return new Date().toISOString().replaceAll(/[:.]/g, "-");
}

function optionsFrom(args: string[]): CliOptions {
  const period = valueFor(args, "--period");
  if (!period) throw new Error("--period is required.");
  parseClosedSwipeRankPeriod(period);
  const limit = integerOption(args, "--limit", 10);
  if (limit < 1 || limit > 1_000) {
    throw new Error("--limit must be between 1 and 1,000.");
  }
  return {
    period,
    offset: integerOption(args, "--offset", 0),
    limit,
    model: valueFor(args, "--model") ?? "gpt-5.6-sol",
    reasoning: valueFor(args, "--reasoning") ?? "high",
    outputDir: resolve(
      valueFor(args, "--output-dir") ??
        join("temp", "swipe-rank-codex-image-audit", runStamp()),
    ),
    write: args.includes("--write"),
  };
}

function subjectId(providerProfileId: string) {
  return createHash("sha256")
    .update(providerProfileId)
    .digest("hex")
    .slice(0, 12);
}

function auditPrompt(imageCount: number) {
  return `You are the final privacy gate for machine-anonymized dating profile images.

Inspect every supplied image individually at full resolution. There are exactly ${imageCount} images, numbered in the order supplied.

An image is safe only when every visible face is blurred beyond recognition. Check frontal faces, side profiles, extreme upward or downward angles, reflections, distant bystanders, and partially cropped faces.

An image is unsafe when a personal name, social handle, email address, phone number, license plate, QR code, linear barcode, ticket transaction detail, personal document field, or comparable direct identifier remains visible. Inspect tickets, boarding passes, receipts, badges, IDs, and documents closely.

Ordinary scenery, generic brands, tattoos, clothing, and broad location cues are allowed. Use NEEDS_REVIEW when uncertain. Return exactly one image result for each supplied image. Return only the requested structured JSON.`;
}

async function downloadApprovedImages(
  rows: ApprovedMedia[],
  subjectDir: string,
) {
  const imageDir = join(subjectDir, "images");
  await mkdir(imageDir, { recursive: true, mode: 0o700 });
  const paths: string[] = [];
  for (const [index, row] of rows.entries()) {
    const response = await fetch(row.url, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} downloading approved image.`);
    }
    const body = await response.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > 20_000_000) {
      throw new Error("Approved image has an invalid byte length.");
    }
    const path = join(imageDir, `image-${index + 1}.jpg`);
    await writeFile(path, new Uint8Array(body), { mode: 0o600 });
    paths.push(path);
  }
  return paths;
}

async function runCodexAudit(
  imagePaths: string[],
  subjectDir: string,
  schemaPath: string,
  options: CliOptions,
) {
  const verdictPath = join(subjectDir, "verdict.json");
  const eventsPath = join(subjectDir, "codex-events.jsonl");
  const stderrPath = join(subjectDir, "codex-stderr.log");
  const command = [
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
    "--model",
    options.model,
    "--config",
    `model_reasoning_effort=${JSON.stringify(options.reasoning)}`,
    "--output-schema",
    schemaPath,
    "--output-last-message",
    verdictPath,
    "--cd",
    subjectDir,
    ...imagePaths.flatMap((path) => ["--image", path]),
    "-",
  ];
  const processResult = Bun.spawn(command, {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  await processResult.stdin.write(auditPrompt(imagePaths.length));
  await processResult.stdin.end();
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(processResult.stdout).text(),
    new Response(processResult.stderr).text(),
    processResult.exited,
  ]);
  await Promise.all([
    writeFile(eventsPath, stdout, { mode: 0o600 }),
    writeFile(stderrPath, stderr, { mode: 0o600 }),
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `Codex exited with ${exitCode}: ${stderr.trim().slice(-1_000)}`,
    );
  }
  const raw = JSON.parse(await readFile(verdictPath, "utf8")) as unknown;
  const parsed = imagePrivacyAuditSchema.parse(raw);
  const expectedNumbers = imagePaths.map((_, index) => index + 1);
  const returnedNumbers = parsed.images.map((image) => image.imageNumber);
  if (
    returnedNumbers.length !== expectedNumbers.length ||
    returnedNumbers.some(
      (imageNumber, index) => imageNumber !== expectedNumbers[index],
    )
  ) {
    throw new Error(
      `Codex returned image numbers [${returnedNumbers.join(", ")}]; expected [${expectedNumbers.join(", ")}].`,
    );
  }
  return combineImagePrivacyAudits([parsed]);
}

async function holdUnsafeImages(
  rows: ApprovedMedia[],
  audit: ImagePrivacyAudit,
) {
  const approvedIndexes = approvedImageIndexes(audit);
  const unsafe = rows.filter((_, index) => !approvedIndexes.has(index));
  for (const row of unsafe) {
    const index = rows.indexOf(row);
    const imageAudit = audit.images[index]!;
    const note = [
      `Codex Sol privacy hold: ${audit.summary}`,
      imageAudit.issues.length > 0
        ? `Issues: ${imageAudit.issues.join(", ")}.`
        : null,
      imageAudit.note || null,
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 1_000);
    await db
      .update(mediaTable)
      .set({
        swipeRankAnonymizedUrl: null,
        swipeRankImageReviewStatus: "NEEDS_REVIEW",
        swipeRankImageReviewNote: note,
        swipeRankAnonymizedAt: new Date(),
      })
      .where(eq(mediaTable.id, row.id));
    await deleteBlob(row.url);
  }
  return unsafe.length;
}

const options = optionsFrom(process.argv.slice(2));
const period = parseClosedSwipeRankPeriod(options.period);
await mkdir(options.outputDir, { recursive: true, mode: 0o700 });
await chmod(options.outputDir, 0o700);
const schemaPath = join(options.outputDir, "privacy-audit.schema.json");
await writeFile(schemaPath, `${JSON.stringify(outputSchema, null, 2)}\n`, {
  mode: 0o600,
});

const targets = await listSwipeRankPeriodImageTargets(
  period,
  options.limit,
  options.offset,
);
const providerProfileIds = targets.map((target) => target.provider_profile_id);
const approvedRows =
  providerProfileIds.length === 0
    ? []
    : await db
        .select({
          id: mediaTable.id,
          providerProfileId: mediaTable.tinderProfileId,
          url: mediaTable.swipeRankAnonymizedUrl,
        })
        .from(mediaTable)
        .where(
          and(
            inArray(mediaTable.tinderProfileId, providerProfileIds),
            eq(mediaTable.swipeRankImageReviewStatus, "APPROVED"),
            isNotNull(mediaTable.swipeRankAnonymizedUrl),
          ),
        );

let auditedProfiles = 0;
let passedProfiles = 0;
let heldImages = 0;
for (const target of targets) {
  const rows = approvedRows
    .filter(
      (row): row is ApprovedMedia =>
        row.providerProfileId === target.provider_profile_id && !!row.url,
    )
    .sort((left, right) => left.id.localeCompare(right.id));
  if (rows.length === 0) {
    console.log(
      JSON.stringify({
        rank: target.rank,
        status: "NO_APPROVED_IMAGES",
        profile: target.provider_profile_id.slice(0, 10),
      }),
    );
    continue;
  }
  const subjectDir = join(
    options.outputDir,
    `rank-${String(target.rank).padStart(4, "0")}-${subjectId(target.provider_profile_id)}`,
  );
  await mkdir(subjectDir, { recursive: true, mode: 0o700 });
  const imagePaths = await downloadApprovedImages(rows, subjectDir);
  const audit = await runCodexAudit(
    imagePaths,
    subjectDir,
    schemaPath,
    options,
  );
  const unsafeCount = options.write
    ? await holdUnsafeImages(rows, audit)
    : rows.length - approvedImageIndexes(audit).size;
  auditedProfiles += 1;
  heldImages += unsafeCount;
  if (unsafeCount === 0) passedProfiles += 1;
  console.log(
    JSON.stringify({
      rank: target.rank,
      status: unsafeCount === 0 ? "PASS" : "NEEDS_REVIEW",
      profile: target.provider_profile_id.slice(0, 10),
      approvedImages: rows.length,
      heldImages: unsafeCount,
      persisted: options.write,
      summary: audit.summary,
    }),
  );
}

console.log(
  JSON.stringify({
    period: period.label,
    offset: options.offset,
    considered: targets.length,
    auditedProfiles,
    passedProfiles,
    heldImages,
    write: options.write,
    model: options.model,
    outputDir: options.outputDir,
  }),
);
