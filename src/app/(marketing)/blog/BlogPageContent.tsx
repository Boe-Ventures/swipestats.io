"use client";

import { useQueryState } from "nuqs";
import { useMemo } from "react";

import type { Post } from ".velite";
import { BlogGrid } from "./BlogGrid";
import { BlogSearch } from "./BlogSearch";

interface BlogPageContentProps {
  allPosts: readonly Post[];
  featuredSlugs: string[];
  title: string;
  description: string;
}

// Filter function to match posts against search query
function matchesSearch(post: Post, query: string): boolean {
  if (!query) return true;

  const searchLower = query.toLowerCase();
  return (
    post.h1.toLowerCase().includes(searchLower) ||
    post.h1Subtitle?.toLowerCase().includes(searchLower) ||
    post.category?.toLowerCase().includes(searchLower) ||
    post.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
    post.author.toLowerCase().includes(searchLower)
  );
}

// Filter function to match posts against selected tag (case-insensitive)
function matchesTag(post: Post, tag: string): boolean {
  if (!tag) return true;
  const tagLower = tag.toLowerCase();
  return post.tags.some((postTag) => postTag.toLowerCase() === tagLower);
}

// Filter function to match posts against selected category (case-insensitive)
function matchesCategory(post: Post, category: string): boolean {
  if (!category) return true;
  if (!post.category) return false;
  return post.category.toLowerCase() === category.toLowerCase();
}

export function BlogPageContent({
  allPosts,
  featuredSlugs,
  title,
  description,
}: BlogPageContentProps) {
  const [searchQuery] = useQueryState("q", { defaultValue: "" });
  const [selectedTag] = useQueryState("tag", { defaultValue: "" });
  const [selectedCategory] = useQueryState("category", { defaultValue: "" });

  // Get featured posts (always shown in featured section, regardless of filters)
  const featuredPosts = useMemo(() => {
    return featuredSlugs
      .map((slug) => allPosts.find((post) => post.slug === slug))
      .filter((post): post is NonNullable<typeof post> => post !== undefined);
  }, [allPosts, featuredSlugs]);

  // Filter ALL posts (including featured) based on search query, category, and tag
  // This makes featured posts searchable in the "All Posts" section
  const allFilteredPosts = useMemo(() => {
    return allPosts.filter(
      (post) =>
        matchesSearch(post, searchQuery) &&
        matchesCategory(post, selectedCategory) &&
        matchesTag(post, selectedTag),
    );
  }, [allPosts, searchQuery, selectedCategory, selectedTag]);

  // Regular posts: all filtered posts (featured posts can appear in grid when they match)
  // Featured posts are always shown in featured section AND can appear in grid if they match
  const regularPosts = allFilteredPosts;

  // Result count includes all posts that will be displayed in the grid
  // Featured posts are searchable and counted when they match filters
  const resultCount = regularPosts.length;

  return (
    <BlogGrid
      posts={regularPosts}
      title={title}
      description={description}
      showFeatured={featuredPosts.length > 0}
      featuredPosts={featuredPosts}
      searchComponent={
        <BlogSearch allPosts={allPosts} resultCount={resultCount} />
      }
    />
  );
}
