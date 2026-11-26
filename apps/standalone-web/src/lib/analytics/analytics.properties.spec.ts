/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";

import { SERVER_EVENT_PROPERTIES } from "./analytics.properties";

describe("Tinder upload analytics privacy", () => {
  test("does not admit raw blob URLs into operational events", () => {
    expect(SERVER_EVENT_PROPERTIES.tinder_profile_created).not.toHaveProperty(
      "blobUrl",
    );
    expect(
      SERVER_EVENT_PROPERTIES.tinder_profile_upload_failed,
    ).not.toHaveProperty("blobUrl");
  });
});
