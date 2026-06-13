/** Pull the filename out of a `Content-Disposition` header, if present. */
function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Fetch a same-origin endpoint and trigger a browser download of the response.
 * Uses an object URL + temporary anchor so we can surface errors (e.g. an empty
 * column) as a thrown message instead of navigating away to a JSON error page.
 */
export async function downloadFromUrl(
  url: string,
  fallbackName: string,
): Promise<void> {
  const res = await fetch(url);

  if (!res.ok) {
    let message = "Download failed";
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const name =
    filenameFromContentDisposition(res.headers.get("Content-Disposition")) ??
    fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
