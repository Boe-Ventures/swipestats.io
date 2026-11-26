import { copyFile, mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import {
  SWIPESTATS_HEART_BARS,
  SWIPESTATS_MARK_RED,
  SWIPESTATS_MARK_VIEW_BOX,
  SWIPESTATS_TILE_RADIUS,
} from "../src/lib/brand";

// The original 512px PNG is the mark selected in Bifrost.
const logo = "public/images/logo/swipestats-logo.png";
const bars = SWIPESTATS_HEART_BARS.map(
  (bar) =>
    `<rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="${bar.rx}"/>`,
).join("");
const tile = `<rect width="512" height="512" rx="${SWIPESTATS_TILE_RADIUS}" fill="${SWIPESTATS_MARK_RED}"/><g fill="white">${bars}</g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${SWIPESTATS_MARK_VIEW_BOX}">${tile}</svg>`;

await mkdir("public/images/brand", { recursive: true });
await writeFile("public/images/brand/heart-tile.svg", svg);
await copyFile(logo, "src/app/icon.png");

// ICO with PNG payloads at common browser sizes, resized from the original mark.
const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((size) => sharp(logo).resize(size, size).png().toBuffer()),
);
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const entry = 6 + i * 16;
  header[entry] = sizes[i]!;
  header[entry + 1] = sizes[i]!;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(png.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});
await writeFile("public/favicon.ico", Buffer.concat([header, ...pngs]));
const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#FAF8F5"/>
<g transform="translate(556 113) scale(.171875)">${tile}</g>
<text x="600" y="314" text-anchor="middle" font-family="sans-serif" font-size="82" font-weight="bold" fill="#202126">SwipeStats</text>
<text x="600" y="389" text-anchor="middle" font-family="sans-serif" font-size="38" fill="#202126">Analyze your dating app data</text>
</svg>`;
await sharp(Buffer.from(social)).png().toFile("public/SwipeStats-og.png");

console.log("Generated SwipeStats brand icons and link preview.");
