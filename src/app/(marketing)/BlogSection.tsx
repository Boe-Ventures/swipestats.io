import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export type BlogPost = {
  id: string;
  title: string;
  href: string;
  readTime: string;
  description: string;
  imageUrl: string;
  date: string;
  datetime: string;
  category: {
    title: "Article" | "Case-Study";
    href: string;
  };
  author: {
    name: string;
    role: string;
    href: string;
    imageUrl: string;
  };
};

export const posts: BlogPost[] = [
  {
    id: "1",
    title:
      "I analyzed hundreds of user’s Tinder data — including messages — so you don’t have to.",
    //href: "https://towardsdatascience.com/i-analyzed-hundreds-of-users-tinder-data-including-messages-so-you-dont-have-to-14c6dc4a5fdd",
    href: "https://medium.com/data-science/i-analyzed-hundreds-of-users-tinder-data-including-messages-so-you-dont-have-to-14c6dc4a5fdd",
    description:
      "The data is embarrassingly intimate, but reveals the most boring parts of ourselves we already knew. I read Modern Romance by Aziz Ansari in 2016 and beyond a shadow of a doubt, it is one of the most influential books I’ve ever read...",
    readTime: "13 min read",
    imageUrl: "/images/marketing/news/SwipestatsArticle.png",
    date: "Aug 10, 2021",
    datetime: "2021-08-10",
    category: { title: "Article", href: "#" },
    author: {
      name: "Alyssa Beatriz Fernandez",
      role: "Researcher for The Dallas Morning News",
      href: "https://www.linkedin.com/in/ffernandezalyssa/",
      imageUrl: "/images/marketing/news/alyssa-beatriz-fernandez.jpg",
    },
  },
  {
    id: "4",
    title: "Swiping Right on Data: Analyzing the Trends of Tinder",
    href: "https://medium.com/learning-data/swiping-right-on-data-analyzing-the-trends-of-tinder-7463509fbb5f",
    description:
      "An in-depth analysis exploring the differing experiences of men and women on Tinder. Using data from Swipestats.io, this study quantifies behavioral patterns, match rates, and provides data-driven insights to optimize Tinder profiles...",
    readTime: "8 min read",
    imageUrl: "/images/marketing/news/akshay-article-cover.webp",
    date: "Sep 26, 2023",
    datetime: "2023-09-26",
    category: { title: "Article", href: "#" },
    author: {
      name: "Akshay Singh",
      role: "Data Analyst",
      href: "https://medium.com/@akshaysingh_58048",
      imageUrl: "/images/marketing/news/akshay-singh.png",
    },
  },
  {
    id: "2",
    title: "Why do women have the Upper Hand on Tinder?",
    href: "https://thebolditalic.com/the-two-worlds-of-tinder-f1c34e800db4?gi=87ab2f7db817",
    description:
      "Explaining the two worlds of the dating app. Over the last decade, Tinder has redefined the online dating industry. The app has proven especially popular among young people, with three-quarters of those ages 18 to 24 reporting using the app at one point...",
    readTime: "6 min read",
    imageUrl: "/images/marketing/news/the-two-worlds-of-tinder.jpg",
    date: "Mar 8, 2021",
    datetime: "2021-03-08",
    category: { title: "Article", href: "#" },
    author: {
      name: "Brayden Gerrard",
      role: "Data Science & Statistics Instructor",
      href: "https://www.linkedin.com/in/brayden-gerrard",
      imageUrl: "/images/marketing/news/brayden-gerrard.jpg",
    },
  },
  {
    id: "3",
    title:
      "[OC] Despite being far more selective, women still match more frequently than men on Tinder",
    href: "https://www.reddit.com/r/dataisbeautiful/comments/mbf6wg/oc_despite_being_far_more_selective_women_still",
    description:
      "A reddit post with more than 12 000 upvotes and 1000+ comments",
    readTime: "4 min read",
    imageUrl: "/images/marketing/swipestats reddit.png",
    date: "Mar 23, 2021",
    datetime: "2021-03-23",
    category: { title: "Case-Study", href: "#" },
    author: {
      name: "raptorman556 @reddit",
      role: "SwipeStats Collaborator",
      href: "https://www.reddit.com/r/dataisbeautiful/comments/mbf6wg/oc_despite_being_far_more_selective_women_still/",
      imageUrl: "/images/marketing/news/Reddit_Mark_OnWhite.png",
    },
  },

  // More posts...
];

export function Blog() {
  return (
    <div id="blog" className="bg-white pt-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Link href={"/blog"}>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              SwipeStats in the press
            </h2>
          </Link>
          {/* <p className="mt-2 text-lg leading-8 text-gray-600">
            Learn how to grow your business with our expert advice.
          </p> */}
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {posts.slice(0, 3).map((post) => (
            <article
              key={post.id}
              className="flex flex-col items-start justify-between"
            >
              <div className="relative aspect-[16/9] w-full sm:aspect-[2/1] lg:aspect-[3/2]">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  className="rounded-2xl bg-gray-100 object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-gray-900/10 ring-inset" />
              </div>
              <div className="max-w-xl">
                <div className="mt-8 flex items-center gap-x-4 text-xs">
                  <time dateTime={post.datetime} className="text-gray-500">
                    {post.date}
                  </time>
                  <a
                    href={post.category.href}
                    className="relative z-10 rounded-full bg-gray-50 px-3 py-1.5 font-medium text-gray-600 hover:bg-gray-100"
                  >
                    {post.category.title}
                  </a>
                </div>
                <div className="group relative">
                  <h3 className="mt-3 text-lg leading-6 font-semibold text-gray-900 group-hover:text-gray-600">
                    <a href={post.href}>
                      <span className="absolute inset-0" />
                      {post.title}
                    </a>
                  </h3>
                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">
                    {post.description}
                  </p>
                </div>
                <div className="relative mt-8 flex items-center gap-x-4">
                  <Image
                    src={post.author.imageUrl}
                    alt={post.author.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full bg-gray-100"
                  />
                  <div className="text-sm leading-6">
                    <p className="font-semibold text-gray-900">
                      <a href={post.author.href}>
                        <span className="absolute inset-0" />
                        {post.author.name}
                      </a>
                    </p>
                    <p className="text-gray-600">{post.author.role}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="my-10 flex justify-center">
          <Link href={"/blog"}>
            <Button>See all blog posts and news articles</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Blog2() {
  return (
    <div className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            From the blog
          </h2>
          {/* <p className="mt-2 text-lg leading-8 text-gray-600">
            Learn how to grow your business with our expert advice.
          </p> */}
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl auto-rows-fr grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="relative isolate flex flex-col justify-end overflow-hidden rounded-2xl bg-gray-900 px-8 pt-80 pb-8 sm:pt-48 lg:pt-80"
            >
              {/* Background image with absolute positioning and overlay - img tag preferred for layout */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt=""
                className="absolute inset-0 -z-10 h-full w-full object-cover"
              />
              <div className="absolute inset-0 -z-10 bg-linear-to-t from-gray-900 via-gray-900/40" />
              <div className="absolute inset-0 -z-10 rounded-2xl ring-1 ring-gray-900/10 ring-inset" />

              <div className="flex flex-wrap items-center gap-y-1 overflow-hidden text-sm leading-6 text-gray-300">
                <time dateTime={post.datetime} className="mr-8">
                  {post.date}
                </time>
                <div className="-ml-4 flex items-center gap-x-4">
                  <svg
                    viewBox="0 0 2 2"
                    className="-ml-0.5 h-0.5 w-0.5 flex-none fill-white/50"
                  >
                    <circle cx={1} cy={1} r={1} />
                  </svg>
                  <div className="flex gap-x-2.5">
                    {/* Small decorative avatar in background layer - optimization overhead not justified */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.author.imageUrl}
                      alt=""
                      className="h-6 w-6 flex-none rounded-full bg-white/10"
                    />
                    {post.author.name}
                  </div>
                </div>
              </div>
              <h3 className="mt-3 text-lg leading-6 font-semibold text-white">
                <a href={post.href}>
                  <span className="absolute inset-0" />
                  {post.title}
                </a>
              </h3>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
