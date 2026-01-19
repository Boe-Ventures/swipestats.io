import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LatestPost } from "@/app/_components/post";
import { auth } from "@/server/better-auth";
import { getSession } from "@/server/better-auth/server";
import { trpc, HydrateClient, prefetch, trpcApi } from "@/trpc/server";

export default async function Home() {
  const caller = await trpcApi();
  const hello = await caller.post.hello({ text: "from tRPC" });
  const session = await getSession();

  if (session) {
    prefetch(trpc.post.getLatest.queryOptions());
  }

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            Swipe
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Stats
            </span>
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10"
              href="https://create.t3.gg/en/usage/first-steps"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">First Steps →</h3>
              <div className="text-lg text-gray-300">
                Just the basics - Everything you need to know to set up your
                database and authentication.
              </div>
            </Link>
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:bg-white/10"
              href="https://create.t3.gg/en/introduction"
              target="_blank"
            >
              <h3 className="text-2xl font-bold">Documentation →</h3>
              <div className="text-lg text-gray-300">
                Learn more about Create T3 App, the libraries it uses, and how
                to deploy it.
              </div>
            </Link>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl text-white">
              {hello ? hello.greeting : "Loading tRPC query..."}
            </p>

            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-center text-2xl text-white">
                {session && (
                  <span>
                    Logged in as{" "}
                    <span className="font-semibold text-purple-400">
                      {session.user?.name}
                    </span>
                    {session.user?.username && (
                      <span className="text-gray-400">
                        {" "}
                        (@{session.user.username})
                      </span>
                    )}
                    {session.user?.isAnonymous && (
                      <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-sm text-amber-400">
                        Guest
                      </span>
                    )}
                  </span>
                )}
              </p>
              {!session ? (
                <Link
                  href="/signin"
                  className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-10 py-3 font-semibold no-underline shadow-lg transition hover:from-purple-500 hover:to-pink-500"
                >
                  Sign In / Sign Up
                </Link>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {session.user?.isAnonymous && (
                    <Link
                      href="/signup"
                      className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-2 text-sm font-semibold no-underline shadow-lg transition hover:from-purple-500 hover:to-pink-500"
                    >
                      Create Account to Save Progress
                    </Link>
                  )}
                  <form>
                    <button
                      className="rounded-full border border-white/20 bg-white/5 px-10 py-3 font-semibold no-underline backdrop-blur-sm transition hover:bg-white/10"
                      formAction={async () => {
                        "use server";
                        await auth.api.signOut({
                          headers: await headers(),
                        });
                        redirect("/");
                      }}
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>

          {session?.user && <LatestPost />}
        </div>
      </main>
    </HydrateClient>
  );
}
