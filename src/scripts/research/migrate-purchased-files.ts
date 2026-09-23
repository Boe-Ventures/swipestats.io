/** Dry-run by default. --apply copies existing purchased files byte-for-byte.
 * Optional --remove-public-source retires the old object after verification.
 * Deploy the dual-reader before running. Never redraw cohorts or rewrite content.
 */
import { createHash } from "node:crypto";
import { mkdirSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { and, eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";
import { db } from "@/server/db";
import { datasetExportTable } from "@/server/db/schema";
import { env } from "@/env";
import {
  readResearchBlob,
  researchBlobAccess,
} from "@/server/services/research-storage";
import { researchDownloadFormat } from "@/lib/research/download-format";
import { fingerprintStream } from "@/lib/research/file-integrity";

const apply = process.argv.includes("--apply");
const removePublic = process.argv.includes("--remove-public-source");
if (removePublic && !apply) throw new Error("Source removal requires --apply");
const rows = await db.query.datasetExportTable.findMany({
  where: eq(datasetExportTable.status, "READY"),
});
const candidates = rows.filter(
  (row) => row.blobUrl && researchBlobAccess(row.blobUrl) === "public",
);
console.log(
  JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    publicExports: candidates.length,
    removePublic,
  }),
);
if (!apply) process.exit(0);
const token = env.RESEARCH_BLOB_READ_WRITE_TOKEN;
if (!token || (removePublic && !env.BLOB_READ_WRITE_TOKEN))
  throw new Error("Required migration credentials missing");
const manifestArg = process.argv.indexOf("--manifest");
if (
  manifestArg === -1 ||
  !process.argv[manifestArg + 1] ||
  process.argv[manifestArg + 1]!.startsWith("--")
)
  throw new Error("--apply requires --manifest <private-output-path>");
const manifest = resolve(process.argv[manifestArg + 1]!);
mkdirSync(dirname(manifest), { recursive: true, mode: 0o700 });
for (const row of candidates) {
  const sourceUrl = row.blobUrl!;
  const format = researchDownloadFormat(sourceUrl);
  const source = await readResearchBlob(sourceUrl);
  if (source?.statusCode !== 200) throw new Error("Unable to read source");
  const hash = createHash("sha256");
  let size = 0;
  const bytes = source.stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        hash.update(chunk);
        size += chunk.byteLength;
        controller.enqueue(chunk);
      },
    }),
  );
  const blob = await put(
    `datasets/migrated/${row.id}.${format.extension}`,
    bytes,
    {
      access: "private",
      token,
      multipart: true,
      addRandomSuffix: true,
      contentType: format.contentType,
    },
  );
  const digest = hash.digest("hex");
  const verification = await readResearchBlob(blob.url);
  if (verification?.statusCode !== 200)
    throw new Error("Private copy unavailable");
  const copy = await fingerprintStream(verification.stream);
  if (copy.sha256 !== digest || copy.size !== size)
    throw new Error(
      "Private copy differs from source; export pointer was kept",
    );
  appendFileSync(
    manifest,
    JSON.stringify({
      exportId: row.id,
      oldUrl: sourceUrl,
      newUrl: blob.url,
      sha256: digest,
      size,
      phase: "verified",
    }) + "\n",
    { mode: 0o600 },
  );
  const updated = await db
    .update(datasetExportTable)
    .set({ blobUrl: blob.url, blobSize: size })
    .where(
      and(
        eq(datasetExportTable.id, row.id),
        eq(datasetExportTable.status, "READY"),
        eq(datasetExportTable.blobUrl, sourceUrl),
      ),
    )
    .returning({ id: datasetExportTable.id });
  if (!updated.length) {
    await del(blob.url, { token });
    throw new Error("Export changed during migration; source was kept");
  }
  appendFileSync(
    manifest,
    JSON.stringify({ exportId: row.id, phase: "switched" }) + "\n",
    { mode: 0o600 },
  );
  if (removePublic) {
    await del(sourceUrl, { token: env.BLOB_READ_WRITE_TOKEN });
    const check = await fetch(sourceUrl, {
      method: "HEAD",
      cache: "no-store",
      redirect: "error",
    });
    if (check.status !== 404 && check.status !== 410)
      throw new Error("Public source remains readable; verify CDN removal");
  }
  console.log(
    JSON.stringify({
      exportId: row.id,
      private: true,
      bytesVerified: size,
      publicSourceRemoved: removePublic,
    }),
  );
}
