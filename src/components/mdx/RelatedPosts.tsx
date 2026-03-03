import Link from "next/link";

import type { Post } from "@velite";

interface RelatedPostsProps {
  posts: readonly Post[];
  maxPosts?: number;
  basePath?: string;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export function RelatedPosts({
  posts,
  maxPosts = 4,
  basePath = "/blog",
}: RelatedPostsProps) {
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

  return (
    <div>
      <hr />
      <h2>Keep Reading</h2>
      <ul>
        {displayPosts.map((post) => (
          <li key={post.slug}>
            <Link href={`${basePath}/${post.slug}`}>
              {post.h1}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
