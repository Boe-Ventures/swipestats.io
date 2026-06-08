import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { aiOutputTable, type StatsRoastResult } from "@/server/db/schema";

// Default (Node.js) runtime — the Neon HTTP client + ImageResponse both work
// here, and it avoids edge-bundling the db module's `ws` import.
export const alt = "My AI dating app roast on SwipeStats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
  const headline = output
    ? output.headline
    : "Get brutally, lovingly roasted by your own dating data.";
  const tagline = output ? output.tagline : null;

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

        {/* Verdict + headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {tagline && (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "10px 22px",
                borderRadius: "999px",
                background: "rgba(251,113,133,0.15)",
                fontSize: "28px",
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
              fontSize: "76px",
              lineHeight: 1.1,
              fontWeight: 700,
              fontStyle: "italic",
              color: "white",
            }}
          >
            {`“${headline.length > 120 ? headline.slice(0, 117) + "…" : headline}”`}
          </span>
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
