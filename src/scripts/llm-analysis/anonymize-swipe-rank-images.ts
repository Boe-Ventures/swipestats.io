import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  anonymizeLatestSwipeRankProfileImages,
  listLatestSwipeRankImageTargets,
  listUnfinishedSwipeRankSourceMedia,
  reviewAndSavePreparedSwipeRankImages,
} from "@/server/services/swipe-rank/image-anonymization.service";

function requestedLimit() {
  const argument = process.argv.find((value) => value.startsWith("--limit="));
  return argument ? Number(argument.slice("--limit=".length)) : 10;
}

function artifactDirectory() {
  const argument = process.argv.find((value) =>
    value.startsWith("--artifact-dir="),
  );
  return argument
    ? resolve(argument.slice("--artifact-dir=".length))
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

async function importArtifacts(directory: string, limit: number) {
  const summary = JSON.parse(
    await readFile(join(directory, "summary.json"), "utf8"),
  ) as ArtifactSummary;
  const artifactSubjects = summary.subjects
    .map((subject) => subject.subjectId)
    .slice(0, limit);
  const allTargets = await listLatestSwipeRankImageTargets(10_000);
  const targetsBySubject = new Map(
    allTargets.map((target) => [
      subjectId(target.provider_profile_id),
      target,
    ]),
  );
  const results = [];
  for (const artifactSubject of artifactSubjects) {
    const target = targetsBySubject.get(artifactSubject);
    if (!target) {
      throw new Error(
        `Artifact subject ${artifactSubject} has no unfinished SwipeRank profile.`,
      );
    }
    const subjectDirectory = join(
      directory,
      "subjects",
      artifactSubject,
    );
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
const directory = artifactDirectory();
const results = directory
  ? await importArtifacts(directory, limit)
  : await anonymizeLatestSwipeRankProfileImages(limit);

for (const result of results) {
  console.log(
    JSON.stringify({
      profile: result.providerProfileId.slice(0, 10),
      verdict: result.verdict,
      sourceImages: result.sourceImageCount,
      savedImages: result.savedImageCount,
      summary: result.summary,
    }),
  );
}

console.log(
  JSON.stringify({
    profiles: results.length,
    passed: results.filter((result) => result.verdict === "PASS").length,
    needsReview: results.filter((result) => result.verdict === "NEEDS_REVIEW")
      .length,
    savedImages: results.reduce(
      (total, result) => total + result.savedImageCount,
      0,
    ),
  }),
);
