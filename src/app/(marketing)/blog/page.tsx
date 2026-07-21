import { Suspense } from "react";

import { env } from "@/env";

import { posts as allPosts } from "@velite";
import { BlogPageContent } from "./BlogPageContent";

const ogImageUrl = `${env.NEXT_PUBLIC_BASE_URL}/api/og?title=${encodeURIComponent("Dating Advice, Tested Against the Data")}&subtitle=${encodeURIComponent("Statistics, app reviews, prompts, and practical guides from SwipeStats.")}&path=%2Fblog&variant=hero&screenshot=${encodeURIComponent("/images/blog/thumbnails/tinder-statistics.jpg")}`;

const pageTitle = "Dating advice, tested against the data";
const pageDescription =
  "Statistics, app reviews, prompts, and practical guides grounded in what people actually do.";

export const metadata = {
  // Root/marketing title.template appends " | SwipeStats", so don't repeat it here.
  title: "Dating App Data, Guides & Reviews",
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
    title: "Dating Advice, Tested Against the Data",
    description:
      "Statistics, app reviews, prompts, and practical guides from SwipeStats.",
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
    title: "Dating Advice, Tested Against the Data",
    description:
      "Statistics, app reviews, prompts, and practical guides from SwipeStats.",
    images: [ogImageUrl],
    creator: "@SwipeStats",
  },
  alternates: {
    canonical: "/blog",
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
    "tinder-statistics",
    "free-dating-apps-without-payment",
    "best-hinge-openers",
  ];

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "SwipeStats Blog",
    description: pageDescription,
    url: `${env.NEXT_PUBLIC_BASE_URL}/blog`,
    publisher: {
      "@type": "Organization",
      name: "SwipeStats",
      url: env.NEXT_PUBLIC_BASE_URL,
    },
    blogPost: sortedPosts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.h1,
      url: `${env.NEXT_PUBLIC_BASE_URL}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogJsonLd) }}
      />
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-12 lg:px-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {pageTitle}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            {pageDescription}
          </p>
        </div>
      </div>
      <Suspense fallback={<div className="container py-12">Loading...</div>}>
        <BlogPageContent
          allPosts={sortedPosts}
          featuredSlugs={FEATURED_SLUGS}
          title={pageTitle}
          description={pageDescription}
          showHeader={false}
        />
      </Suspense>
    </>
  );
}
