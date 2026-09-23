import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";
for (const [fixture, marker] of [
  ["api-boundary", "API boundary checks passed"],
  ["storage", "Storage checks passed"],
  ["fulfillment", "Fulfillment checks passed"],
  ["manual-export", "Manual export checks passed"],
  ["generation", "Generation checks passed"],
])
  test(`research integration: ${fixture}`, async () => {
    const child = Bun.spawn(
      [
        process.execPath,
        fileURLToPath(new URL(`./__fixtures__/${fixture}.ts`, import.meta.url)),
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, NODE_ENV: "test" },
      },
    );
    const [code, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ]);
    expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
    expect(stdout).toContain(marker!);
  }, 20000);
