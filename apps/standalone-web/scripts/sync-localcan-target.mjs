import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const port = process.env.PORT;
if (!port) {
  console.warn(
    "[LocalCan] PORT is unavailable; leaving the tunnel target unchanged.",
  );
  process.exit(0);
}

const publicHost = "swipestats.localcan.dev";
let configPath;

/** @param {{ url: string }} endpoint */
const matchesPublicHost = (endpoint) => endpoint.url === publicHost;

try {
  const projects = JSON.parse(
    execFileSync("localcan", ["projects", "ls", "--json"], {
      encoding: "utf8",
    }),
  );
  configPath = Object.values(projects).find((entry) =>
    Object.values(entry.project.services).some((service) =>
      service.endpoints.some(matchesPublicHost),
    ),
  )?.file_path;
} catch (error) {
  console.warn("[LocalCan] Could not inspect configured projects.", error);
  process.exit(0);
}

if (!configPath || !existsSync(configPath)) {
  console.info(
    `[LocalCan] No ${publicHost} project found; skipping tunnel sync.`,
  );
  process.exit(0);
}

const source = readFileSync(configPath, "utf8");
const nextTarget = `http://127.0.0.1:${port}`;
const updated = source.replace(
  /^(\s*target:\s*).+$/m,
  (_line, prefix) => `${prefix}${nextTarget}`,
);

if (updated === source) {
  if (!source.includes(`target: ${nextTarget}`)) {
    console.warn(
      "[LocalCan] Could not find the SwipeStats service target; skipping tunnel sync.",
    );
  }
  process.exit(0);
}

writeFileSync(configPath, updated);

try {
  execFileSync("localcan", ["reload"], { stdio: "inherit" });
  console.info(
    `[LocalCan] SwipeStats tunnel now follows Portless on ${nextTarget}.`,
  );
} catch (error) {
  console.warn("[LocalCan] Failed to reload the tunnel configuration.", error);
}
