import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Calendar, Clock, Instagram } from "lucide-react";

import { AUTHORS, type Author } from "@/lib/blog-authors";
import { env } from "@/env";

import { CtaInjector } from "@/components/mdx/CtaInjector";
import { MDXContent } from "@/components/mdx/MDXContent";
import { Prose } from "@/components/mdx/Prose";
import { RelatedPosts as _RelatedPosts } from "@/components/mdx/RelatedPosts";
import { StickyCtaCard } from "@/components/mdx/StickyCtaCard";
import { posts } from "@velite";
import NewsletterCTA from "../../NewsletterCTA";

export const dynamic = "force-static";

export function generateStaticParams() {
  // Only generate static paths for published posts
  return posts
    .filter((post) => post.isPublished)
    .map((post) => ({
      slug: post.slug,
    }));
}

function getPostBySlug(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {};
  }

  // Generate OG image using new route
  const ogImageUrl = `${env.NEXT_PUBLIC_BASE_URL}/api/og/blog?title=${encodeURIComponent(post.metaTitle)}&description=${encodeURIComponent(post.metaDescription || "")}`;

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [AUTHORS[post.author].name],
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: post.metaTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.metaDescription,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post?.isPublished) {
    notFound();
  }

  const { content, ...meta } = post;
  const readingTime = meta.readingTime || 5;
  const authorInfo: Author = AUTHORS[meta.author] ?? AUTHORS.paw;
  const showStickyCTA = meta.showStickyCTA;

  // Simple layout without sticky CTA
  if (!showStickyCTA) {
    return (
      <div className="bg-white" lang={meta.language}>
        <div className="mx-auto max-w-4xl px-6 py-24 lg:px-8">
          <div className="mt-8">
            <h1 className="text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
              {meta.h1}
            </h1>

            {meta.h1Subtitle && (
              <p className="mt-6 text-xl leading-8 text-gray-700">
                {meta.h1Subtitle}
              </p>
            )}
          </div>

          {/* Article content */}
          <div className="mt-16 max-w-none">
            <Prose>
              <MDXContent code={content} />
            </Prose>
            {meta.enableAutoCtAs && (
              <CtaInjector category={meta.category} tags={meta.tags} />
            )}
          </div>
        </div>

        {/* Author section */}
        <div className="bg-white py-16">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
              About the Author
            </h2>

            <div className="mx-auto mt-10 max-w-2xl">
              <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
                <Image
                  src={authorInfo.image}
                  alt={authorInfo.name}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover shadow-md"
                />

                <div className="mt-4 flex items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {authorInfo.name}
                  </h3>
                  {authorInfo.instagram && (
                    <a
                      href={authorInfo.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-rose-600"
                      aria-label="Instagram"
                    >
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                </div>

                <p className="mt-2 text-gray-600">{authorInfo.description}</p>

                {/* Meta info */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-x-2">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={meta.publishedAt}>
                      {format(parseISO(meta.publishedAt), "MMM dd, yyyy")}
                    </time>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{readingTime} min read</span>
                  </div>
                </div>

                {meta.updatedAt && meta.updatedAt !== meta.publishedAt && (
                  <div className="mt-2 text-xs text-gray-400">
                    Updated {format(parseISO(meta.updatedAt), "MMM dd, yyyy")}
                  </div>
                )}

                {/* Category */}
                {/* {meta.category && (
                  <div className="mt-6 flex flex-col items-center">
                    <span className="text-xs font-medium text-gray-500">
                      Category
                    </span>
                    <div className="mt-2 flex justify-center">
                      <span className="inline-flex items-center rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">
                        {meta.category}
                      </span>
                    </div>
                  </div>
                )} */}

                {/* Tags */}
                {/* {meta.tags.length > 0 && (
                  <div className="mt-4 flex flex-col items-center">
                    <span className="text-xs font-medium text-gray-500">
                      Tags
                    </span>
                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                      {meta.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )} */}

                {/* Back to Blog */}
                <div className="mt-8 w-full border-t border-gray-200 pt-6">
                  <Link
                    href="/blog"
                    className="flex items-center justify-center gap-2 text-base font-semibold text-rose-600 hover:text-rose-700"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Blog
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter CTA */}
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <NewsletterCTA />
        </div>

        {/* Related posts */}
        {/* <RelatedPosts too be re-introduced soon
          posts={posts
            .filter((p) => p.slug !== meta.slug && p.isPublished)
            .filter(
              (p) =>
                // Match by category (primary)
                (p.category && meta.category && p.category === meta.category) ||
                // Or match by tags (secondary)
                p.tags.some((tag) => meta.tags.includes(tag)),
            )}
          basePath="/blog"
        /> */}
      </div>
    );
  }

  // Sticky CTA layout (default)
  return (
    <div className="mt-12 bg-white" lang={meta.language}>
      {/* Hero Section */}
      <div className="relative isolate px-6 pt-14 lg:px-8">
        {/* Background decoration */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-linear-to-tr from-[#ff80b5] to-[#CF364C] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          />
        </div>

        {/* Hero Content */}
        <div className="mx-auto max-w-2xl py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              {meta.h1}
            </h1>
            {meta.h1Subtitle && (
              <p className="mt-6 text-lg leading-8 text-gray-600">
                {meta.h1Subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex gap-8 pb-16">
          {/* Main Content */}
          <div className="mx-auto w-full max-w-3xl flex-1">
            {/* Article content */}
            <div className="max-w-none">
              <Prose>
                <MDXContent code={content} />
              </Prose>
              {meta.enableAutoCtAs && (
                <CtaInjector category={meta.category} tags={meta.tags} />
              )}
            </div>
          </div>

          {/* Sticky CTA Sidebar - Desktop Only */}
          <aside className="hidden w-80 shrink-0 2xl:block">
            <div className="sticky top-24">
              <StickyCtaCard />
            </div>
          </aside>
        </div>
      </div>

      {/* Author section */}
      <div className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            About the Author
          </h2>

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
              <Image
                src={authorInfo.image}
                alt={authorInfo.name}
                width={96}
                height={96}
                className="h-24 w-24 rounded-full object-cover shadow-md"
              />

              <div className="mt-4 flex items-center gap-2">
                <h3 className="text-xl font-bold text-gray-900">
                  {authorInfo.name}
                </h3>
                {authorInfo.instagram && (
                  <a
                    href={authorInfo.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-rose-600"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
              </div>

              <p className="mt-2 text-gray-600">{authorInfo.description}</p>

              {/* Meta info */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-x-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={meta.publishedAt}>
                    {format(parseISO(meta.publishedAt), "MMM dd, yyyy")}
                  </time>
                </div>
                <div className="flex items-center gap-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{readingTime} min read</span>
                </div>
              </div>

              {meta.updatedAt && meta.updatedAt !== meta.publishedAt && (
                <div className="mt-2 text-xs text-gray-400">
                  Updated {format(parseISO(meta.updatedAt), "MMM dd, yyyy")}
                </div>
              )}

              {/* Category */}
              {/* {meta.category && (
                <div className="mt-6 flex flex-col items-center">
                  <span className="text-xs font-medium text-gray-500">
                    Category
                  </span>
                  <div className="mt-2 flex justify-center">
                    <span className="inline-flex items-center rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700">
                      {meta.category}
                    </span>
                  </div>
                </div>
              )} */}

              {/* Tags */}
              {/* {meta.tags.length > 0 && (
                <div className="mt-4 flex flex-col items-center">
                  <span className="text-xs font-medium text-gray-500">
                    Tags
                  </span>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {meta.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )} */}

              {/* Back to Blog */}
              <div className="mt-8 w-full border-t border-gray-200 pt-6">
                <Link
                  href="/blog"
                  className="flex items-center justify-center gap-2 text-base font-semibold text-rose-600 hover:text-rose-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Blog
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter CTA */}
      <div className="mx-auto max-w-7xl px-6 pt-16 lg:px-8">
        <NewsletterCTA />
      </div>

      {/* Related posts */}
      {/* <RelatedPosts too be re-introduced soon
        posts={posts
          .filter((p) => p.slug !== meta.slug && p.isPublished)
          .filter(
            (p) =>
              // Match by category (primary)
              (p.category && meta.category && p.category === meta.category) ||
              // Or match by tags (secondary)
              p.tags.some((tag) => meta.tags.includes(tag)),
          )}
        basePath="/blog"
      /> */}
    </div>
  );
}
