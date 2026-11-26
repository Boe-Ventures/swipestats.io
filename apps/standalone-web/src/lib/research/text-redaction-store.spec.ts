import { expect, test } from "bun:test";

// Pure redaction tests cannot detect SQL join/ownership errors or partial writes
// that publish stale text. Exercise real PostgreSQL semantics in isolation.
test("text persistence and export remain atomic and source-bound for Tinder and Hinge", async () => {
  const child = Bun.spawn(
    [process.execPath, "src/lib/research/__fixtures__/text-redaction-store.ts"],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  expect({ code, stderr, stdout }).toMatchObject({ code: 0 });
  expect(stdout).toContain("Text-store integration passed");
}, 30000);
