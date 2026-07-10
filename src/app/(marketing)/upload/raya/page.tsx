import type { Metadata } from "next";

import { RayaUploadPage } from "./RayaUploadPage";

export const metadata: Metadata = {
  title: "Upload Your Raya Data",
  description:
    "Upload your Raya data archive anonymously and explore your dating activity.",
  alternates: { canonical: "/upload/raya" },
  robots: { index: false, follow: false },
};

export default function RayaUpload() {
  return <RayaUploadPage />;
}
