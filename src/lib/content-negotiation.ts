export type PageRepresentation = "text/html" | "text/markdown";

const PAGE_REPRESENTATIONS: readonly PageRepresentation[] = [
  "text/html",
  "text/markdown",
];

interface AcceptRange {
  mediaType: string;
  position: number;
  quality: number;
  specificity: number;
}

function parseAccept(header: string): AcceptRange[] {
  return header
    .split(",")
    .map((raw, position) => {
      const [rawMediaType = "", ...parameters] = raw
        .trim()
        .split(";")
        .map((part) => part.trim());
      const mediaType = rawMediaType.toLowerCase();
      let quality = 1;

      for (const parameter of parameters) {
        const [name, value] = parameter
          .split("=", 2)
          .map((part) => part.trim().toLowerCase());
        if (name !== "q") continue;
        const parsed = Number(value);
        quality = Number.isFinite(parsed)
          ? Math.max(0, Math.min(1, parsed))
          : 0;
      }

      return {
        mediaType,
        position,
        quality,
        specificity: mediaType === "*/*" ? 0 : mediaType.endsWith("/*") ? 1 : 2,
      };
    })
    .filter((entry) => entry.mediaType.includes("/"));
}

function matches(range: AcceptRange, candidate: PageRepresentation): boolean {
  if (range.mediaType === "*/*") return true;
  if (range.mediaType.endsWith("/*")) {
    return candidate.startsWith(range.mediaType.slice(0, -1));
  }
  return range.mediaType === candidate;
}

/** Select HTML or Markdown using RFC 9110 quality and specificity rules. */
export function negotiatePageRepresentation(
  header: string | null,
): PageRepresentation | null {
  if (!header?.trim()) return "text/html";
  const ranges = parseAccept(header);
  if (ranges.length === 0) return "text/html";

  let best:
    | { mediaType: PageRepresentation; position: number; quality: number }
    | undefined;

  for (const candidate of PAGE_REPRESENTATIONS) {
    const matching = ranges
      .filter((range) => matches(range, candidate))
      .sort(
        (a, b) => b.specificity - a.specificity || a.position - b.position,
      )[0];
    if (!matching || matching.quality <= 0) continue;

    if (
      !best ||
      matching.quality > best.quality ||
      (matching.quality === best.quality && matching.position < best.position)
    ) {
      best = {
        mediaType: candidate,
        position: matching.position,
        quality: matching.quality,
      };
    }
  }

  return best?.mediaType ?? null;
}

export function appendVary(headers: Headers, field: string): void {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", field);
    return;
  }
  const fields = existing.split(",").map((value) => value.trim().toLowerCase());
  if (!fields.includes(field.toLowerCase())) {
    headers.set("Vary", `${existing}, ${field}`);
  }
}

export function markdownResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept, Accept-Encoding",
    },
  });
}
