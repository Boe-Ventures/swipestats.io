import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import postgres from "postgres";

function run(command: string, args: string[], env = process.env) {
  const result = spawnSync(command, args, { env, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} failed: ${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
const port = await new Promise<number>((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string")
      return reject(new Error("No test port"));
    server.close(() => resolve(address.port));
  });
});
const directory = await mkdtemp(join(tmpdir(), "swipestats-hinge-regression-"));
const dataDirectory = join(directory, "data");
let started = false;
try {
  run("initdb", [
    "-D",
    dataDirectory,
    "-U",
    "swipestats_test",
    "-A",
    "trust",
    "--no-locale",
  ]);
  run("pg_ctl", [
    "-D",
    dataDirectory,
    "-l",
    join(directory, "server.log"),
    "-o",
    `-h 127.0.0.1 -p ${port} -k ${directory}`,
    "-w",
    "start",
  ]);
  started = true;
  const rootUrl = `postgres://swipestats_test@127.0.0.1:${port}/postgres`;
  const root = postgres(rootUrl, { max: 1 });
  try {
    await root.unsafe("CREATE DATABASE swipestats_hinge_regression");
  } finally {
    await root.end();
  }
  const url = `postgres://swipestats_test@127.0.0.1:${port}/swipestats_hinge_regression`;
  const db = postgres(url, { max: 1, onnotice: () => undefined });
  try {
    for (const file of (await readdir("drizzle"))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      for (const statement of (
        await readFile(join("drizzle", file), "utf8")
      ).split("--> statement-breakpoint")) {
        if (statement.trim()) await db.unsafe(statement);
      }
    }
  } finally {
    await db.end();
  }
  const output = run(
    process.execPath,
    ["run", "test/fixtures/hinge-ownership-postgres.ts"],
    { ...process.env, HINGE_TEST_DATABASE_URL: url },
  );
  console.log(output.trim().split("\n").at(-1));
} finally {
  if (started)
    run("pg_ctl", ["-D", dataDirectory, "-m", "immediate", "-w", "stop"]);
  await rm(directory, { recursive: true, force: true });
}
