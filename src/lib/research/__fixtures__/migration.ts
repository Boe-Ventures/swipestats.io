import { expect, mock } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
const dir = mkdtempSync(join(tmpdir(), "research-migration-test-"));
const original =
  process.env.FIXTURE_FORMAT === "json"
    ? Buffer.from('{"legacy":"unchanged"}\n')
    : gzipSync(
        '{"id":"unchanged-id","message":"Agreed message text","custom_legacy_field":[1,2,3]}\n',
      );
const extension = process.env.FIXTURE_FORMAT === "json" ? "json" : "jsonl.gz";
const privateUrl = `https://fixture.private.blob.vercel-storage.com/datasets/copied.${extension}`;
let uploaded = new Uint8Array();
let changes: Record<string, unknown> = {};
let deleted = false;
await mock.module("node:os", () => ({ homedir: () => dir }));
await mock.module("@/env", () => ({
  env: { RESEARCH_BLOB_READ_WRITE_TOKEN: "private-test" },
}));
await mock.module("@/server/db", () => ({
  db: {
    query: {
      datasetExportTable: {
        findMany: async () => [
          {
            id: "fixture",
            status: "READY",
            blobUrl: `https://fixture.public.blob.vercel-storage.com/datasets/old.${extension}`,
          },
        ],
      },
    },
    update: () => ({
      set: (value: Record<string, unknown>) => {
        changes = value;
        return {
          where: () => ({ returning: async () => [{ id: "fixture" }] }),
        };
      },
    }),
  },
}));
await mock.module("@vercel/blob", () => ({
  put: async (
    _path: string,
    stream: ReadableStream<Uint8Array>,
    options: { access: string; contentType: string },
  ) => {
    expect(options.access).toBe("private");
    expect(_path).toEndWith(`.${extension}`);
    expect(options.contentType).toBe(
      extension === "json" ? "application/json" : "application/gzip",
    );
    uploaded = new Uint8Array(await new Response(stream).arrayBuffer());
    return { url: privateUrl };
  },
  del: async () => {
    deleted = true;
  },
}));
await mock.module("@/server/services/research-storage", () => ({
  researchBlobAccess: () => "public",
  readResearchBlob: async (url: string) => ({
    statusCode: 200,
    stream: new Response(url === privateUrl ? uploaded : original).body,
  }),
}));
try {
  process.argv.push("--apply", "--manifest", join(dir, "migration.jsonl"));
  await import("@/scripts/research/migrate-purchased-files");
  expect(Buffer.from(uploaded)).toEqual(original);
  expect(changes).toEqual({ blobUrl: privateUrl, blobSize: original.length });
  expect(deleted).toBe(false);
  console.log("Migration checks passed");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
