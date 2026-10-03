import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import {
  SWIPESTATS_BRAND as colors,
  SWIPESTATS_HEART_BARS,
} from "../src/lib/brand";

const bars = SWIPESTATS_HEART_BARS.map(
  (bar) =>
    `<rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="${bar.rx}"/>`,
).join("");
const svg = (fill: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="${fill}">${bars}</svg>`;
const tile = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="36" fill="${colors.rose}"/><g transform="translate(20 20)" fill="white">${bars}</g></svg>`;
await mkdir("public/images/brand", { recursive: true });
for (const [name, fill] of [
  ["heart", colors.rose],
  ["heart-ink", colors.ink],
  ["heart-white", "#ffffff"],
]) {
  await writeFile(`public/images/brand/${name}.svg`, svg(fill!));
  await sharp(Buffer.from(svg(fill!)))
    .resize(512, 512)
    .png()
    .toFile(`public/images/brand/${name}.png`);
}
await writeFile("public/images/brand/heart-tile.svg", tile);
await sharp(Buffer.from(tile))
  .resize(512, 512)
  .png()
  .toFile("src/app/icon.png");
await sharp(Buffer.from(tile))
  .resize(512, 512)
  .png()
  .toFile("public/images/logo/swipestats-logo.png");
// ICO with PNG payloads at common browser sizes, all from the same vector.
const sizes = [16, 32, 48];
const pngs = await Promise.all(
  sizes.map((size) =>
    sharp(Buffer.from(tile)).resize(size, size).png().toBuffer(),
  ),
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
console.log("Generated Human Data logo exports and icons.");

const social = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${colors.paper}"/>
<circle cx="1150" cy="40" r="320" fill="${colors.lilac}" opacity=".5"/>
<g transform="translate(64 50) scale(.48)" fill="${colors.rose}">${bars}</g>
<text x="134" y="92" font-family="Inter,Arial,sans-serif" font-size="38" font-weight="700" fill="${colors.ink}">SwipeStats</text>
<text x="72" y="295" font-family="Inter,Arial,sans-serif" font-size="82" font-weight="700" letter-spacing="-3" fill="${colors.ink}">Dating,</text>
<text x="72" y="388" font-family="Inter,Arial,sans-serif" font-size="82" font-weight="700" letter-spacing="-3" fill="${colors.ink}">in perspective.</text>
<text x="76" y="462" font-family="Inter,Arial,sans-serif" font-size="28" fill="${colors.ink}">Explore your Tinder and Hinge data.</text>
<g transform="translate(820 225) scale(2.3)" fill="${colors.rose}">${bars}</g>
<text x="76" y="571" font-family="monospace" font-size="20" fill="${colors.ink}">swipestats.io</text>
</svg>`;
await sharp(Buffer.from(social)).png().toFile("public/SwipeStats-og.png");
