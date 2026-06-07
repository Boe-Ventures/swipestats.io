import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { aiOutputTable, type StatsRoastResult } from "@/server/db/schema";

// Default (Node.js) runtime — the Neon HTTP client + ImageResponse both work
// here, and it avoids edge-bundling the db module's `ws` import.
export const alt = "My AI dating app roast on SwipeStats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function scoreColor(score: number) {
  return score >= 70 ? "#4ade80" : score >= 45 ? "#fbbf24" : "#f87171";
}

export default async function Image({
  params,
}: {
  params: Promise<{ shareKey: string }>;
}) {
  const { shareKey } = await params;
  const row = await db.query.aiOutputTable.findFirst({
    where: eq(aiOutputTable.shareKey, shareKey),
  });

  // Public stats-roasts only; fall back to a generic card otherwise so the URL
  // still embeds a valid image.
  const output =
    row?.isPublic &&
    (row.kind === "tinder_roast" || row.kind === "hinge_roast")
      ? (row.output as StatsRoastResult)
      : null;
  const score = output ? output.overallScore : null;
  const headline = output
    ? output.headline
    : "Get brutally, lovingly roasted by your own dating data.";
  const tagline = output ? output.tagline : null;
  const color = score !== null ? scoreColor(score) : "#fb7185";

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
          padding: "64px 72px",
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
            AI Dating Roast
          </span>
        </div>

        {/* Score + headline */}
        <div
          style={{ display: "flex", alignItems: "center", gap: "56px" }}
        >
          {score !== null && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "200px",
                  lineHeight: 1,
                  fontWeight: 900,
                  color,
                }}
              >
                {score}
              </span>
              <span
                style={{
                  fontSize: "26px",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                / 100 Dateability
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: "20px",
            }}
          >
            {tagline && (
              <div
                style={{
                  display: "flex",
                  alignSelf: "flex-start",
                  padding: "8px 18px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.1)",
                  fontSize: "24px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {tagline}
              </div>
            )}
            <span
              style={{
                fontSize: score !== null ? "52px" : "64px",
                lineHeight: 1.15,
                fontWeight: 700,
                fontStyle: "italic",
                color: "white",
              }}
            >
              {`“${headline.length > 130 ? headline.slice(0, 127) + "…" : headline}”`}
            </span>
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
          <span style={{ fontSize: "28px", color: "rgba(255,255,255,0.55)" }}>
            How does your dating game stack up?
          </span>
          <span style={{ fontSize: "28px", fontWeight: 700, color: "#fb7185" }}>
            swipestats.io →
          </span>
        </div>
      </div>
    ),
    size,
  );
}
