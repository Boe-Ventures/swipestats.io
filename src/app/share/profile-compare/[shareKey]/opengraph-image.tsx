import { ImageResponse } from "next/og";

import { fetchImageDataUri } from "@/lib/og";
import { columnPhotoUrls, getPublicComparisonForShare } from "./og-data";

// Default (Node.js) runtime — the Neon HTTP client + ImageResponse both work
// here, and it avoids edge-bundling the db module's `ws` import.
export const alt = "A dating profile comparison on SwipeStats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function truncate(value: string, max: number) {
  return value.length > max ? value.slice(0, max - 1) + "…" : value;
}

export default async function Image({
  params,
}: {
  params: Promise<{ shareKey: string }>;
}) {
  const { shareKey } = await params;
  const comparison = await getPublicComparisonForShare(shareKey);

  const subject = comparison?.profileName ?? null;
  const versions = comparison?.columns.length ?? 0;
  const age = comparison?.age ?? null;
  const location = comparison
    ? [comparison.city, comparison.state, comparison.country]
        .filter(Boolean)
        .join(", ")
    : "";

  // Up to 3 column thumbnails (the "compare" story), fetched defensively.
  const urls = comparison ? columnPhotoUrls(comparison).slice(0, 3) : [];
  const thumbs = (await Promise.all(urls.map(fetchImageDataUri))).filter(
    (src): src is string => Boolean(src),
  );

  const heading = truncate(
    comparison?.name ??
      (subject ? `${subject}'s profile, compared` : "Which profile works best?"),
    60,
  );
  const subParts: string[] = [];
  if (versions > 1) subParts.push(`${versions} versions`);
  if (subject) subParts.push(subject);
  if (age) subParts.push(`${age}`);
  if (location) subParts.push(location);
  const subline = truncate(subParts.join("  ·  "), 72);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at 80% 0%, #1e293b 0%, #0b1120 55%)",
          padding: "56px 64px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)",
              fontSize: "30px",
            }}
          >
            📸
          </div>
          <span style={{ fontSize: "30px", fontWeight: 800, color: "white" }}>
            SwipeStats
          </span>
          <span style={{ fontSize: "26px", color: "rgba(255,255,255,0.4)" }}>
            Profile Compare
          </span>
        </div>

        {/* Body: thumbnail strip + heading */}
        <div style={{ display: "flex", alignItems: "center", gap: "44px" }}>
          {thumbs.length > 0 && (
            <div style={{ display: "flex", gap: "16px" }}>
              {thumbs.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  width={170}
                  height={230}
                  style={{
                    width: "170px",
                    height: "230px",
                    objectFit: "cover",
                    borderRadius: "20px",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
              ))}
            </div>
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              flex: 1,
            }}
          >
            <span
              style={{
                fontSize: thumbs.length ? "52px" : "68px",
                lineHeight: 1.05,
                fontWeight: 800,
                color: "white",
              }}
            >
              {heading}
            </span>
            {subline && (
              <span
                style={{ fontSize: "26px", color: "rgba(255,255,255,0.55)" }}
              >
                {subline}
              </span>
            )}
          </div>
        </div>

        {/* Footer CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: "26px", color: "rgba(255,255,255,0.55)" }}>
            Which one works best?
          </span>
          <span style={{ fontSize: "26px", fontWeight: 700, color: "#fb7185" }}>
            swipestats.io →
          </span>
        </div>
      </div>
    ),
    size,
  );
}
