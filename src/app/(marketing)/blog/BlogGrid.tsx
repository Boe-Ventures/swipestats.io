import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { AUTHORS, type AuthorKey } from "@/lib/blog-authors";
import { Card, CardContent } from "@/components/ui/card";

import type { Post } from ".velite";

interface BlogGridProps {
  posts: readonly Post[];
  title?: string;
  description?: string;
  showFeatured?: boolean;
  featuredPosts?: readonly Post[];
  basePath?: string;
  searchComponent?: React.ReactNode;
}

// Moved outside component to avoid recreation on every render
function getDisplayImageUrl(post: Post): string {
  // Priority 1: Use thumbnail if available
  if (post.thumbnail) {
    return post.thumbnail;
  }
  // Priority 2: Generate display OG image
  const title = encodeURIComponent(post.h1);
  const tag = post.category || post.tags[0] || "dating";
  return `/api/og/display?title=${title}&tag=${encodeURIComponent(tag)}`;
}

// Extract author component to eliminate duplication
function AuthorInfo({
  author,
  authorImage,
  theme = "light",
  className = "mt-8",
}: {
  author: string;
  authorImage?: string;
  theme?: "light" | "dark";
  className?: string;
}) {
  const isDark = theme === "dark";

  return (
    <div
      className={`relative flex cursor-pointer items-center gap-x-4 transition-opacity hover:opacity-70 ${className}`}
    >
      {authorImage ? (
        <Image
          src={
            authorImage.startsWith("/")
              ? authorImage
              : `/images/people/${authorImage}`
          }
          alt={author}
          width={40}
          height={40}
          className={`size-10 flex-none rounded-full object-cover ring-2 ${
            isDark ? "ring-white/20" : "ring-white"
          }`}
        />
      ) : (
        <div
          className={`flex size-10 flex-none items-center justify-center rounded-full ${
            isDark
              ? "bg-white/10"
              : "bg-gradient-to-br from-blue-500 to-purple-600"
          }`}
        >
          <span className="text-sm font-semibold text-white">
            {author.charAt(0)}
          </span>
        </div>
      )}
      <div className="text-sm leading-6">
        <p
          className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {author}
        </p>
        <p className={isDark ? "text-gray-300" : "text-gray-600"}>Author</p>
      </div>
    </div>
  );
}

// Blog Card Component with Image
function BlogCard({
  post,
  basePath = "/blog",
}: {
  post: Post;
  basePath?: string;
}) {
  return (
    <article className="group flex flex-col items-start justify-between">
      <Link
        href={`${basePath}/${post.slug}`}
        className="relative w-full transition-transform group-hover:scale-[1.02]"
      >
        <Image
          src={getDisplayImageUrl(post)}
          alt={post.h1}
          width={640}
          height={360}
          className="aspect-video w-full rounded-2xl object-cover sm:aspect-[2/1] lg:aspect-[3/2]"
        />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-gray-900/10 ring-inset" />
      </Link>

      <div className="flex max-w-xl grow flex-col justify-between">
        <div className="mt-8 flex flex-wrap items-center gap-2 text-xs">
          <time dateTime={post.publishedAt} className="text-gray-500">
            {format(parseISO(post.publishedAt), "MMM dd, yyyy")}
          </time>
          {post.category && (
            <span className="relative z-10 rounded-full bg-rose-100 px-3 py-1.5 font-semibold text-rose-700">
              {post.category}
            </span>
          )}
          {(post.tags || []).map((tag: string) => (
            <span
              key={tag}
              className="relative z-10 rounded-full bg-gray-50 px-3 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="relative grow">
          <h3 className="mt-3 text-lg leading-6 font-semibold text-gray-900">
            <Link
              href={`${basePath}/${post.slug}`}
              className="hover:text-gray-600"
            >
              {post.h1}
            </Link>
          </h3>
          {(post.h1Subtitle || post.metaDescription) && (
            <Link
              href={`${basePath}/${post.slug}`}
              className="mt-5 line-clamp-3 block text-sm leading-6 text-gray-600 hover:text-gray-900"
            >
              {post.h1Subtitle || post.metaDescription}
            </Link>
          )}
        </div>

        <AuthorInfo
          author={post.author}
          authorImage={AUTHORS[post.author].image}
        />
      </div>
    </article>
  );
}

// Blog Card Component without Image (Simple)
function BlogCardSimple({
  post,
  basePath = "/blog",
}: {
  post: Post;
  basePath?: string;
}) {
  return (
    <article className="flex max-w-xl flex-col items-start justify-between">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <time dateTime={post.publishedAt} className="text-gray-500">
          {format(parseISO(post.publishedAt), "MMM dd, yyyy")}
        </time>
        {post.category && (
          <span className="relative z-10 rounded-md bg-gradient-to-r from-pink-600 to-rose-600 px-3 py-1.5 font-bold text-white shadow-sm">
            {post.category}
          </span>
        )}
        {(post.tags || []).map((tag: string) => (
          <span
            key={tag}
            className="relative z-10 rounded-full bg-gray-50 px-3 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            #{tag}
          </span>
        ))}
      </div>
      <div className="group relative grow">
        <h3 className="mt-3 text-lg leading-6 font-semibold text-gray-900 group-hover:text-gray-600">
          <Link href={`${basePath}/${post.slug}`}>
            <span className="absolute inset-0" />
            {post.h1}
          </Link>
        </h3>
        {(post.h1Subtitle || post.metaDescription) && (
          <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">
            {post.h1Subtitle || post.metaDescription}
          </p>
        )}
      </div>
      <div className="relative mt-8 flex items-center gap-x-4 justify-self-end">
        {AUTHORS[post.author].image ? (
          <Image
            src={
              AUTHORS[post.author].image.startsWith("/")
                ? AUTHORS[post.author].image
                : `/images/people/${AUTHORS[post.author].image}`
            }
            alt={post.author}
            width={40}
            height={40}
            className="size-10 rounded-full bg-gray-50"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-gray-50">
            <span className="text-sm font-semibold text-gray-600">
              {post.author.charAt(0)}
            </span>
          </div>
        )}
        <div className="text-sm leading-6">
          <p className="font-semibold text-gray-900">
            <span className="absolute inset-0" />
            {post.author}
          </p>
          <p className="text-gray-600">Author</p>
        </div>
      </div>
    </article>
  );
}

export function BlogGrid({
  posts,
  title = "From the blog",
  description = "Learn how to grow your business with our expert advice.",
  showFeatured = false,
  featuredPosts = [],
  basePath = "/blog",
  searchComponent,
}: BlogGridProps) {
  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            {description}
          </p>
        </div>

        {/* Featured Posts Section - Isolated, not affected by search */}
        {showFeatured && featuredPosts.length > 0 && (
          <div className="space-y-6 border-b border-gray-200 pb-12">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Featured Posts
              </h2>
              <p className="text-muted-foreground mt-1">
                Our most popular and impactful content
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Main Featured Post - Left Side */}
              {featuredPosts[0] && (
                <article className="group relative isolate flex flex-col justify-end overflow-hidden rounded-xl bg-gray-900 px-6 pt-80 pb-6 shadow-lg transition-shadow hover:shadow-xl lg:row-span-2 lg:px-8 lg:pb-8">
                  {/* Background display image */}
                  <div
                    className="absolute inset-0 -z-10"
                    style={{
                      backgroundImage: `url(${getDisplayImageUrl(featuredPosts[0])})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 -z-10 bg-gray-900/60 mix-blend-multiply" />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-gray-900/70" />
                  <div className="absolute inset-0 -z-10 rounded-xl ring-1 ring-gray-900/10 ring-inset" />
                  <div className="flex flex-wrap items-center gap-2 overflow-hidden text-sm leading-6 text-gray-300">
                    <time
                      dateTime={featuredPosts[0].publishedAt}
                      className="mr-4"
                    >
                      {format(
                        parseISO(featuredPosts[0].publishedAt),
                        "MMM dd, yyyy",
                      )}
                    </time>
                    {featuredPosts[0].category && (
                      <span className="relative z-10 cursor-pointer rounded-full bg-rose-500/80 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-rose-500">
                        {featuredPosts[0].category}
                      </span>
                    )}
                    {featuredPosts[0].tags.length > 0 &&
                      featuredPosts[0].tags.map((tag) => (
                        <span
                          key={tag}
                          className="relative z-10 cursor-pointer rounded-full bg-gray-50/10 px-3 py-1.5 font-medium text-gray-300 transition-colors hover:bg-gray-50/30 hover:text-white"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                  <h3 className="mt-6 text-3xl leading-tight font-semibold text-white sm:text-4xl sm:leading-tight">
                    <Link
                      href={`${basePath}/${featuredPosts[0].slug}`}
                      className="transition-colors hover:text-blue-200"
                    >
                      {featuredPosts[0].h1}
                    </Link>
                  </h3>
                  {(featuredPosts[0].h1Subtitle ||
                    featuredPosts[0].metaDescription) && (
                    <Link
                      href={`${basePath}/${featuredPosts[0].slug}`}
                      className="mt-4 line-clamp-3 block text-lg leading-relaxed text-gray-300 hover:text-white"
                    >
                      {featuredPosts[0].h1Subtitle ||
                        featuredPosts[0].metaDescription}
                    </Link>
                  )}

                  <AuthorInfo
                    author={featuredPosts[0].author}
                    authorImage={
                      AUTHORS[featuredPosts[0].author].image
                    }
                    theme="dark"
                    className="mt-6"
                  />
                </article>
              )}

              {/* Right Side - Two Smaller Featured Posts */}
              {featuredPosts.slice(1, 3).map((post) => (
                <article
                  key={post.slug}
                  className="group relative isolate flex flex-col justify-end overflow-hidden rounded-xl bg-gray-900 px-6 pt-60 pb-6 shadow-lg transition-shadow hover:shadow-xl lg:pt-32"
                >
                  {/* Background display image */}
                  <div
                    className="absolute inset-0 -z-10"
                    style={{
                      backgroundImage: `url(${getDisplayImageUrl(post)})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 -z-10 bg-gray-900/60 mix-blend-multiply" />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-gray-900/70" />
                  <div className="absolute inset-0 -z-10 rounded-xl ring-1 ring-gray-900/10 ring-inset" />
                  <div className="flex flex-wrap items-center gap-2 overflow-hidden text-sm leading-6 text-gray-300">
                    <time dateTime={post.publishedAt} className="mr-2">
                      {format(parseISO(post.publishedAt), "MMM dd, yyyy")}
                    </time>
                    {post.category && (
                      <span className="relative z-10 cursor-pointer rounded-full bg-rose-500/80 px-3 py-1.5 font-semibold text-white transition-colors hover:bg-rose-500">
                        {post.category}
                      </span>
                    )}
                    {post.tags.length > 0 &&
                      post.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="relative z-10 cursor-pointer rounded-full bg-gray-50/10 px-3 py-1.5 font-medium text-gray-300 transition-colors hover:bg-gray-50/30 hover:text-white"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                  <h3 className="mt-4 text-xl leading-tight font-semibold text-white sm:text-2xl sm:leading-tight">
                    <Link
                      href={`${basePath}/${post.slug}`}
                      className="transition-colors hover:text-blue-200"
                    >
                      {post.h1}
                    </Link>
                  </h3>
                  {(post.h1Subtitle || post.metaDescription) && (
                    <Link
                      href={`${basePath}/${post.slug}`}
                      className="mt-3 line-clamp-2 block text-sm leading-relaxed text-gray-300 hover:text-white"
                    >
                      {post.h1Subtitle || post.metaDescription}
                    </Link>
                  )}

                  <AuthorInfo
                    author={post.author}
                    authorImage={AUTHORS[post.author].image}
                    theme="dark"
                    className="mt-4"
                  />
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Regular Posts Grid */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">All Posts</h2>
            <p className="text-muted-foreground mt-1">
              Browse our complete collection of articles and guides
            </p>
          </div>

          {/* Search Component - Always visible */}
          {searchComponent}

          {posts.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-3">
              {posts.map((post) => (
                <BlogCardSimple
                  key={post.slug}
                  post={post}
                  basePath={basePath}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-16">
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
                <svg
                  className="mx-auto size-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  No posts found
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Try adjusting your search or filter to find what you&apos;re
                  looking for.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
