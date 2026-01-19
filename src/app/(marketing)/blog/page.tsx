import { Suspense } from "react";

import { env } from "@/env";

import { posts as allPosts } from ".velite";
import { BlogPageContent } from "./BlogPageContent";

const ogImageUrl = `${env.NEXT_PUBLIC_BASE_URL}/api/og/blog?title=${encodeURIComponent("SwipeStats Blog")}&description=${encodeURIComponent("Data-driven dating insights")}`;

export const metadata = {
  title: "Blog | SwipeStats - Data-Driven Dating Insights",
  description:
    "Expert insights, data-driven strategies, and actionable advice for improving your online dating success.",
  keywords: [
    "dating app blog",
    "online dating tips",
    "dating app statistics",
    "tinder insights",
    "dating app strategy",
    "data-driven dating",
    "match rate optimization",
    "dating profile tips",
  ],
  openGraph: {
    title: "SwipeStats Blog - Data-Driven Dating Insights",
    description:
      "Expert insights and data-driven strategies for online dating success.",
    type: "website",
    url: "/blog",
    siteName: "SwipeStats",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "SwipeStats Blog - Data-Driven Dating Insights",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SwipeStats Blog - Data-Driven Dating Insights",
    description:
      "Expert insights and data-driven strategies for online dating success.",
    images: [ogImageUrl],
    creator: "@SwipeStats",
  },
  alternates: {
    types: {
      "application/rss+xml": "/blog/feed.xml",
    },
  },
};

export default function BlogPage() {
  const publishedPosts = allPosts.filter((post) => post.isPublished);
  const sortedPosts = publishedPosts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  // Manually specify featured post slugs (up to 3)
  const FEATURED_SLUGS = [
    "together-we-could-hinge-prompt",
    "tinder-statistics",
    "best-rizz-pickup-lines",
  ];

  return (
    <Suspense fallback={<div className="container py-12">Loading...</div>}>
      <BlogPageContent
        allPosts={sortedPosts}
        featuredSlugs={FEATURED_SLUGS}
        title="Data-Driven Dating Insights"
        description="Expert insights and actionable strategies to help you succeed on dating apps."
      />
    </Suspense>
  );
}
