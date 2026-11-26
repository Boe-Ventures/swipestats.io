import type { Metadata } from "next";
import { Suspense } from "react";
import { LoveStoriesPreview } from "./preview";
export const metadata: Metadata = {
  title: "Love Stories experiment",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <Suspense>
      <LoveStoriesPreview />
    </Suspense>
  );
}
