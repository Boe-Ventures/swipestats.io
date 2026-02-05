import type { Metadata } from "next";

import Footer from "./Footer";
import Header from "./Header";

export const metadata: Metadata = {
  title: {
    template: "%s | SwipeStats",
    default: "SwipeStats - Analyze Your Dating App Data",
  },
  description:
    "Upload your Tinder or Hinge data anonymously and get insights into your dating patterns. Compare with others worldwide.",
  openGraph: {
    title: "SwipeStats - Analyze Your Dating App Data",
    description:
      "Upload your Tinder or Hinge data anonymously and get insights into your dating patterns. Compare with others worldwide.",
    type: "website",
    siteName: "SwipeStats",
    images: [
      {
        url: "/SwipeStats-og.png",
        width: 1200,
        height: 630,
        alt: "SwipeStats - Analyze Your Dating App Data",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SwipeStats - Analyze Your Dating App Data",
    description:
      "Upload your Tinder or Hinge data anonymously and get insights into your dating patterns. Compare with others worldwide.",
    creator: "@SwipeStats",
    images: ["/SwipeStats-og.png"],
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background">
      <Header container />
      <main className="isolate">{children}</main>
      <Footer />
    </div>
  );
}
