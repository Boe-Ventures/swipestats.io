import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  acquireLease,
  identity,
  launchEnvironment,
  localCaPath,
  portNumber,
  sharedService,
} from "./local-dev.mjs";

const config = {
  app: "example",
  originEnv: ["NEXT_PUBLIC_BASE_URL", "BETTER_AUTH_URL"],
  shared: { origin: "https://example.localcan.dev", port: 3060 },
};
const who = identity(config.app, "/checkout/a");

test("different checkouts cannot collide even with equal branch names or detached HEAD", () => {
  assert.notEqual(who.hostname, identity(config.app, "/checkout/b").hostname);
  assert.notEqual(who.hostname, identity("another", "/checkout/a").hostname);
  assert.deepEqual(who, identity(config.app, "/checkout/a"));
  assert.throws(() => identity("../bad", "/checkout/a"));
});
test("public auth/client origins override stale env while internal port stays separate", () => {
  const origin = `https://${who.hostname}:1355`;
  const env = launchEnvironment(config, who, "local", origin, 4567, {
    NEXT_PUBLIC_BASE_URL: "https://old.example",
    BETTER_AUTH_URL: "http://localhost:3000",
    PORTLESS_FUNNEL: "1",
  });
  assert.equal(env.NEXT_PUBLIC_BASE_URL, origin);
  assert.equal(env.BETTER_AUTH_URL, origin);
  assert.equal(env.PORT, "4567");
  assert.equal(env.HOST, "127.0.0.1");
  assert.equal(env.PORTLESS_FUNNEL, undefined);
  assert.equal(
    env.LOCAL_DEV_COOKIE_PREFIX,
    launchEnvironment(config, who, "local", origin, 4568, {})
      .LOCAL_DEV_COOKIE_PREFIX,
  );
  assert.notEqual(
    env.LOCAL_DEV_COOKIE_PREFIX,
    launchEnvironment(
      config,
      identity(config.app, "/checkout/b"),
      "local",
      `https://${identity(config.app, "/checkout/b").hostname}:1355`,
      4568,
      {},
    ).LOCAL_DEV_COOKIE_PREFIX,
  );
});
test("direct cookies isolate ports and proxy misconfiguration fails closed", () => {
  const one = launchEnvironment(
    config,
    who,
    "direct",
    "http://localhost:3001",
    3001,
    {},
  );
  const two = launchEnvironment(
    config,
    who,
    "direct",
    "http://localhost:3002",
    3002,
    {},
  );
  assert.notEqual(one.LOCAL_DEV_COOKIE_PREFIX, two.LOCAL_DEV_COOKIE_PREFIX);
  for (const origin of [
    "http://wrong.localhost:1355",
    `https://${who.hostname}`,
    `https://${who.hostname}:1355/path`,
  ])
    assert.throws(() =>
      launchEnvironment(config, who, "local", origin, 4567, {}),
    );
  for (const value of [undefined, "NaN", "0", "65536", "3000.5"])
    assert.throws(() => portNumber(value));
});
test("shared lookup validates the exact service without mutating a sibling target", () => {
  const projects = {
    app: {
      project: {
        services: {
          unrelated: {
            target: "http://127.0.0.1:9000",
            endpoints: [{ url: "other.localcan.dev" }],
          },
          web: {
            target: "http://127.0.0.1:3060",
            endpoints: [{ url: "example.localcan.dev" }],
          },
        },
      },
    },
  };
  const before = JSON.stringify(projects);
  assert.deepEqual(sharedService(projects, config.shared), {
    projectId: "app",
    serviceId: "web",
    target: "http://127.0.0.1:3060",
  });
  assert.equal(JSON.stringify(projects), before);
  projects.app.project.services.web.target = "http://127.0.0.1:9999";
  assert.throws(() => sharedService(projects, config.shared), /must target/);
  assert.throws(() => sharedService({}, config.shared), /found 0/);
  projects.app.project.services.unrelated.endpoints = [
    { url: "example.localcan.dev" },
  ];
  assert.throws(() => sharedService(projects, config.shared), /found 2/);
});
test("shared lease refuses takeover and repeated cleanup cannot delete its successor", () => {
  const dir = mkdtempSync(join(tmpdir(), "boe-dev-test-"));
  const path = join(dir, "lease");
  try {
    const owner = { pid: process.pid, checkout: "/checkout/a" };
    const release = acquireLease(path, owner);
    assert.throws(
      () => acquireLease(path, { ...owner, checkout: "/checkout/b" }),
      /leased/,
    );
    assert.deepEqual(JSON.parse(readFileSync(path)), owner);
    release();
    const releaseNext = acquireLease(path, owner);
    release();
    assert.equal(existsSync(path), true);
    releaseNext();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("direct launcher propagates the origin, rejects a busy port, and cleans up its server", async () => {
  const { spawn, execFileSync } = await import("node:child_process");
  const nodeBinary = execFileSync("node", ["-p", "process.execPath"], {
    encoding: "utf8",
  }).trim();
  const { mkdirSync, writeFileSync, copyFileSync } = await import("node:fs");
  const { createServer } = await import("node:net");
  const { once } = await import("node:events");
  const dir = mkdtempSync(join(tmpdir(), "boe-dev-process-"));
  const socket = createServer();
  await new Promise((done) => socket.listen(0, "127.0.0.1", done));
  const port = socket.address().port;
  await new Promise((done) => socket.close(done));
  mkdirSync(join(dir, "scripts"));
  copyFileSync(
    new URL("./local-dev.mjs", import.meta.url),
    join(dir, "scripts/local-dev.mjs"),
  );
  writeFileSync(
    join(dir, "local-dev.json"),
    JSON.stringify({
      ...config,
      packageManager: nodeBinary,
      directPort: port,
      healthPath: "/",
    }),
  );
  writeFileSync(
    join(dir, "run"),
    `require('node:http').createServer((req,res)=>res.end(JSON.stringify({origin:process.env.NEXT_PUBLIC_BASE_URL,auth:process.env.BETTER_AUTH_URL,prefix:process.env.LOCAL_DEV_COOKIE_PREFIX}))).listen(Number(process.env.PORT),'127.0.0.1');`,
  );
  const env = {
    ...process.env,
    NODE_ENV: "development",
    XDG_STATE_HOME: join(dir, "state"),
    NEXT_PUBLIC_BASE_URL: "https://stale.example",
  };
  delete env.VERCEL;
  const launch = () =>
    spawn(nodeBinary, [join(dir, "scripts/local-dev.mjs"), "direct"], {
      cwd: dir,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  const child = launch();
  const exit = once(child, "exit");
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  try {
    const deadline = Date.now() + 15000;
    while (
      !output.includes("Ready:") &&
      Date.now() < deadline &&
      child.exitCode === null
    )
      await new Promise((done) => setTimeout(done, 50));
    assert.match(output, /Ready:/);
    const response = await fetch(`http://127.0.0.1:${port}`);
    const body = await response.json();
    assert.equal(body.origin, `http://localhost:${port}`);
    assert.equal(body.auth, body.origin);
    assert.match(body.prefix, /^example-dev-/);
    const conflict = launch();
    let conflictOutput = "";
    conflict.stderr.on("data", (chunk) => {
      conflictOutput += chunk;
    });
    const [code] = await once(conflict, "exit");
    assert.equal(code, 1);
    assert.match(conflictOutput, /EADDRINUSE/);
    child.kill("SIGTERM");
    await exit;
    await assert.rejects(
      fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(1000) }),
    );
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await exit;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test("local HTTPS trusts the Portless CA independently of inherited extra certificates", () => {
  assert.equal(
    localCaPath({ NODE_EXTRA_CA_CERTS: "/corporate/ca.pem" }, "/home/dev"),
    "/home/dev/.portless/ca.pem",
  );
  assert.equal(
    localCaPath(
      {
        PORTLESS_STATE_DIR: "/custom/portless",
        NODE_EXTRA_CA_CERTS: "/corporate/ca.pem",
      },
      "/home/dev",
    ),
    "/custom/portless/ca.pem",
  );
});
