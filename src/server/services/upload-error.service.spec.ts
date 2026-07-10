/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { summarizeUploadError } from "./upload-error.service";

describe("summarizeUploadError", () => {
  test("reports the nested PostgreSQL cause instead of the ORM query", () => {
    const cause = Object.assign(
      new Error(
        'null value in column "age_filter_min" of relation "tinder_profile" violates not-null constraint',
      ),
      {
        code: "23502",
        table: "tinder_profile",
        column: "age_filter_min",
        detail: "Failing row contains null discovery preferences.",
      },
    );
    const error = Object.assign(new Error("Failed query: insert into ..."), {
      cause,
    });

    expect(summarizeUploadError(error)).toEqual({
      errorType: "database",
      errorMessage: cause.message,
      errorCode: "23502",
      errorConstraint: undefined,
      errorTable: "tinder_profile",
      errorColumn: "age_filter_min",
      errorDetail: "Failing row contains null discovery preferences.",
    });
  });
});
