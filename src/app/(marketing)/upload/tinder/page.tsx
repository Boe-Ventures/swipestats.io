import type { Metadata } from "next";
import { TinderUploadPage } from "./TinderUploadPage";

// Use ISR for SEO - static by default, but can handle dynamic searchParams
// This allows the page to be statically generated but still handle ?update=true
export const dynamic = "force-dynamic"; // Required because of searchParams
export const revalidate = 3600; // Revalidate every hour for SEO freshness

export const metadata: Metadata = {
  title: "Upload Your Tinder Data | SwipeStats",
  description:
    "Upload your Tinder data anonymously and get insights into your dating profile and activity.",
  openGraph: {
    title: "SwipeStats | Visualize your Tinder data",
    description:
      "Upload your dating data anonymously and compare it to demographics from around the world!",
    url: "https://swipestats.io/upload/tinder",
    images: ["/ss2.png"],
  },
};

export default async function TinderUpload({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const update = params.update === "true";
  const debug = params.debug === "true";

  return <TinderUploadPage isUpdate={update} isDebug={debug} session={null} />;
}
