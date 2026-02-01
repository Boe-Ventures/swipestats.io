"use client";

import { useQueryState } from "nuqs";
import { Search, X } from "lucide-react";
import { useTransition } from "react";

import type { Post } from "@velite";

interface BlogSearchProps {
  allPosts: readonly Post[];
  resultCount: number;
}

// Extract all unique tags from posts (case-insensitive deduplication)
function getAllTags(posts: readonly Post[]): string[] {
  const tagMap = new Map<string, string>(); // lowercase -> original casing
  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      const normalized = tag.toLowerCase();
      // Keep the first occurrence's casing for display
      if (!tagMap.has(normalized)) {
        tagMap.set(normalized, tag);
      }
    });
  });
  return Array.from(tagMap.values()).sort();
}

// Extract all unique categories from posts
function getAllCategories(posts: readonly Post[]): string[] {
  const categories = new Set<string>();
  posts.forEach((post) => {
    if (post.category) {
      categories.add(post.category);
    }
  });
  return Array.from(categories).sort();
}

export function BlogSearch({ allPosts, resultCount }: BlogSearchProps) {
  const [searchQuery, setSearchQuery] = useQueryState("q", {
    defaultValue: "",
  });
  const [selectedTag, setSelectedTag] = useQueryState("tag", {
    defaultValue: "",
  });
  const [selectedCategory, setSelectedCategory] = useQueryState("category", {
    defaultValue: "",
  });
  const [isPending, startTransition] = useTransition();

  const allTags = getAllTags(allPosts);
  const allCategories = getAllCategories(allPosts);
  const hasActiveFilters = searchQuery || selectedTag || selectedCategory;

  const handleSearchChange = (value: string) => {
    startTransition(() => {
      void setSearchQuery(value || null);
    });
  };

  const handleTagClick = (tag: string) => {
    startTransition(() => {
      void setSelectedTag(selectedTag === tag ? null : tag);
    });
  };

  const handleCategoryClick = (category: string) => {
    startTransition(() => {
      void setSelectedCategory(selectedCategory === category ? null : category);
    });
  };

  const handleClearAll = () => {
    startTransition(() => {
      void setSearchQuery(null);
      void setSelectedTag(null);
      void setSelectedCategory(null);
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search className="size-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search posts by title, description, category, tags, or author..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 bg-white py-3 pr-12 pl-11 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none sm:text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange("")}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 transition-colors hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Category Filters - Flat Layout */}
      {allCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Category:</span>
          {allCategories.map((category) => {
            const isActive =
              selectedCategory?.toLowerCase() === category.toLowerCase();
            return (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category}
              </button>
            );
          })}
          {selectedCategory && (
            <button
              onClick={() => handleCategoryClick(selectedCategory)}
              className="text-sm font-medium text-pink-600 transition-colors hover:text-pink-700"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Results Info & Clear Button - Flat Layout */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-600">
          {isPending ? (
            <span className="opacity-50">Searching...</span>
          ) : (
            <>
              Showing{" "}
              <span className="font-semibold text-gray-900">{resultCount}</span>{" "}
              {resultCount === 1 ? "post" : "posts"}
              {hasActiveFilters && (
                <span className="text-gray-500"> (filtered)</span>
              )}
            </>
          )}
        </p>
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="text-sm font-medium text-pink-600 transition-colors hover:text-pink-700"
          >
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}
