import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";

import { anonymizeImageBuffer } from "@/server/services/image-anonymization.service";

function printHelp() {
  console.log(`Usage: bun run privacy:anonymize-image -- OUTPUT_DIR IMAGE [...IMAGE]

Runs the same server-compatible face detector and Sharp anonymizer intended for
the online upload worker. It reads local images and writes JPEG derivatives plus
manifest.json. It does not access the database or Blob storage.`);
}

function outputName(inputPath: string, index: number) {
  const name = basename(inputPath, extname(inputPath))
    .replaceAll(/[^a-zA-Z0-9_-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return `${String(index + 1).padStart(2, "0")}-${name || "image"}-anonymized.jpg`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.length < 2) {
    printHelp();
    process.exitCode = args.includes("--help") ? 0 : 1;
    return;
  }

  const outputDir = resolve(args[0]!);
  const inputs = args.slice(1).map((input) => resolve(input));
  await mkdir(outputDir, { recursive: true, mode: 0o700 });

  const manifest = [];
  for (const [index, inputPath] of inputs.entries()) {
    const startedAt = performance.now();
    const result = await anonymizeImageBuffer(await readFile(inputPath));
    const filename = outputName(inputPath, index);
    const outputPath = join(outputDir, filename);
    await writeFile(outputPath, result.buffer, { mode: 0o600 });

    const item = {
      input: inputPath,
      output: outputPath,
      width: result.width,
      height: result.height,
      sourceBytes: result.sourceBytes,
      outputBytes: result.outputBytes,
      faces: result.faces,
      elapsedMs: Math.round(performance.now() - startedAt),
    };
    manifest.push(item);
    console.log(JSON.stringify(item));
  }

  await writeFile(
    join(outputDir, "manifest.json"),
    `${JSON.stringify({ createdAt: new Date().toISOString(), images: manifest }, null, 2)}\n`,
    { mode: 0o600 },
  );
}

if (import.meta.main) {
  await main();
}
