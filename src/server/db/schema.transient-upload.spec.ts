import { describe, expect, it } from "bun:test";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";

import { transientUploadTable } from "./schema";

function checkSql(name: string): string {
  const check = getTableConfig(transientUploadTable).checks.find(
    (candidate) => candidate.name === name,
  );
  if (!check) throw new Error(`Missing transient_upload check ${name}`);
  return new PgDialect().sqlToQuery(check.value).sql.toLowerCase();
}

describe("transient_upload constraints", () => {
  it("preserves the cleanup ledger when its owning account is deleted", () => {
    const [userForeignKey] = getTableConfig(transientUploadTable).foreignKeys;
    expect(userForeignKey?.onDelete).toBe("set null");
    expect(transientUploadTable.userId.notNull).toBe(false);
  });

  it("requires durable evidence for uploaded, processing, and committed states", () => {
    const blobState = checkSql("transient_upload_blob_state");
    expect(blobState).toContain('"bloburl" is not null');
    expect(blobState).toContain('"blobpathname" is not null');
    expect(blobState).toContain('"uploadedat" is not null');

    expect(checkSql("transient_upload_processing_state")).toContain(
      '"processingstartedat" is not null',
    );
    const commitState = checkSql("transient_upload_commit_state");
    expect(commitState).toContain('"resultprofileid" is not null');
    expect(commitState).toContain('"committedat" is not null');
  });

  it("keeps failed abandoned cleanup retryable", () => {
    const abandoned = checkSql("transient_upload_abandoned_state");
    expect(abandoned).toContain('"resultprofileid" is null');
    expect(abandoned).not.toContain('"cleanedat" is not null');
  });
});
