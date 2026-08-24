import { SWIPESTATS_HOME_MARKDOWN } from "@/lib/agent-content";
import { markdownResponse } from "@/lib/content-negotiation";

export const dynamic = "force-static";

export function GET() {
  return markdownResponse(SWIPESTATS_HOME_MARKDOWN);
}
