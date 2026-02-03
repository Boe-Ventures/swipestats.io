/**
 * Blog author definitions
 * Separated from velite.config.ts to avoid Turbopack parsing issues
 */

export const AUTHOR_KEYS = ["kristian", "paw", "joe"] as const;
export type AuthorKey = (typeof AUTHOR_KEYS)[number];

export type Author = {
  name: string;
  image: string;
  description: string;
  instagram?: string;
  email?: string;
};

// `satisfies` ensures the object keys match AuthorKey at compile time
export const AUTHORS = {
  kristian: {
    name: "Kristian",
    image: "/images/blog/authors/kris.png",
    description: "Founder of SwipeStats.io",
    instagram: "https://www.instagram.com/swipestats.io",
    email: "kris@swipestats.io",
  },
  paw: {
    name: "Paw",
    image: "/images/blog/authors/paw.avif",
    description: "Dating Expert at SwipeStats.io",
    instagram: "https://www.instagram.com/pawvej",
    email: "paw@swipestats.io",
  },
  joe: {
    name: "Joe Buchoff",
    image: "/images/blog/authors/joe.png",
    description: "Founder of GetDates.io",
    instagram: "https://www.instagram.com/getdates.io",
    email: "joe@getdates.io",
  },
} as const satisfies Record<AuthorKey, Author>;
