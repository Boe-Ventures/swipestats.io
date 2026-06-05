import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const score = parseInt(searchParams.get("score") ?? "42", 10);
    const matchRate = searchParams.get("matchRate") ?? "0";
    const swipeRightRate = searchParams.get("swipeRightRate") ?? "0";
    const ghostRate = searchParams.get("ghostRate") ?? "0";
    const headline =
      searchParams.get("headline") ??
      "Your dating app stats have entered the chat — and they're crying.";
    const dataProvider = searchParams.get("dataProvider") ?? "Tinder";

    // Score color: red → amber → green
    const scoreColor =
      score >= 70 ? "#4ade80" : score >= 45 ? "#fbbf24" : "#f87171";

    const truncatedHeadline =
      headline.length > 110 ? headline.substring(0, 110) + "…" : headline;

    return new ImageResponse(
      <div
        style={{
          background:
            "linear-gradient(135deg, #0f0a1e 0%, #1a0f2e 40%, #0d1a2e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Radial glow behind score */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "60px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${scoreColor}22 0%, transparent 70%)`,
          }}
        />

        {/* Top bar: branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "32px 52px 0",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "linear-gradient(135deg, #e11d48 0%, #be185d 100%)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              📊
            </div>
            <span
              style={{
                fontSize: "22px",
                fontWeight: "bold",
                color: "white",
                letterSpacing: "-0.3px",
              }}
            >
              SwipeStats
            </span>
          </div>

          {/* Badge */}
          <div
            style={{
              display: "flex",
              padding: "6px 16px",
              background: "rgba(225, 29, 72, 0.15)",
              border: "1px solid rgba(225, 29, 72, 0.4)",
              borderRadius: "20px",
              fontSize: "14px",
              color: "#f87171",
              fontWeight: "600",
              letterSpacing: "0.5px",
            }}
          >
            🔥 AI ROAST
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "28px 52px 36px",
            gap: "48px",
            alignItems: "center",
          }}
        >
          {/* Left: headline + stats */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: "20px",
            }}
          >
            {/* Headline roast line */}
            <div
              style={{
                fontSize: headline.length > 80 ? "30px" : "36px",
                fontWeight: "700",
                color: "white",
                lineHeight: "1.25",
                letterSpacing: "-0.5px",
                maxWidth: "640px",
              }}
            >
              "{truncatedHeadline}"
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                marginTop: "8px",
              }}
            >
              {/* Match rate */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px",
                  padding: "14px 20px",
                  minWidth: "160px",
                }}
              >
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "white",
                  }}
                >
                  {matchRate}%
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.5)",
                    marginTop: "2px",
                  }}
                >
                  Match Rate
                </span>
              </div>

              {/* Like rate */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px",
                  padding: "14px 20px",
                  minWidth: "160px",
                }}
              >
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "white",
                  }}
                >
                  {swipeRightRate}%
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.5)",
                    marginTop: "2px",
                  }}
                >
                  Swipe Right Rate
                </span>
              </div>

              {/* Ghost rate */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px",
                  padding: "14px 20px",
                  minWidth: "160px",
                }}
              >
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: "white",
                  }}
                >
                  {ghostRate}%
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.5)",
                    marginTop: "2px",
                  }}
                >
                  Ghost Rate
                </span>
              </div>
            </div>

            {/* CTA */}
            <div
              style={{
                fontSize: "15px",
                color: "rgba(255,255,255,0.4)",
                marginTop: "4px",
              }}
            >
              swipestats.io · Upload your {dataProvider} data to get roasted
            </div>
          </div>

          {/* Right: Dateability score circle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            {/* Outer ring */}
            <div
              style={{
                width: "200px",
                height: "200px",
                borderRadius: "50%",
                border: `4px solid ${scoreColor}`,
                background: `radial-gradient(circle, ${scoreColor}18 0%, transparent 70%)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 0 40px ${scoreColor}40`,
              }}
            >
              <span
                style={{
                  fontSize: "72px",
                  fontWeight: "900",
                  color: scoreColor,
                  lineHeight: "1",
                  letterSpacing: "-2px",
                }}
              >
                {score}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.5)",
                  fontWeight: "600",
                  letterSpacing: "0.5px",
                  marginTop: "4px",
                }}
              >
                / 100
              </span>
            </div>
            <span
              style={{
                fontSize: "14px",
                color: "rgba(255,255,255,0.6)",
                fontWeight: "600",
                textAlign: "center",
                letterSpacing: "0.3px",
              }}
            >
              DATEABILITY SCORE
            </span>
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error("Roast OG Image generation error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
