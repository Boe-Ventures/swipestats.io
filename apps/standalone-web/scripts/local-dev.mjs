/** Shared local-development launcher v1. Keep copies identical; see docs/local-development.md. */
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { get as httpsGet } from "node:https";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

export function localCaPath(environment = process.env, home = homedir()) {
  return join(
    environment.PORTLESS_STATE_DIR || join(home, ".portless"),
    "ca.pem",
  );
}

export function identity(app, checkout) {
  if (!/^[a-z][a-z0-9-]{0,35}$/.test(app))
    throw new Error("Invalid local-dev app ID");
  const id = createHash("sha256").update(checkout).digest("hex").slice(0, 12);
  return { id, name: `${id}.${app}`, hostname: `${id}.${app}.localhost` };
}

export function portNumber(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Dev port must be an integer between 1024 and 65535");
  return port;
}

export function launchEnvironment(
  config,
  who,
  mode,
  origin,
  port,
  inherited = process.env,
) {
  const url = new URL(origin);
  if (url.origin !== origin || url.username || url.password)
    throw new Error("Expected an origin without a path or credentials");
  if (mode === "local" && origin !== `https://${who.hostname}:1355`)
    throw new Error(
      "Portless origin differs from the requested HTTPS localhost origin; check proxy settings",
    );
  if (mode === "direct" && origin !== `http://localhost:${port}`)
    throw new Error("Direct mode must use localhost");
  if (
    mode === "shared" &&
    (url.protocol !== "https:" || origin !== config.shared?.origin)
  )
    throw new Error("Shared origin does not match local-dev.json");
  const env = {
    ...inherited,
    NODE_ENV: "development",
    PORT: String(portNumber(port)),
    HOST: "127.0.0.1",
    LOCAL_DEV_MODE: mode,
    LOCAL_DEV_ORIGIN: origin,
    LOCAL_DEV_COOKIE_PREFIX: `${config.app}-dev-${who.id}-${mode === "direct" ? port : mode}`,
  };
  for (const key of config.originEnv) env[key] = origin;
  if (mode !== "local") delete env.PORTLESS_URL;
  // Local launches must never activate an inherited public tunnel setting.
  for (const key of [
    "PORTLESS_FUNNEL",
    "PORTLESS_TAILSCALE",
    "PORTLESS_NGROK",
    "PORTLESS_LAN_IP",
  ])
    delete env[key];
  return env;
}

export function sharedService(projects, shared) {
  const matches = [];
  for (const [projectId, entry] of Object.entries(projects)) {
    for (const [serviceId, service] of Object.entries(
      entry.project?.services ?? {},
    )) {
      if (
        service.endpoints?.some(
          (endpoint) =>
            endpoint.url === new URL(shared.origin).host ||
            endpoint.url === shared.origin,
        )
      )
        matches.push({ projectId, serviceId, target: service.target });
    }
  }
  if (matches.length !== 1)
    throw new Error(
      `Expected exactly one LocalCan service for ${shared.origin}; found ${matches.length}. No configuration was changed.`,
    );
  const match = matches[0];
  const expected = `http://127.0.0.1:${shared.port}`;
  if (match.target !== expected)
    throw new Error(
      `LocalCan ${match.projectId}/${match.serviceId} must target ${expected}; currently targets something else. No configuration was changed.`,
    );
  return match;
}

export function acquireLease(path, owner) {
  mkdirSync(dirname(path), { recursive: true });
  try {
    writeFileSync(path, JSON.stringify(owner), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    let prior;
    try {
      prior = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      /* Retain malformed locks for inspection. */
    }
    throw new Error(
      `Dev origin is leased${prior ? ` by PID ${prior.pid} in ${prior.checkout}` : ""}. Stop its launcher first. If it crashed, verify that PID is gone before removing ${path}.`,
    );
  }
  let released = false;
  return () => {
    if (!released) {
      released = true;
      if (existsSync(path)) unlinkSync(path);
    }
  };
}

function run(command, args, options = {}) {
  return spawn(command, args, { stdio: "inherit", ...options });
}

async function supervise(child, cleanup = () => {}) {
  let stopping = false;
  const stop = (signal) => {
    stopping = true;
    if (child.spawnargs && child.localDevGroup) {
      try {
        process.kill(-child.pid, signal);
      } catch {
        /* Already exited. */
      }
    } else child.kill(signal);
  };
  const onInt = () => stop("SIGINT");
  const onTerm = () => stop("SIGTERM");
  process.on("SIGINT", onInt);
  process.on("SIGTERM", onTerm);
  try {
    return await new Promise((done, reject) => {
      child.once("error", reject);
      child.once("exit", (code) => done(stopping ? 0 : (code ?? 1)));
    });
  } finally {
    process.off("SIGINT", onInt);
    process.off("SIGTERM", onTerm);
    cleanup();
  }
}

async function httpStatus(url, caFile) {
  if (caFile && new URL(url).protocol === "https:") {
    return new Promise((done, reject) => {
      const request = httpsGet(
        url,
        {
          ca: readFileSync(caFile),
          timeout: 5000,
          // .localhost resolves to loopback in browsers; OS DNS may not implement it.
          lookup: new URL(url).hostname.endsWith(".localhost")
            ? (_host, options, callback) =>
                options.all
                  ? callback(null, [{ address: "127.0.0.1", family: 4 }])
                  : callback(null, "127.0.0.1", 4)
            : undefined,
        },
        (response) => {
          response.resume();
          done(response.statusCode);
        },
      );
      request.on("timeout", () =>
        request.destroy(new Error("HTTP health request timed out")),
      );
      request.on("error", reject);
    });
  }
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  await response.body?.cancel();
  return response.status;
}

async function main() {
  const web = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const config = JSON.parse(readFileSync(join(web, "local-dev.json"), "utf8"));
  let checkout;
  try {
    checkout = realpathSync(
      execFileSync("git", ["rev-parse", "--show-toplevel"], {
        cwd: web,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim(),
    );
  } catch {
    checkout = realpathSync(web);
  }
  const who = identity(config.app, checkout);
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const mode = args.shift() ?? config.defaultMode ?? "local";
  const state = join(
    process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"),
    "boe-dev",
  );
  const recordPath = join(state, `${config.app}-${who.id}.json`);
  const localOrigin = `https://${who.hostname}:1355`;
  const portlessEnv = {
    ...process.env,
    PORTLESS_PORT: "1355",
    PORTLESS_HTTPS: "1",
    PORTLESS_LAN: "0",
    PORTLESS_TLD: "localhost",
    PORTLESS_FUNNEL: "0",
    PORTLESS_TAILSCALE: "0",
    PORTLESS_NGROK: "0",
  };
  delete portlessEnv.PORTLESS_LAN_IP;
  delete portlessEnv.PORTLESS_URL;
  delete portlessEnv.PORT;
  delete portlessEnv.PORTLESS;

  if (mode === "doctor") {
    const report = {
      app: config.app,
      checkout,
      defaultMode: config.defaultMode,
      localOrigin,
      sharedOrigin: config.shared?.origin ?? null,
    };
    if (existsSync(recordPath)) {
      const record = JSON.parse(readFileSync(recordPath, "utf8"));
      let alive = false;
      try {
        process.kill(record.pid, 0);
        alive = true;
      } catch {
        /* Stale record. */
      }
      report.runtime = { ...record, alive };
      if (alive) {
        try {
          report.runtime.status = await httpStatus(
            record.origin,
            record.caFile ??
              (record.mode === "local" ? localCaPath() : undefined),
          );
        } catch {
          report.runtime.error =
            "Origin is unreachable or its certificate is not trusted by Node";
        }
      }
      process.exitCode = alive && report.runtime.status < 500 ? 0 : 1;
    } else {
      report.runtime = "Not running through the launcher";
      process.exitCode = 1;
    }
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL)
    throw new Error("This launcher is for local development only");
  if (mode === "local") {
    if (args.length)
      throw new Error(
        "Local mode assigns its own port. Use dev:direct for an explicit port.",
      );
    let cli;
    try {
      const pkg = join(
        dirname(dirname(fileURLToPath(import.meta.resolve("portless")))),
        "package.json",
      );
      if (JSON.parse(readFileSync(pkg, "utf8")).version !== "0.15.4")
        throw new Error("version");
      cli = join(dirname(pkg), "dist", "cli.js");
    } catch {
      throw new Error(
        "Install this checkout's dependencies: Portless 0.15.4 is required.",
      );
    }
    console.log(`[dev] ${localOrigin} (private to this checkout)`);
    process.exitCode = await supervise(
      run(
        process.execPath,
        [
          cli,
          who.name,
          process.execPath,
          fileURLToPath(import.meta.url),
          "server",
        ],
        { cwd: web, env: portlessEnv },
      ),
    );
    return;
  }
  if (!["server", "direct", "shared"].includes(mode))
    throw new Error(`Unknown dev mode: ${mode}`);
  const actualMode = mode === "server" ? "local" : mode;
  let port =
    mode === "server"
      ? portNumber(process.env.PORT)
      : portNumber(config.directPort);
  if (mode === "direct") {
    while (args.length) {
      const arg = args.shift();
      if (arg === "--port" || arg === "-p") port = portNumber(args.shift());
      else if (arg === "--hostname" && args.shift() === "127.0.0.1") {
        /* Explicit loopback is permitted. */
      } else
        throw new Error(
          "Direct mode accepts only --port <number> and --hostname 127.0.0.1",
        );
    }
  } else if (args.length)
    throw new Error("This mode takes no additional arguments");
  let origin =
    mode === "server" ? process.env.PORTLESS_URL : `http://localhost:${port}`;
  let release = () => {};
  let releaseRecord = () => {};
  if (mode === "shared") {
    if (!config.shared)
      throw new Error(
        "No shared integration origin is configured for this app. Use dev (local).",
      );
    port = portNumber(config.shared.port);
    origin = config.shared.origin;
    let projects;
    try {
      projects = JSON.parse(
        execFileSync("localcan", ["projects", "ls", "--json"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }),
      );
    } catch {
      throw new Error(
        "LocalCan is not running. Start the intended project explicitly, then rerun dev:shared. No tunnel was started or changed.",
      );
    }
    sharedService(projects, config.shared);
    const key = createHash("sha256").update(origin).digest("hex").slice(0, 24);
    release = acquireLease(join(state, `shared-${key}.lock`), {
      pid: process.pid,
      checkout,
      origin,
    });
  }
  try {
    const env = launchEnvironment(config, who, actualMode, origin, port);
    // Check before Next starts: Next otherwise silently increments an occupied port.
    const { createServer } = await import("node:net");
    await new Promise((done, reject) => {
      const socket = createServer();
      socket.once("error", reject);
      socket.listen(port, "127.0.0.1", () => socket.close(done));
    });
    mkdirSync(state, { recursive: true });
    const record = {
      pid: process.pid,
      checkout,
      mode: actualMode,
      origin,
      port,
      cookiePrefix: env.LOCAL_DEV_COOKIE_PREFIX,
      caFile: actualMode === "local" ? localCaPath() : undefined,
    };
    releaseRecord = acquireLease(recordPath, record);
    console.log(`[dev] ${actualMode}: ${origin}`);
    const child = run(
      config.packageManager,
      [
        "run",
        process.env.LOCAL_DEV_BUNDLER === "webpack"
          ? "dev:server:webpack"
          : "dev:server",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      { cwd: web, env, detached: process.platform !== "win32" },
    );
    child.localDevGroup = process.platform !== "win32";
    let finished = false;
    const completed = supervise(child, () => {
      finished = true;
      releaseRecord();
      release();
    }).catch((error) => {
      console.error(`[dev] ${error.message}`);
      return 1;
    });
    // Readiness is a successful HTTP response, not merely a live process.
    const deadline = Date.now() + 120000;
    while (!finished && Date.now() < deadline) {
      try {
        if (
          (await httpStatus(
            `${origin}${config.healthPath ?? "/"}`,
            actualMode === "local" ? localCaPath() : undefined,
          )) < 500
        ) {
          console.log(`[dev] Ready: ${origin}`);
          break;
        }
      } catch {
        /* Wait for compilation, bounded by the deadline. */
      }
      await delay(1000);
    }
    if (!finished && Date.now() >= deadline) {
      console.error(
        "[dev] Advertised origin did not become healthy within 120s; check the proxy or shared tunnel. Stopping this launch.",
      );
      if (child.localDevGroup) process.kill(-child.pid, "SIGTERM");
      else child.kill("SIGTERM");
      process.exitCode = 1;
    }
    const code = await completed;
    process.exitCode = process.exitCode || code;
  } finally {
    releaseRecord();
    release();
  }
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(`[dev] ${error.message}`);
    process.exitCode = 1;
  });
}
