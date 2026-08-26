import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  anonymizeLatestSwipeRankProfileImages,
  anonymizeSwipeRankPeriodProfileImages,
  listLatestSwipeRankImageTargets,
  listUnfinishedSwipeRankSourceMedia,
  reviewAndSavePreparedSwipeRankImages,
} from "@/server/services/swipe-rank/image-anonymization.service";
import type { SwipeRankPeriodImageBatchResult } from "@/server/services/swipe-rank/image-anonymization.service";
import { parseClosedSwipeRankPeriod } from "@/server/services/swipe-rank/periods";

function requestedLimit() {
  const argument = process.argv.find((value) => value.startsWith("--limit="));
  return argument ? Number(argument.slice("--limit=".length)) : 10;
}

function requestedOffset() {
  const argument = process.argv.find((value) => value.startsWith("--offset="));
  return argument ? Number(argument.slice("--offset=".length)) : 0;
}

function artifactDirectory() {
  const argument = process.argv.find((value) =>
    value.startsWith("--artifact-dir="),
  );
  return argument
    ? resolve(argument.slice("--artifact-dir=".length))
    : undefined;
}

function requestedPeriod() {
  const argument = process.argv.find((value) => value.startsWith("--period="));
  return argument
    ? parseClosedSwipeRankPeriod(argument.slice("--period=".length))
    : undefined;
}

function subjectId(providerProfileId: string) {
  return createHash("sha256")
    .update(providerProfileId)
    .digest("hex")
    .slice(0, 12);
}

interface VisionRow {
  file: string;
  faceCount: number;
}

interface ArtifactSummary {
  subjects: Array<{ subjectId: string }>;
}

function printResult(item: SwipeRankPeriodImageBatchResult) {
  const result = item.status === "PROCESSED" ? item.result : item;
  console.log(
    JSON.stringify({
      rank: item.rank,
      status: item.status,
      profile: result.providerProfileId.slice(0, 10),
      verdict: "verdict" in result ? result.verdict : undefined,
      sourceImages: result.sourceImageCount,
      savedImages: result.savedImageCount,
      summary: result.summary,
    }),
  );
}

async function importArtifacts(directory: string, limit: number) {
  const summary = JSON.parse(
    await readFile(join(directory, "summary.json"), "utf8"),
  ) as ArtifactSummary;
  const artifactSubjects = summary.subjects
    .map((subject) => subject.subjectId)
    .slice(0, limit);
  const allTargets = await listLatestSwipeRankImageTargets(10_000);
  const targetsBySubject = new Map(
    allTargets.map((target) => [subjectId(target.provider_profile_id), target]),
  );
  const results = [];
  for (const artifactSubject of artifactSubjects) {
    const target = targetsBySubject.get(artifactSubject);
    if (!target) {
      throw new Error(
        `Artifact subject ${artifactSubject} has no unfinished SwipeRank profile.`,
      );
    }
    const subjectDirectory = join(directory, "subjects", artifactSubject);
    const vision = JSON.parse(
      await readFile(join(subjectDirectory, "vision.json"), "utf8"),
    ) as VisionRow[];
    const sourceMedia = await listUnfinishedSwipeRankSourceMedia(
      target.provider_profile_id,
    );
    const filenames = (await readdir(join(subjectDirectory, "images")))
      .filter((name) => /^image-\d+\.jpg$/.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const images = await Promise.all(
      filenames.map(async (filename) => {
        const imageNumber = Number(/\d+/.exec(filename)?.[0]);
        const source = sourceMedia[imageNumber - 1];
        if (!source) {
          throw new Error(
            `Artifact ${filename} has no matching source media row.`,
          );
        }
        const visionRow = vision.find(
          (row) => row.file.split("/").at(-1) === filename,
        );
        if (!visionRow) {
          throw new Error(`Artifact ${filename} has no Vision result.`);
        }
        return {
          mediaId: source.id,
          buffer: await readFile(join(subjectDirectory, "images", filename)),
          faceCount: visionRow.faceCount,
        };
      }),
    );
    results.push(
      await reviewAndSavePreparedSwipeRankImages({
        profileId: target.profile_id,
        providerProfileId: target.provider_profile_id,
        images,
      }),
    );
  }
  return results;
}

const limit = requestedLimit();
const offset = requestedOffset();
const directory = artifactDirectory();
const period = requestedPeriod();
if (directory && period) {
  throw new Error("--artifact-dir and --period cannot be combined.");
}
if (offset > 0 && !period) {
  throw new Error("--offset requires --period.");
}

let results: SwipeRankPeriodImageBatchResult[];
if (period) {
  results = await anonymizeSwipeRankPeriodProfileImages({
    period,
    limit,
    offset,
    onResult: printResult,
  });
} else {
  const legacyResults = directory
    ? await importArtifacts(directory, limit)
    : await anonymizeLatestSwipeRankProfileImages(limit);
  for (const result of legacyResults) {
    console.log(
      JSON.stringify({
        status: "PROCESSED",
        profile: result.providerProfileId.slice(0, 10),
        verdict: result.verdict,
        sourceImages: result.sourceImageCount,
        savedImages: result.savedImageCount,
        summary: result.summary,
      }),
    );
  }
  results = legacyResults.map((result) => ({
    status: "PROCESSED",
    rank: 0,
    result,
  }));
}

console.log(
  JSON.stringify({
    period: period?.label,
    offset: period ? offset : undefined,
    considered: results.length,
    processed: results.filter((item) => item.status === "PROCESSED").length,
    noSourceImages: results.filter((item) => item.status === "NO_SOURCE_IMAGES")
      .length,
    alreadyApproved: results.filter(
      (item) => item.status === "ALREADY_APPROVED",
    ).length,
    passed: results.filter(
      (item) => item.status === "PROCESSED" && item.result.verdict === "PASS",
    ).length,
    needsReview: results.filter(
      (item) =>
        item.status === "PROCESSED" && item.result.verdict === "NEEDS_REVIEW",
    ).length,
    savedImages: results.reduce(
      (total, item) =>
        total +
        (item.status === "PROCESSED"
          ? item.result.savedImageCount
          : item.savedImageCount),
      0,
    ),
  }),
);
