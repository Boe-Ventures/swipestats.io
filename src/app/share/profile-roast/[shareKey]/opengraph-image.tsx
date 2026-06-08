import { ImageResponse } from "next/og";

import { fetchImageDataUri } from "@/lib/og";
import { getPublicProfileRoastForShare } from "./og-data";

// Default (Node.js) runtime — the Neon HTTP client + ImageResponse both work
// here, and it avoids edge-bundling the db module's `ws` import.
export const alt = "An AI profile roast on SwipeStats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ shareKey: string }>;
}) {
  const { shareKey } = await params;
  const roast = await getPublicProfileRoastForShare(shareKey);

  const overall = roast?.result.overall ?? null;
  const tagline = overall?.tagline ?? null;
  const rawHeadline =
    overall?.headline ?? "Get your dating profile roasted by AI.";
  const headline =
    rawHeadline.length > 120 ? rawHeadline.slice(0, 117) + "…" : rawHeadline;

  const photoSrc = await fetchImageDataUri(roast?.photoUrl);

  const photos = roast?.result.photos ?? [];
  const keeps = photos.filter((p) => p.keepOrCut === "keep").length;
  const cuts = photos.filter((p) => p.keepOrCut === "cut").length;
  const hasVerdicts = keeps > 0 || cuts > 0;

  const footerLeft = roast?.subject
    ? `${roast.subject}${roast.age ? `, ${roast.age}` : ""}`
    : "How does your profile hold up?";

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
            "radial-gradient(circle at 20% 0%, #2b1840 0%, #0f0a1e 55%)",
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
              fontSize: "32px",
            }}
          >
            🔥
          </div>
          <span style={{ fontSize: "30px", fontWeight: 800, color: "white" }}>
            SwipeStats
          </span>
          <span style={{ fontSize: "26px", color: "rgba(255,255,255,0.4)" }}>
            Profile Roast
          </span>
        </div>

        {/* Body: optional photo + verdict */}
        <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
          {photoSrc && (
            <img
              src={photoSrc}
              width={300}
              height={400}
              style={{
                width: "300px",
                height: "400px",
                objectFit: "cover",
                borderRadius: "24px",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            />
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              flex: 1,
            }}
          >
            {tagline && (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  padding: "10px 22px",
                  borderRadius: "999px",
                  background: "rgba(251,113,133,0.15)",
                  fontSize: "24px",
                  fontWeight: 700,
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  color: "#fda4af",
                }}
              >
                {tagline}
              </div>
            )}
            <span
              style={{
                fontSize: photoSrc ? "56px" : "72px",
                lineHeight: 1.1,
                fontWeight: 700,
                fontStyle: "italic",
                color: "white",
              }}
            >
              {`“${headline}”`}
            </span>
            {hasVerdicts && (
              <div style={{ display: "flex", gap: "16px", fontSize: "26px" }}>
                <span style={{ display: "flex", color: "#86efac" }}>
                  {keeps} keep{keeps === 1 ? "" : "s"}
                </span>
                <span
                  style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}
                >
                  ·
                </span>
                <span style={{ display: "flex", color: "#fca5a5" }}>
                  {cuts} cut{cuts === 1 ? "" : "s"}
                </span>
              </div>
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
            {footerLeft}
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
