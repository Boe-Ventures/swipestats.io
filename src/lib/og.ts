/**
 * Fetch a remote image and return a base64 data URI suitable for an `<img src>`
 * inside next/og's `ImageResponse`.
 *
 * We fetch + inline ourselves (rather than letting Satori fetch the URL) so a
 * missing, slow, or unreachable asset degrades to a text-only card instead of
 * throwing and 500-ing the whole opengraph-image route. Runs on the Node.js
 * runtime (the default for the colocated metadata routes), so `Buffer` is fine.
 */
export async function fetchImageDataUri(
  url: string | null | undefined,
): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
