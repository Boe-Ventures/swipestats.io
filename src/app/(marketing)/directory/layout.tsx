import type { Metadata } from "next";

import { env } from "@/env";

export const metadata: Metadata = {
  title: "Public Dating Profile Directory",
  description:
    "Explore recent dating app profiles and aggregate SwipeStats insights.",
  alternates: { canonical: "/directory" },
  openGraph: {
    title: "Public Dating Profile Directory | SwipeStats",
    description:
      "Explore recent dating app profiles and aggregate SwipeStats insights.",
    url: "/directory",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Public Dating Profile Directory | SwipeStats",
    description:
      "Explore recent dating app profiles and aggregate SwipeStats insights.",
  },
};

const directoryJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "SwipeStats Public Dating Profile Directory",
  description: "Recent dating app profiles and aggregate SwipeStats insights.",
  url: `${env.NEXT_PUBLIC_BASE_URL}/directory`,
  isPartOf: {
    "@type": "WebSite",
    name: "SwipeStats",
    url: env.NEXT_PUBLIC_BASE_URL,
  },
};

export default function DirectoryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(directoryJsonLd) }}
      />
      {children}
    </>
  );
}
