import { SWIPESTATS_HOME_MARKDOWN } from "@/lib/agent-content";

export const dynamic = "force-static";

export function GET() {
  return new Response(SWIPESTATS_HOME_MARKDOWN, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept, Accept-Encoding",
    },
  });
}
