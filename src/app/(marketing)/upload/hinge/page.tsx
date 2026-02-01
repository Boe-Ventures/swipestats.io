import type { Metadata } from "next";

import { HingeUploadPage } from "./HingeUploadPage";
import { hingeUploadCache } from "./searchParams";

// Use ISR for SEO - static by default, but can handle dynamic searchParams
// This allows the page to be statically generated but still handle ?update=true
export const dynamic = "force-dynamic"; // Required because of searchParams
export const revalidate = 3600; // Revalidate every hour for SEO freshness

export const metadata: Metadata = {
  title: "Upload Your Hinge Data | SwipeStats",
  description:
    "Upload your Hinge data anonymously and get insights into your dating profile and activity.",
  openGraph: {
    title: "SwipeStats | Visualize your Hinge data",
    description:
      "Upload your dating data anonymously and compare it to demographics from around the world!",
    url: "https://swipestats.io/upload/hinge",
    images: ["/ss2.png"],
  },
};

export default async function HingeUpload({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Parse search params but don't fetch session server-side
  // Session will be fetched client-side if needed (for ?update=true)
  const { update, debug } = await hingeUploadCache.parse(searchParams);

  return <HingeUploadPage isUpdate={update} isDebug={debug} />;
}
