import type { Metadata } from "next";
import { LoveStoriesWorkspace } from "@/app/experiments/love-stories/workspace/workspace";

export const metadata: Metadata = {
  title: "Your Love Stories",
  robots: { index: false, follow: false },
};

export default function LoveStoriesPage() {
  return (
    <div className="ph-no-capture amp-block" data-amp-block>
      <LoveStoriesWorkspace embedded />
    </div>
  );
}
