import { describe, expect, it } from "bun:test";
import assert from "node:assert/strict";
import { resolveHingeUploadTarget } from "./hinge-upload-target";

describe("Hinge upload ownership", () => {
  it("rejects a foreign destination even when the signup timestamp matches", async () => {
    await assert.rejects(
      resolveHingeUploadTarget({
        userId: "current-owner",
        signupTime: "2020-01-01T00:00:00.000Z",
        existingProfile: {
          hingeId: "foreign-profile",
          userId: "old-guest",
          createDate: new Date("2020-01-01T00:00:00.000Z"),
        },
      }),
      /another user's Hinge profile/,
    );
  });

  it("isolates imports and preserves owned profiles through the actual router", async () => {
    const child = Bun.spawn(
      [process.execPath, "run", "test/fixtures/hinge-upload-router.ts"],
      {
        cwd: process.cwd(),
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ exitCode, stderr }).toEqual({ exitCode: 0, stderr: "" });
    expect(stdout).toContain(
      "Hinge upload router ownership regressions passed",
    );
  });
});
