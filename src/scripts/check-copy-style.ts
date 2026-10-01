import { execFileSync } from "node:child_process";
import { readFileSync, lstatSync } from "node:fs";
import JSZip from "jszip";

// Construct the spellings so this source also satisfies the rule.
const forbidden = [
  String.fromCodePoint(0x2014),
  "&" + "mdash;",
  "&#" + "8212;",
  "&#x" + "2014;",
  String.fromCharCode(92) + "u2014",
];
const files = new Set(
  execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      encoding: "utf8",
    },
  )
    .split("\0")
    .filter(Boolean),
);
const violations: string[] = [];
const decoder = new TextDecoder("utf-8", { fatal: true });
function inspectCopy(file: string, content: string) {
  content.split("\n").forEach((line, index) => {
    if (forbidden.some((spelling) => line.toLowerCase().includes(spelling))) {
      violations.push(`${file}:${index + 1}`);
    }
  });
}
for (const file of files) {
  if (!lstatSync(file, { throwIfNoEntry: false })?.isFile()) continue;
  if (file.endsWith(".zip")) {
    const archive = await JSZip.loadAsync(readFileSync(file));
    for (const entry of Object.values(archive.files)) {
      if (!entry.dir && /\.(mdx?|txt|html)$/i.test(entry.name)) {
        inspectCopy(`${file}!${entry.name}`, await entry.async("string"));
      }
    }
    continue;
  }
  let content: string;
  try {
    content = decoder.decode(readFileSync(file));
  } catch {
    continue; // Binary assets are outside the copy policy.
  }
  inspectCopy(file, content);
}
if (violations.length) {
  console.error(
    "Em dashes are not allowed. Replace them in:\n" + violations.join("\n"),
  );
  process.exit(1);
}
console.log("Copy style passed: no em dashes in repository text.");
