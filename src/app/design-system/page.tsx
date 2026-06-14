import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Eyebrow,
  SectionHead,
  GridBg,
  marketingButton,
} from "@/app/(marketing)/_components/marketing-ui";
import { NewsletterSignup } from "@/app/(marketing)/_components/NewsletterSignup";
import { Tabs, TabPanel } from "./Tabs";
// existing, in-production components (rendered live for the current-vs-golden diff)
import { MarketingCtaSection } from "@/app/(marketing)/MarketingCtaSection";
import NewsletterCTA from "@/app/(marketing)/NewsletterCTA";
import { StickyCtaCard } from "@/components/mdx/StickyCtaCard";
import { CtaCard } from "@/components/mdx/CtaCard";
import { CTA } from "@/components/mdx/CTA";
import { NewsletterCard } from "@/components/mdx/NewsletterCard";

/*
  Living design-system reference. Renders the REAL shipped components so we can
  iterate on them side by side. Three surfaces:
    - Marketing (rose)  — editorial: display type, white, roomy
    - Blog (amber)      — marketing mode + prose
    - App (indigo)      — functional: dense, gray-50, big tabular numbers
  Tags:
    ✓ shipped          — a real exported component, rendered live below
    📦 extract candidate — a pattern that exists inline in pages, not yet a component
    ✕ not built        — designed in golden.css, no repo equivalent yet
*/

type Surface = "marketing" | "blog" | "app" | "shared";

const surfaceStyles: Record<Surface, string> = {
  marketing: "bg-rose-50 text-rose-700 ring-rose-600/20",
  blog: "bg-amber-50 text-amber-700 ring-amber-600/20",
  app: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  shared: "bg-slate-100 text-slate-600 ring-slate-300",
};

function Tag({ surface }: { surface: Surface }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] ring-1 ring-inset",
        surfaceStyles[surface],
      )}
    >
      {surface}
    </span>
  );
}

type StatusKind = "current" | "shipped" | "candidate" | "not-built";

function Status({ kind }: { kind: StatusKind }) {
  const map = {
    current: { label: "● live today", cls: "text-blue-600" },
    shipped: { label: "✓ shipped (golden)", cls: "text-emerald-600" },
    candidate: { label: "📦 extract candidate", cls: "text-amber-600" },
    "not-built": { label: "✕ not built", cls: "text-gray-400" },
  } as const;
  return (
    <span className={cn("font-mono text-[11px] font-medium", map[kind].cls)}>
      {map[kind].label}
    </span>
  );
}

function Specimen({
  label,
  surface,
  status,
  note,
  dark,
  children,
}: {
  label: string;
  surface: Surface;
  status: StatusKind;
  note?: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <span className="font-mono text-[12px] font-semibold text-gray-900">
          {label}
        </span>
        <Tag surface={surface} />
        <span className="ml-auto">
          <Status kind={status} />
        </span>
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-4 p-6",
          dark ? "bg-gray-950" : "bg-white",
        )}
      >
        {children}
      </div>
      {note && (
        <p className="border-t border-gray-200 bg-gray-50 px-4 py-2.5 text-[12.5px] text-gray-500">
          {note}
        </p>
      )}
    </div>
  );
}

function SectionTitle({
  n,
  title,
  sub,
}: {
  n: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[13px] font-semibold text-rose-600">
          {n}
        </span>
        <h2 className="text-[24px] font-bold tracking-[-0.02em] text-gray-900">
          {title}
        </h2>
      </div>
      {sub && <p className="mt-2 max-w-[680px] text-[15px] text-gray-600">{sub}</p>}
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <>
      {/* top bar */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1216px] flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
          <span className="font-mono text-[13px] font-bold tracking-[-0.01em] text-gray-900">
            SwipeStats · Design System
          </span>
          <span className="hidden text-[13px] text-gray-400 sm:inline">
            living component reference
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Tag surface="marketing" />
            <Tag surface="blog" />
            <Tag surface="app" />
            <Tag surface="shared" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1216px] px-6 py-14">
        {/* intro */}
        <div className="max-w-[760px]">
          <Eyebrow>Design system</Eyebrow>
          <h1 className="mt-3.5 text-[clamp(34px,5vw,52px)] leading-[1.04] font-bold tracking-[-0.03em] text-balance text-gray-900">
            One foundation, three dialects
          </h1>
          <p className="mt-5 text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-600">
            Shared tokens (Inter + Geist Mono, rose-600 on cool gray, the rose
            eyebrow rhythm) expressed three ways: <strong>marketing</strong> runs
            bold &amp; editorial on white, <strong>blog</strong> is marketing
            mode + prose, and <strong>app</strong> runs dense &amp; functional on
            gray-50 with big tabular numbers. Everything below is rendered live
            from real components.
          </p>
        </div>

        <Tabs className="mt-14">
          <TabPanel id="current" label="Current · live today">
          {/* ============================ CURRENT (live today) */}
          <section>
            <SectionTitle
              n="00"
              title="Current — live on marketing & blog today"
              sub="The real, in-production CTA and newsletter components, rendered live. These are the status quo we're iterating away from toward the golden primitives below."
            />
            <div className="flex flex-col gap-5">
              <Specimen
                label="<MarketingCtaSection>"
                surface="marketing"
                status="current"
                note="src/app/(marketing)/MarketingCtaSection.tsx — home page. Hand-rolled <a> buttons, centered. Renders with its built-in pt-32."
              >
                <div className="relative isolate w-full">
                  <MarketingCtaSection />
                </div>
              </Specimen>

              <Specimen
                label="<NewsletterCTA>"
                surface="marketing"
                status="current"
                note="The full home/blog newsletter block (now backed by <NewsletterSignup>). Used on home, insights, directory & blog."
              >
                <div className="w-full">
                  <NewsletterCTA />
                </div>
              </Specimen>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Specimen
                label="<StickyCtaCard>"
                surface="blog"
                status="current"
                note="src/components/mdx/StickyCtaCard.tsx — blog sidebar sticky CTA (shown with default props)."
              >
                <div className="w-full max-w-sm">
                  <StickyCtaCard />
                </div>
              </Specimen>

              <Specimen
                label="<CtaCard>"
                surface="blog"
                status="current"
                note="src/components/mdx/CtaCard.tsx — in-article card CTA injected by <CtaInjector> (default props)."
              >
                <div className="w-full max-w-xl">
                  <CtaCard />
                </div>
              </Specimen>

              <Specimen
                label="<NewsletterCard>"
                surface="blog"
                status="current"
                note="src/components/mdx/NewsletterCard.tsx — in-article newsletter capture (default props)."
              >
                <div className="w-full max-w-xl">
                  <NewsletterCard />
                </div>
              </Specimen>

              <Specimen
                label="<CTA> (inline)"
                surface="blog"
                status="current"
                note="src/components/mdx/CTA.tsx — inline mid-article button."
              >
                <CTA label="Upload your data" href="/upload" />
                <CTA
                  label="How to request"
                  href="/how-to-request-your-data"
                  variant="secondary"
                />
              </Specimen>
              </div>
            </div>
          </section>

          </TabPanel>

          <TabPanel id="golden" label="Golden system">
          {/* ============================ BUTTONS */}
          <section>
            <SectionTitle
              n="01"
              title="Buttons"
              sub="Marketing CTAs and app controls are intentionally different components today. Blog reuses the marketing buttons."
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Specimen
                label="marketingButton"
                surface="marketing"
                status="shipped"
                note="src/app/(marketing)/_components/marketing-ui.tsx — variants: primary · ghost · white · bare; sizes: default · lg"
              >
                <button className={marketingButton({ variant: "primary" })}>
                  Primary
                </button>
                <button
                  className={marketingButton({ variant: "primary", size: "lg" })}
                >
                  Primary lg
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
                <button className={marketingButton({ variant: "ghost" })}>
                  Ghost
                </button>
                <button
                  className={marketingButton({ variant: "ghost", size: "lg" })}
                >
                  Ghost lg
                </button>
              </Specimen>

              <Specimen
                label="marketingButton · on dark"
                surface="marketing"
                status="shipped"
                dark
                note="white + bare variants live on dark bands (final CTA, reminder). bare = colour supplied inline (per-provider)."
              >
                <button
                  className={marketingButton({ variant: "white", size: "lg" })}
                >
                  White lg
                </button>
                <button
                  className={cn(
                    marketingButton({ variant: "bare", size: "lg" }),
                    "border border-white/20",
                  )}
                >
                  Bare + border
                </button>
                <button
                  className={marketingButton({ variant: "bare", size: "lg" })}
                  style={{ background: "oklch(0.63 0.21 18)", color: "#fff" }}
                >
                  Bare · Tinder
                </button>
              </Specimen>

              <Specimen
                label="<Button> (shadcn)"
                surface="app"
                status="shipped"
                note="src/components/ui/button.tsx — variants: default · secondary · outline · ghost · destructive · link; sizes: sm · default · lg"
              >
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </Specimen>

              <Specimen
                label="<Button> sizes + states"
                surface="app"
                status="shipped"
              >
                <Button size="sm">sm</Button>
                <Button size="default">default</Button>
                <Button size="lg">lg</Button>
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
              </Specimen>
            </div>
          </section>

          {/* ============================ TYPE & RHYTHM */}
          <section>
            <SectionTitle
              n="02"
              title="Eyebrow, headings & section rhythm"
              sub="The connective tissue of the brand: mono eyebrow → display/section heading → lead. Loud in marketing, quiet in the app."
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Specimen
                label="<SectionHead>"
                surface="marketing"
                status="shipped"
                note="<Eyebrow>, <SectionHead>, <GridBg> are all exported from marketing-ui."
              >
                <div className="w-full">
                  <SectionHead
                    eyebrow="Why it's different"
                    title="Real behavior, not self-reports"
                    lead="Eyebrow → balanced display heading → muted lead. The default left-aligned section opener used across marketing pages."
                  />
                </div>
              </Specimen>

              <Specimen
                label="Eyebrow variants"
                surface="shared"
                status="shipped"
              >
                <div className="flex w-full flex-col gap-5">
                  <Eyebrow>With rule</Eyebrow>
                  <Eyebrow noRule>No rule</Eyebrow>
                  <Eyebrow center>Centered (hero / pricing)</Eyebrow>
                </div>
              </Specimen>

              <Specimen
                label="Marketing type scale"
                surface="marketing"
                status="shipped"
                note="h-display clamp(40→68px), h2 clamp(30→46px), lead clamp(17→20px)."
              >
                <div className="w-full">
                  <p className="text-[clamp(40px,6vw,68px)] leading-[1.02] font-bold tracking-[-0.035em] text-gray-900">
                    Display
                  </p>
                  <p className="mt-2 text-[clamp(30px,4vw,46px)] leading-[1.06] font-bold tracking-[-0.03em] text-gray-900">
                    Section heading
                  </p>
                  <p className="mt-2 text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-600">
                    Lead paragraph — generous, editorial.
                  </p>
                </div>
              </Specimen>

              <Specimen
                label="App type scale"
                surface="app"
                status="not-built"
                note="golden.css app-mode: mono kicker + functional title (clamp 28→40px). Not yet a repo component."
              >
                <div className="w-full">
                  <span className="font-mono text-[11px] font-medium tracking-[0.07em] text-gray-500 uppercase">
                    Match rate · Tinder · all time
                  </span>
                  <p className="mt-1.5 text-[clamp(28px,3.4vw,40px)] leading-[1.04] font-bold tracking-[-0.03em] text-gray-900">
                    Your insights
                  </p>
                  <p className="mt-1.5 text-[15px] text-gray-600">
                    Quieter, denser — numbers do the talking.
                  </p>
                </div>
              </Specimen>
            </div>
          </section>

          {/* ============================ CTA BAND */}
          <section>
            <SectionTitle
              n="03"
              title="CTA band"
              sub="The dark rose-glow call-to-action. Appears at the end of /research and /how-to-request-your-data — identical markup in both, a clear extract candidate."
            />
            <Specimen
              label="Dark CTA band"
              surface="marketing"
              status="candidate"
              note="Inline in research/page.tsx + how-to/page.tsx. Candidate: <MarketingCtaBand eyebrow title lead actions />."
            >
              <div className="relative w-full overflow-hidden rounded-[28px] bg-gray-950 p-12 text-gray-100 max-[720px]:p-8">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-[200px] -right-[140px] h-[720px] w-[720px] rounded-full blur-[10px] [background:radial-gradient(circle,oklch(0.586_0.253_17.585/0.5),transparent_65%)]"
                />
                <div className="relative max-w-[600px]">
                  <Eyebrow noRule className="text-rose-500">
                    Ready?
                  </Eyebrow>
                  <h3 className="mt-3.5 text-[clamp(30px,4vw,46px)] leading-[1.06] font-bold tracking-[-0.03em] text-balance text-white">
                    See how you really date
                  </h3>
                  <p className="mt-4 text-[17px] leading-[1.6] text-gray-400">
                    Upload your export and get your insights in minutes. Free,
                    anonymous, open source.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3.5">
                    <button
                      className={marketingButton({
                        variant: "primary",
                        size: "lg",
                      })}
                    >
                      Upload data
                    </button>
                    <button
                      className={marketingButton({
                        variant: "white",
                        size: "lg",
                      })}
                    >
                      How to request your data
                    </button>
                  </div>
                </div>
              </div>
            </Specimen>
          </section>

          {/* ============================ NEWSLETTER */}
          <section>
            <SectionTitle
              n="04"
              title="Newsletter / email capture"
              sub="One shared <NewsletterSignup> drives the subscribe flow; presentation is passed in. Both presets are live below — try submitting."
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Specimen
                label="NewsletterSignup · home block"
                surface="marketing"
                status="shipped"
                dark
                note="The home-page dark block preset (used by <NewsletterCTA>)."
              >
                <div className="w-full">
                  <NewsletterSignup
                    topic="newsletter-general"
                    autoFetch={false}
                    formClassName="w-full max-w-md"
                    groupClassName="flex gap-x-4"
                    inputClassName="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2.5 text-white shadow-sm ring-1 ring-white/10 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-white focus:ring-inset sm:text-sm sm:leading-6"
                    buttonClassName="flex-none rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
                    buttonLabel="Notify me"
                  />
                </div>
              </Specimen>

              <Specimen
                label="NewsletterSignup · inline band"
                surface="marketing"
                status="shipped"
                dark
                note="The /how-to reminder-band preset — marketingButton submit, inline success chip."
              >
                <div className="w-full">
                  <NewsletterSignup
                    topic="newsletter-general"
                    autoFetch={false}
                    buttonLabel="Remind me"
                    placeholder="you@email.com"
                    formClassName="flex flex-col gap-2.5 sm:flex-row sm:items-center"
                    groupClassName="flex flex-col gap-2 sm:flex-row sm:items-center"
                    inputClassName="min-w-[220px] rounded-[10px] border border-white/[0.18] bg-white/[0.07] px-4 py-3 text-[14.5px] text-white placeholder:text-gray-500 focus:border-rose-600 focus:outline-none"
                    buttonClassName={marketingButton({
                      variant: "primary",
                      size: "lg",
                    })}
                    successClassName="flex items-center gap-3 rounded-[10px] border border-white/15 bg-white/[0.07] px-4 py-3 text-[14.5px] font-semibold text-white"
                    successLabel="You're on the list."
                  />
                </div>
              </Specimen>
            </div>
          </section>

          {/* ============================ MARKETING SECTIONS */}
          <section>
            <SectionTitle
              n="05"
              title="Reusable marketing sections"
              sub="Patterns that recur across marketing pages. Most are inline today — strong candidates to extract into shared section components."
            />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Specimen
                label="Hero with grid-bg"
                surface="marketing"
                status="candidate"
              >
                <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 p-8">
                  <GridBg />
                  <Eyebrow>Get started · 3 steps</Eyebrow>
                  <p className="mt-3 text-[28px] font-bold tracking-[-0.03em] text-gray-900">
                    Centered or left hero
                  </p>
                </div>
              </Specimen>

              <Specimen
                label="Stat tiles"
                surface="shared"
                status="candidate"
                note="Tile strip used in research hero + golden. Candidate: <StatTiles items />."
              >
                <div className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 sm:grid-cols-4">
                  {[
                    ["Total swipes", "38,608"],
                    ["Matches", "4,345"],
                    ["Msgs sent", "4,733"],
                    ["Avg response", "1h 9m"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white px-5 py-4">
                      <div className="font-mono text-[10.5px] tracking-[0.05em] text-gray-500 uppercase">
                        {k}
                      </div>
                      <div className="mt-1.5 text-[24px] font-bold tracking-[-0.03em] tabular-nums text-gray-900">
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </Specimen>

              <Specimen
                label="Cohort badge"
                surface="app"
                status="not-built"
                note="golden.css .cohort (top/good/mid). Needs cohort_stats data. Candidate: <CohortBadge tier />."
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[12.5px] font-semibold whitespace-nowrap text-amber-700">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Top 10% of men
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[12.5px] font-semibold text-emerald-700">
                  <CheckIcon className="h-3.5 w-3.5" />
                  Above average
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-[12.5px] font-semibold text-gray-600">
                  Locked
                </span>
              </Specimen>

              <Specimen
                label="FAQ accordion"
                surface="shared"
                status="candidate"
                note="<details> + plus→× chevron. Candidate: <FaqList items />."
              >
                <div className="w-full border-t border-gray-200">
                  {["Is my data anonymous?", "Does it cost anything?"].map(
                    (q, i) => (
                      <details
                        key={q}
                        open={i === 0}
                        className="group border-b border-gray-200"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-5 py-4 text-[16px] font-semibold text-gray-900 [&::-webkit-details-marker]:hidden">
                          {q}
                          <svg
                            className="h-[22px] w-[22px] flex-none text-rose-600 transition-transform group-open:rotate-45"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            aria-hidden
                          >
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </summary>
                        <p className="pb-4 text-[14.5px] leading-[1.7] text-gray-600">
                          Yes — identifiers are stripped in your browser before
                          anything is uploaded.
                        </p>
                      </details>
                    ),
                  )}
                </div>
              </Specimen>
            </div>
          </section>

          </TabPanel>

          <TabPanel id="coverage" label="Coverage">
          {/* ============================ ROADMAP */}
          <section>
            <SectionTitle
              n="06"
              title="Coverage & extraction backlog"
              sub="What's a real shared component today vs. what's still inline or unbuilt. This is the iteration list."
            />
            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-900">
                      Component
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-900">
                      Surface
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-900">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["MarketingCtaSection (legacy)", "marketing", "current"],
                      ["NewsletterCTA block", "marketing", "current"],
                      ["StickyCtaCard / CtaCard / CTA / NewsletterCard", "blog", "current"],
                      ["marketingButton", "marketing", "shipped"],
                      ["Eyebrow / SectionHead / GridBg", "shared", "shipped"],
                      ["NewsletterSignup", "marketing", "shipped"],
                      ["<Button> (shadcn)", "app", "shipped"],
                      ["MarketingCtaBand", "marketing", "candidate"],
                      ["StatTiles", "shared", "candidate"],
                      ["FaqList", "shared", "candidate"],
                      ["Provider / pricing cards", "marketing", "candidate"],
                      ["App-mode: hero-stats, panel, app-title", "app", "not-built"],
                      ["CohortBadge", "app", "not-built"],
                      ["Funnel / tiles / msg bubbles", "app", "not-built"],
                      ["Blog: prose, tldr, pullstat, cta-card", "blog", "not-built"],
                    ] as [string, Surface, StatusKind][]
                  ).map(([name, surface, status]) => (
                    <tr key={name} className="border-t border-gray-200">
                      <td className="px-4 py-3 font-mono text-[12.5px] text-gray-900">
                        {name}
                      </td>
                      <td className="px-4 py-3">
                        <Tag surface={surface} />
                      </td>
                      <td className="px-4 py-3">
                        <Status kind={status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          </TabPanel>
        </Tabs>

        <footer className="mt-20 border-t border-gray-200 pt-8 text-[13px] text-gray-500">
          <p>
            Internal reference · noindex ·{" "}
            <Link href="/research" className="font-semibold text-rose-600">
              /research
            </Link>{" "}
            and{" "}
            <Link
              href="/how-to-request-your-data"
              className="font-semibold text-rose-600"
            >
              /how-to-request-your-data
            </Link>{" "}
            already run on these primitives.
          </p>
        </footer>
      </main>
    </>
  );
}
