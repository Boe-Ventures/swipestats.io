import type { Metadata } from "next";
import { TinderUploadPage } from "./TinderUploadPage";
import { marketingOgImage } from "@/lib/og-images";

const tinderUploadOgImage = marketingOgImage({
  title: "Upload your Tinder data",
  subtitle:
    "Turn your private export into anonymous insights about swipes, matches, and messages.",
  path: "/upload/tinder",
  screenshot: "/images/og/screenshots/upload-tinder.jpg",
});

// Use ISR for SEO - static by default, but can handle dynamic searchParams
// This allows the page to be statically generated but still handle ?update=true
export const dynamic = "force-dynamic"; // Required because of searchParams
export const revalidate = 3600; // Revalidate every hour for SEO freshness

export const metadata: Metadata = {
  title: "Upload Your Tinder Data",
  description:
    "Upload your Tinder data anonymously and get insights into your dating profile and activity.",
  alternates: {
    canonical: "/upload/tinder",
  },
  openGraph: {
    title: "Upload Your Tinder Data | SwipeStats",
    description:
      "Upload your Tinder data anonymously and compare it to demographics from around the world!",
    url: "/upload/tinder",
    images: [
      {
        url: tinderUploadOgImage,
        width: 1200,
        height: 630,
        alt: "SwipeStats Tinder data upload",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Upload Your Tinder Data",
    description:
      "Turn your private export into anonymous insights about swipes, matches, and messages.",
    images: [tinderUploadOgImage],
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

  return <TinderUploadPage isUpdate={update} isDebug={debug} />;
}
