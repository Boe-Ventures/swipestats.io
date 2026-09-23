/** Blob random suffixes may follow the extension on older uploads. */
export function researchDownloadFormat(url: string) {
  const pathname = new URL(url).pathname;
  if (/\.jsonl\.gz(?:-[a-z0-9]+)?$/i.test(pathname)) {
    return { extension: "jsonl.gz", contentType: "application/gzip" } as const;
  }
  if (/\.json(?:-[a-z0-9]+)?$/i.test(pathname)) {
    return { extension: "json", contentType: "application/json" } as const;
  }
  throw new Error("Unsupported dataset file format");
}
export const DOWNLOAD_ACK_COOKIE = "research_download_started";
export const DOWNLOAD_COOKIE_PATH = "/research/download";
