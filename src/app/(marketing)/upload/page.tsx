import { Suspense } from "react";
import type { Metadata } from "next";
import { UploadClient } from "./UploadClient";
import { marketingOgImage } from "@/lib/og-images";

const uploadOgImage = marketingOgImage({
  title: "Visualize your dating data",
  subtitle:
    "Choose your app, upload anonymously, and see what your dating history reveals.",
  path: "/upload",
  screenshot: "/images/og/screenshots/upload-picker.jpg",
});

export const metadata: Metadata = {
  title: "Upload Dating App Data",
  description:
    "Upload Tinder or Hinge data anonymously to visualize swipes, matches, messages, and dating patterns.",
  alternates: { canonical: "/upload" },
  openGraph: {
    title: "Visualize Your Dating Data | SwipeStats",
    description:
      "Choose your app, upload anonymously, and see what your dating history reveals.",
    url: "/upload",
    images: [
      {
        url: uploadOgImage,
        width: 1200,
        height: 630,
        alt: "SwipeStats upload flow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Visualize Your Dating Data",
    description:
      "Choose your app, upload anonymously, and see what your dating history reveals.",
    images: [uploadOgImage],
  },
};

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-rose-600" />
          </div>
        </div>
      }
    >
      <UploadClient />
    </Suspense>
  );
}
