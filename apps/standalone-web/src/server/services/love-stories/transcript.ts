import { MAX_ENTRY_CHARACTERS } from "@/lib/love-stories/model";
import { DomainError } from "@/server/domains/error";

const MAX_TRANSCRIPT_BYTES = MAX_ENTRY_CHARACTERS * 4;
function bad(message: string): never {
  throw new DomainError({ code: "BAD_REQUEST", message });
}

/** Fetch only Blob text files, never arbitrary URLs or application credentials. */
export async function readTranscriptFile(fileUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(fileUrl);
  } catch {
    bad("Use an HTTPS Vercel Blob text-file URL.");
  }
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.(?:(?:public|private)\.)?blob\.vercel-storage\.com$/.test(
      url.hostname,
    ) ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    !/\.(txt|md|markdown)$/i.test(url.pathname)
  )
    bad("Use an HTTPS Vercel Blob .txt, .md or .markdown URL.");

  try {
    const response = await fetch(url, {
      redirect: "error",
      cache: "no-store",
      credentials: "omit",
      signal: AbortSignal.timeout(15_000),
    });
    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      bad(
        "Could not read the transcript. For a private Blob, supply a valid signed read URL.",
      );
    }
    if (
      contentType &&
      ![
        "text/plain",
        "text/markdown",
        "text/x-markdown",
        "application/octet-stream",
      ].includes(contentType)
    ) {
      await response.body.cancel();
      bad("The transcript file must contain UTF-8 plain text or Markdown.");
    }
    if (Number(response.headers.get("content-length")) > MAX_TRANSCRIPT_BYTES) {
      await response.body.cancel();
      bad("Transcript exceeds 400,000 bytes. Split it into smaller entries.");
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_TRANSCRIPT_BYTES)
          bad(
            "Transcript exceeds 400,000 bytes. Split it into smaller entries.",
          );
        chunks.push(value);
      }
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    // Preserve the text, including whitespace and a UTF-8 BOM, without lossy decoding.
    const body = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: true,
    }).decode(Buffer.concat(chunks));
    if (!body.length || body.includes("\0"))
      bad("The transcript must be nonempty UTF-8 text without NUL bytes.");
    if (body.length > MAX_ENTRY_CHARACTERS)
      bad(
        "Transcript exceeds 100,000 characters. Split it into smaller entries.",
      );
    return body;
  } catch (error) {
    if (error instanceof DomainError) throw error;
    // Never log or echo a signed URL, its query parameters or the source content.
    bad(
      "Could not read a complete UTF-8 transcript. Check the file and its read URL, then retry.",
    );
  }
}
