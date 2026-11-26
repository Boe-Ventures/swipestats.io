import type { Metadata } from "next";
import { LoveStoriesWorkspace } from "./workspace";
export const metadata: Metadata = {
  title: "Your Love Stories",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <div className="ph-no-capture amp-block" data-amp-block>
      <LoveStoriesWorkspace />
    </div>
  );
}
