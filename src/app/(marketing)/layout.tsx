import type { Metadata } from "next";

import Footer from "./Footer";
import Header from "./Header";

export const metadata: Metadata = {
  title: {
    template: "%s | SwipeStats",
    default: "SwipeStats - Analyze your Tinder data",
  },
  description:
    "Extract anonymous data from your Tinder data file and get insights into your dating patterns.",
  openGraph: {
    title: "SwipeStats - Analyze your Tinder data",
    description:
      "Extract anonymous data from your Tinder data file and get insights into your dating patterns.",
    siteName: "SwipeStats",
  },
  twitter: {
    card: "summary_large_image",
    title: "SwipeStats - Analyze your Tinder data",
    description:
      "Extract anonymous data from your Tinder data file and get insights into your dating patterns.",
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
