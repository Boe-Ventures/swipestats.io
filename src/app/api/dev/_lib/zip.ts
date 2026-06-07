import "server-only";

import JSZip from "jszip";
import { NextResponse } from "next/server";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

/** Strip anything that would create a path or be illegal in a zip entry name. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "file";
}

/** Ensure a filename has an extension, deriving it from the mime type if not. */
export function ensureExtension(name: string, mimeType: string): string {
  if (/\.[a-z0-9]{2,5}$/i.test(name)) return name;
  const ext = MIME_EXT[mimeType.toLowerCase()] ?? "bin";
  return `${name}.${ext}`;
}

export interface ZipEntry {
  url: string;
  /** Entry name inside the zip. Callers should prefix with an index to keep order. */
  name: string;
}

/**
 * Fetch each URL and bundle the bytes into a zip. Blob URLs are public, so a
 * plain server-side fetch works. A file that fails to download is skipped (and
 * logged) rather than failing the whole archive.
 */
export async function buildZipFromUrls(
  entries: ZipEntry[],
): Promise<ArrayBuffer> {
  const zip = new JSZip();

  await Promise.all(
    entries.map(async (entry) => {
      try {
        const res = await fetch(entry.url);
        if (!res.ok) {
          console.error(`⚠️ Zip fetch failed (${res.status}): ${entry.url}`);
          return;
        }
        const buf = await res.arrayBuffer();
        zip.file(entry.name, buf);
      } catch (error) {
        console.error(`⚠️ Zip fetch threw for ${entry.url}:`, error);
      }
    }),
  );

  return zip.generateAsync({ type: "arraybuffer" });
}

/** Build an attachment download response for a zip payload. */
export function zipResponse(data: ArrayBuffer, filename: string): NextResponse {
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(filename)}"`,
      "Content-Length": String(data.byteLength),
    },
  });
}
