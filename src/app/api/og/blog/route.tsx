import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title") || "SwipeStats Blog";
    const description =
      searchParams.get("description") || "Data-driven dating insights";

    return new ImageResponse(
      <div
        style={{
          background: "linear-gradient(135deg, #e11d48 0%, #be185d 100%)",
          width: "100%",
          height: "100%",
          padding: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Main content centered */}
        <div
          style={{
            textAlign: "center",
            maxWidth: "900px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h1
            style={{
              fontSize: "64px",
              fontWeight: "bold",
              color: "white",
              lineHeight: "1.1",
              margin: "0 0 24px 0",
            }}
          >
            {title.length > 60 ? title.substring(0, 60) + "..." : title}
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "rgba(255, 255, 255, 0.9)",
              lineHeight: "1.4",
              margin: 0,
            }}
          >
            {description.length > 100
              ? description.substring(0, 100) + "..."
              : description}
          </p>
        </div>

        {/* Header logo - positioned absolute */}
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "40px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: "white",
            }}
          >
            SwipeStats
          </span>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    console.error("OG Image generation error:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
