import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/mdx/ProductCard";
import { SponsorCard } from "@/components/mdx/SponsorCard";
import { CtaCard } from "@/components/mdx/CtaCard";
import { StickyCtaCard } from "@/components/mdx/StickyCtaCard";
import { BLOG_PRODUCT_KEYS } from "@/lib/blog-products";
import { PREVIEW_PAID_SPONSOR_CAMPAIGN } from "@/lib/sponsorship";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog product-card preview",
  description: "Non-production preview of SwipeStats blog product cards.",
  robots: { index: false, follow: false },
};

export default function BlogProductCardsPreviewPage() {
  const isPreviewEnabled =
    process.env.NODE_ENV === "development" ||
    process.env.VERCEL_ENV === "preview";

  if (!isPreviewEnabled) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-100 text-gray-950">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
          <div className="font-mono text-[11px] font-semibold tracking-[0.12em] text-rose-600 uppercase">
            Non-production · MDX specimens
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            Blog product cards
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-600">
            The actual reusable cards intended for manual placement in
            high-performing posts. Each one can be rendered in MDX with a single
            product key.
          </p>
          <code className="mt-6 inline-flex rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-[12px] text-gray-700">
            {'<ProductCard product="profile-compare" />'}
          </code>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
              01 · Product-aware
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
              Manual MDX variants
            </h2>
          </div>
          <p className="hidden max-w-sm text-right text-sm leading-6 text-gray-500 md:block">
            Same shell, different promise and a miniature preview of the real
            destination surface.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          {BLOG_PRODUCT_KEYS.map((product) => (
            <div key={product} className="mb-12">
              <div className="mb-3 flex items-center gap-3">
                <span className="font-mono text-[11px] font-semibold tracking-[0.08em] text-gray-500 uppercase">
                  {product}
                </span>
                <span className="h-px flex-1 bg-gray-200" />
              </div>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
          <div className="font-mono text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
            02 · Sponsorship
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
            House and paid campaigns
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            The house card sells the placement using SwipeStats audience proof.
            A paid campaign keeps the shell but carries its own sponsor
            identity, destination, and reporting.
          </p>

          <div className="mx-auto mt-10 max-w-3xl">
            <SponsorCard />
            <SponsorCard campaign={PREVIEW_PAID_SPONSOR_CAMPAIGN} />
          </div>
        </div>
      </section>

      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
          <div className="font-mono text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
            03 · In context
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
            Inside an article
          </h2>

          <article className="mx-auto mt-10 max-w-3xl text-[17px] leading-[1.75] text-gray-700">
            <h3 className="text-2xl font-bold tracking-[-0.025em] text-gray-950">
              Your prompt should make replying easy
            </h3>
            <p className="mt-4">
              The best answers give someone a clear conversational handle. A
              specific place, opinion, or small challenge works better than a
              polished sentence that could belong to anyone.
            </p>

            <ProductCard product="prompt-assistant" />

            <h3 className="mt-12 text-2xl font-bold tracking-[-0.025em] text-gray-950">
              Specific beats impressive
            </h3>
            <p className="mt-4">
              You do not need to sound extraordinary. You need to sound like a
              real person with enough texture for another person to respond.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <div className="font-mono text-[11px] font-semibold tracking-[0.1em] text-gray-400 uppercase">
          04 · Current system
        </div>
        <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
          Fallback cards for comparison
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
          These are the existing generic auto-injected card and the wide-screen
          sidebar card. They remain useful as the long-tail fallback.
        </p>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <CtaCard />
          <StickyCtaCard />
        </div>
      </section>
    </main>
  );
}
