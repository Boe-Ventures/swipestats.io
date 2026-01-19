import Image from "next/image";
import Link from "next/link";
import { format, parseISO } from "date-fns";

import type { Post } from ".velite";

interface RelatedPostsProps {
  posts: readonly Post[];
  title?: string;
  description?: string;
  maxPosts?: number;
  basePath?: string;
}

// Simple hash function to generate a deterministic number from a string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Seeded random number generator (deterministic)
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export function RelatedPosts({
  posts,
  title = "Related Posts",
  description = "Continue reading with these related articles",
  maxPosts = 3,
  basePath = "/blog",
}: RelatedPostsProps) {
  // Deterministic shuffle based on post slugs and current date
  // Uses date so related posts vary day-to-day but are consistent within a day
  const shufflePosts = (array: readonly Post[]): Post[] => {
    const today = new Date().toISOString().split("T")[0]!;
    const seedString = today + array.map((p) => p.slug).join("");
    const seed = hashString(seedString);
    const random = seededRandom(seed);

    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
    return shuffled;
  };

  const displayPosts = shufflePosts(posts).slice(0, maxPosts);

  if (displayPosts.length === 0) {
    return null;
  }

  // Get display image (thumbnail or null for gradient fallback)
  const getDisplayImageUrl = (post: Post) => {
    // Use thumbnail if available
    if (post.thumbnail) {
      return post.thumbnail;
    }

    // Return null to use gradient fallback (more visual variety than OG)
    return null;
  };

  // Generate a gradient background for each post based on title
  const getGradientClasses = (title: string, index: number) => {
    const gradients = [
      "from-blue-400 to-purple-500",
      "from-purple-400 to-pink-500",
      "from-pink-400 to-red-500",
      "from-red-400 to-orange-500",
      "from-orange-400 to-yellow-500",
      "from-green-400 to-blue-500",
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance text-gray-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-2 text-lg leading-8 text-gray-600">{description}</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl auto-rows-fr grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {displayPosts.map((post, index) => {
            return (
              <article
                key={post.slug}
                className="group relative isolate flex flex-col justify-end overflow-hidden rounded-2xl bg-gray-900 px-8 pt-80 pb-8 transition-transform hover:scale-[1.02] sm:pt-48 lg:pt-80"
              >
                {/* Background image or gradient fallback */}
                {getDisplayImageUrl(post) ? (
                  <div
                    className="absolute inset-0 -z-10"
                    style={{
                      backgroundImage: `url(${getDisplayImageUrl(post)})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                ) : (
                  <div
                    className={`absolute inset-0 -z-10 bg-gradient-to-br ${getGradientClasses(
                      post.h1,
                      index,
                    )}`}
                  >
                    <div className="flex h-full items-center justify-center">
                      <div className="text-6xl font-bold text-white/20">
                        {post.h1.charAt(0)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-gray-900/40" />
                <div className="absolute inset-0 -z-10 rounded-2xl ring-1 ring-gray-900/10 ring-inset" />

                <div className="flex flex-wrap items-center gap-y-1 overflow-hidden text-sm leading-6 text-gray-300">
                  <time dateTime={post.publishedAt} className="mr-8">
                    {format(parseISO(post.publishedAt), "MMM dd, yyyy")}
                  </time>
                  {post.author && (
                    <div className="-ml-4 flex items-center gap-x-4">
                      <svg
                        viewBox="0 0 2 2"
                        className="-ml-0.5 size-0.5 flex-none fill-white/50"
                      >
                        <circle r={1} cx={1} cy={1} />
                      </svg>
                      <div className="flex gap-x-2.5">
                        <div className="flex size-6 flex-none items-center justify-center rounded-full bg-white/10">
                          <span className="text-xs font-semibold text-white">
                            {post.author.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span>{post.author}</span>
                      </div>
                    </div>
                  )}
                </div>

                <h3 className="mt-3 text-lg leading-6 font-semibold text-white">
                  <Link href={`${basePath}/${post.slug}`}>
                    <span className="absolute inset-0" />
                    <span className="transition-colors group-hover:text-blue-200">
                      {post.h1}
                    </span>
                  </Link>
                </h3>

                {post.h1Subtitle && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-300">
                    {post.h1Subtitle}
                  </p>
                )}

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-white/80"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
