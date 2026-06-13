import type { NextRequest } from "next/server";
import { ImageResponse } from "next/og";

export const runtime = "edge";

type OgVariant = "split" | "centered" | "hero";

const PANEL_BG = "#0f0f0f";
const PANEL_FG = "#ffffff";
const MUTED_FG = "rgba(255, 255, 255, 0.6)";
const BRAND_PINK = "#f43f5e"; // rose-500
const BRAND_GRADIENT = "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #a855f7 100%)";

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);

    const title = searchParams.get("title") ?? "SwipeStats";
    const subtitle = searchParams.get("subtitle") ?? "";
    const path = searchParams.get("path") ?? "/";
    const screenshot = searchParams.get("screenshot") ?? "";
    const rawVariant = searchParams.get("variant") ?? "centered";
    const variant: OgVariant =
      rawVariant === "split"
        ? "split"
        : rawVariant === "hero"
          ? "hero"
          : "centered";

    const logoUrl = `${origin}/images/logo/swipestats-logo.png`;

    // Resolve screenshot URL
    const rawScreenshotUrl = screenshot
      ? screenshot.startsWith("http")
        ? screenshot
        : screenshot.startsWith("/")
          ? `${origin}${screenshot}`
          : `${origin}/images/og/screenshots/${screenshot}`
      : null;

    // Inline screenshot as data URL for Satori reliability
    let screenshotUrl: string | null = null;
    if (rawScreenshotUrl) {
      try {
        const res = await fetch(rawScreenshotUrl);
        if (res.ok) {
          const buf = new Uint8Array(await res.arrayBuffer());
          let binary = "";
          for (const byte of buf) {
            binary += String.fromCharCode(byte);
          }
          const base64 = btoa(binary);
          const contentType = res.headers.get("content-type") ?? "image/jpeg";
          screenshotUrl = `data:${contentType};base64,${base64}`;
        }
      } catch {
        screenshotUrl = null;
      }
    }

    const domainLabel = `swipestats.io${path === "/" ? "" : path}`;

    // --- Centered variant: dark, brand-forward ---
    const centeredJsx = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "system-ui",
          background: PANEL_BG,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient blob top-right */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: 200,
            background: "rgba(244, 63, 94, 0.12)",
            filter: "blur(1px)",
            display: "flex",
          }}
        />
        {/* Gradient blob bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -60,
            width: 300,
            height: 300,
            borderRadius: 150,
            background: "rgba(168, 85, 247, 0.08)",
            filter: "blur(1px)",
            display: "flex",
          }}
        />

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 80px",
            color: PANEL_FG,
          }}
        >
          <img
            src={logoUrl}
            width={72}
            height={72}
            alt=""
            style={{ borderRadius: 18 }}
          />

          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginTop: 24,
              display: "flex",
              textAlign: "center",
              backgroundImage: BRAND_GRADIENT,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {title}
          </div>

          {subtitle ? (
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.4,
                color: MUTED_FG,
                fontWeight: 500,
                marginTop: 14,
                maxWidth: 640,
                textAlign: "center",
                display: "flex",
              }}
            >
              {subtitle}
            </div>
          ) : (
            <div style={{ display: "none" }} />
          )}

          <div
            style={{
              fontSize: 18,
              color: MUTED_FG,
              fontWeight: 500,
              marginTop: 32,
              display: "flex",
            }}
          >
            {domainLabel}
          </div>
        </div>
      </div>
    );

    // --- Hero variant: title top, screenshot below ---
    const heroJsx = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui",
          background: PANEL_BG,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle gradient accent at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 3,
            backgroundImage: BRAND_GRADIENT,
            display: "flex",
          }}
        />

        {/* Top section: brand */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 36,
            paddingLeft: 80,
            paddingRight: 80,
            color: PANEL_FG,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <img
              src={logoUrl}
              width={40}
              height={40}
              alt=""
              style={{ borderRadius: 10 }}
            />
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                display: "flex",
              }}
            >
              SwipeStats
            </div>
          </div>

          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginTop: 16,
              display: "flex",
              textAlign: "center",
            }}
          >
            {title}
          </div>

          {subtitle ? (
            <div
              style={{
                fontSize: 18,
                lineHeight: 1.4,
                color: MUTED_FG,
                fontWeight: 500,
                marginTop: 8,
                maxWidth: 600,
                textAlign: "center",
                display: "flex",
              }}
            >
              {subtitle}
            </div>
          ) : (
            <div style={{ display: "none" }} />
          )}
        </div>

        {/* Bottom section: screenshot */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 20,
            paddingLeft: 60,
            paddingRight: 60,
            overflow: "hidden",
          }}
        >
          {screenshotUrl ? (
            <img
              src={screenshotUrl}
              alt=""
              width={1080}
              height={400}
              style={{
                width: 1080,
                height: 400,
                objectFit: "cover",
                objectPosition: "left top",
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
              }}
            />
          ) : (
            <div
              style={{
                width: 1080,
                height: 400,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(244, 63, 94, 0.03)",
                color: BRAND_PINK,
                fontSize: 160,
                fontWeight: 700,
                opacity: 0.06,
                letterSpacing: "-0.05em",
              }}
            >
              SwipeStats
            </div>
          )}
        </div>
      </div>
    );

    // --- Split variant: text left, screenshot right ---
    const splitJsx = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "system-ui",
          background: PANEL_BG,
        }}
      >
        <div
          style={{
            width: "480px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "56px 48px",
            color: PANEL_FG,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <img
              src={logoUrl}
              width={56}
              height={56}
              alt=""
              style={{ borderRadius: 14 }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                display: "flex",
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div
                style={{
                  fontSize: 20,
                  lineHeight: 1.35,
                  color: MUTED_FG,
                  fontWeight: 500,
                  display: "flex",
                }}
              >
                {subtitle}
              </div>
            ) : (
              <div style={{ display: "none" }} />
            )}
          </div>

          <div
            style={{
              fontSize: 18,
              color: MUTED_FG,
              fontWeight: 500,
              display: "flex",
            }}
          >
            {domainLabel}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-start",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {screenshotUrl ? (
            <img
              src={screenshotUrl}
              alt=""
              width={900}
              height={560}
              style={{
                width: 900,
                height: 560,
                marginLeft: 40,
                marginBottom: -60,
                objectFit: "cover",
                objectPosition: "left bottom",
                borderTopLeftRadius: 14,
                borderTopRightRadius: 14,
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: BRAND_PINK,
                fontSize: 220,
                fontWeight: 700,
                opacity: 0.05,
                letterSpacing: "-0.05em",
              }}
            >
              SS
            </div>
          )}
        </div>
      </div>
    );

    const jsx =
      variant === "hero"
        ? heroJsx
        : variant === "split"
          ? splitJsx
          : centeredJsx;

    return new ImageResponse(jsx, {
      width: 1200,
      height: 630,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
    console.error("OG image generation failed:", error);
    return new Response(`OG error: ${message}`, {
      status: 500,
      headers: { "content-type": "text/plain" },
    });
  }
}
