import type { Metadata } from "next";

import { RayaUploadPage } from "./RayaUploadPage";
import { marketingOgImage } from "@/lib/og-images";

const rayaUploadOgImage = marketingOgImage({
  title: "Upload your Raya data",
  subtitle: "Explore your dating activity from a private archive—anonymously.",
  path: "/upload/raya",
  screenshot: "/images/og/screenshots/upload-picker.jpg",
});

export const metadata: Metadata = {
  title: "Upload Your Raya Data",
  description:
    "Upload your Raya data archive anonymously and explore your dating activity.",
  alternates: { canonical: "/upload/raya" },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Upload Your Raya Data | SwipeStats",
    description:
      "Explore your dating activity from a private archive—anonymously.",
    url: "/upload/raya",
    images: [
      {
        url: rayaUploadOgImage,
        width: 1200,
        height: 630,
        alt: "SwipeStats Raya data upload",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Upload Your Raya Data",
    description:
      "Explore your dating activity from a private archive—anonymously.",
    images: [rayaUploadOgImage],
  },
};

export default function RayaUpload() {
  return <RayaUploadPage />;
}
