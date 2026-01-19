import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title") || "SwipeStats Blog";
    const tag = searchParams.get("tag") || "";

    return new ImageResponse(
      <div
        style={{
          background:
            "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1e 100%)",
          width: "100%",
          height: "100%",
          padding: "50px 60px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          fontFamily: "system-ui, -apple-system, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* Subtle texture overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.02) 0%, transparent 50%)",
            opacity: 0.6,
          }}
        />

        {/* Logo - top right (matching header style) */}
        <div
          style={{
            position: "absolute",
            top: "30px",
            right: "30px",
            display: "flex",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              background: "linear-gradient(135deg, #e11d48 0%, #be185d 100%)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "10px",
              fontSize: "20px",
            }}
          >
            📊
          </div>
          <span
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "white",
              letterSpacing: "-0.5px",
            }}
          >
            SwipeStats
          </span>
        </div>

        {/* Main content - left side with visual on right */}
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "100px",
            gap: "50px",
          }}
        >
          {/* Text content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              maxWidth: "650px",
            }}
          >
            <h1
              style={{
                fontSize: "64px",
                fontWeight: "bold",
                color: "white",
                lineHeight: "1.1",
                margin: "0 0 16px 0",
                letterSpacing: "-1px",
              }}
            >
              {title.length > 45 ? title.substring(0, 45) + "..." : title}
            </h1>
            {tag && (
              <div
                style={{
                  display: "flex",
                  padding: "8px 16px",
                  background: "rgba(96, 165, 250, 0.2)",
                  borderRadius: "8px",
                  fontSize: "18px",
                  color: "#60a5fa",
                  fontWeight: "600",
                }}
              >
                #{tag}
              </div>
            )}
          </div>

          {/* Visual element - right side */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "240px",
              height: "240px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background:
                  "linear-gradient(135deg, rgba(225, 29, 72, 0.15) 0%, rgba(190, 24, 93, 0.15) 100%)",
                borderRadius: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "100px",
                border: "2px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {title.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error("Display OG Image generation error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
