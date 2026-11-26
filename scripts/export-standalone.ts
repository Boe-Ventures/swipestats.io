import { cp, mkdir, lstat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve, dirname, basename } from "node:path";
const source = resolve(import.meta.dir, "../apps/standalone-web");
const target = resolve(
  process.argv[2] ?? "/tmp/swipestats-standalone-experiment",
);
if (await lstat(target).catch(() => undefined))
  throw new Error("Export destination must not exist");
// Export tracked source only. Local credentials, artifacts and dependencies stay local.
const files = execFileSync("git", ["ls-files", "-z", "."], {
  cwd: source,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
for (const file of files) {
  if (basename(file).startsWith(".env") && basename(file) !== ".env.example")
    continue;
  const destination = resolve(target, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(source, file), destination);
}
console.log(
  `Exported ${files.length} tracked source paths to ${target}. Configure a new local environment before running.`,
);
