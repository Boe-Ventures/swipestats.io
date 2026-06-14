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
  marketingButton,
} from "@/app/(marketing)/_components/marketing-ui";
import { NewsletterSignup } from "@/app/(marketing)/_components/NewsletterSignup";
import { CtaBand } from "@/app/(marketing)/_components/CtaBand";
import { FaqList } from "@/app/(marketing)/_components/FaqList";
import { LayoutSwitch } from "./LayoutSwitch";
// existing, in-production components (rendered live for the current-vs-golden diff)
import { MarketingCtaSection } from "@/app/(marketing)/MarketingCtaSection";
import NewsletterCTA from "@/app/(marketing)/NewsletterCTA";
import { StickyCtaCard } from "@/components/mdx/StickyCtaCard";
import { CtaCard } from "@/components/mdx/CtaCard";
import { CTA } from "@/components/mdx/CTA";
import { NewsletterCard } from "@/components/mdx/NewsletterCard";

/*
  Living design-system reference. Renders the REAL components so we can iterate
  side by side. Each section toggles between stack / grid / horizontal-scroll.
  Surfaces: marketing (rose) · blog (amber) · app (indigo) · shared (slate).
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

type StatusKind = "current" | "golden" | "candidate" | "not-built";

function Status({ kind }: { kind: StatusKind }) {
  const map = {
    current: { label: "● live today", cls: "text-blue-600" },
    golden: { label: "✓ golden", cls: "text-emerald-600" },
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
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <Status kind={status} />
        <span className="font-mono text-[12px] font-semibold text-gray-900">
          {label}
        </span>
        <span className="ml-auto">
          <Tag surface={surface} />
        </span>
      </div>
      <div
        className={cn(
          "flex flex-1 flex-wrap items-center gap-4 p-6",
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
    <div className="mb-5">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[13px] font-semibold text-rose-600">
          {n}
        </span>
        <h2 className="text-[24px] font-bold tracking-[-0.02em] text-gray-900">
          {title}
        </h2>
      </div>
      {sub && (
        <p className="mt-2 max-w-[760px] text-[15px] text-gray-600">{sub}</p>
      )}
    </div>
  );
}

/* golden specimens reused in a couple of places ---------------------------- */

function GoldenCtaBand() {
  return (
    <div className="w-full">
      <CtaBand
        eyebrow="Ready?"
        title="See how you really date"
        lead="Upload your export and get your insights in minutes. Free, anonymous, open source."
        actions={
          <>
            <button
              className={marketingButton({ variant: "primary", size: "lg" })}
            >
              Upload data
            </button>
            <button
              className={marketingButton({ variant: "white", size: "lg" })}
            >
              How to request your data
            </button>
          </>
        }
      />
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
            live today → golden, side by side
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
            Live today, next to golden
          </h1>
          <p className="mt-5 text-[clamp(17px,2vw,20px)] leading-[1.6] text-gray-600">
            The real in-production components rendered next to their golden-system
            equivalents. Use the <strong>Stack / Grid / Scroll</strong> toggle on
            each section to compare them the way that reads best.
          </p>
        </div>

        <div className="mt-14 flex flex-col gap-16">
          {/* ============================ MARKETING CTA */}
          <section>
            <SectionTitle
              n="01"
              title="Marketing CTA"
              sub="The end-of-page call to action. Today: hand-rolled <a> buttons, faint blob. Golden: the dark rose-glow band with marketingButton."
            />
            <LayoutSwitch defaultLayout="stack">
              <Specimen
                label="MarketingCtaSection"
                surface="marketing"
                status="current"
                note="src/app/(marketing)/MarketingCtaSection.tsx · home page"
              >
                <div className="relative isolate w-full">
                  <MarketingCtaSection />
                </div>
              </Specimen>
              <Specimen
                label="<CtaBand>"
                surface="marketing"
                status="golden"
                note="src/app/(marketing)/_components/CtaBand.tsx — used on /golden; extract target for research + how-to."
              >
                <GoldenCtaBand />
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ NEWSLETTER */}
          <section>
            <SectionTitle
              n="02"
              title="Newsletter / email capture"
              sub="The home block is already golden-backed (it renders <NewsletterSignup>). Same flow, two presentations."
            />
            <LayoutSwitch defaultLayout="stack">
              <Specimen
                label="NewsletterCTA block"
                surface="marketing"
                status="current"
                note="The full home/blog block — now backed by <NewsletterSignup>."
              >
                <div className="w-full">
                  <NewsletterCTA />
                </div>
              </Specimen>
              <Specimen
                label="NewsletterSignup · inline band"
                surface="marketing"
                status="golden"
                dark
                note="The /how-to reminder-band preset of the same shared component."
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
            </LayoutSwitch>
          </section>

          {/* ============================ BUTTONS */}
          <section>
            <SectionTitle
              n="03"
              title="Buttons"
              sub="Marketing CTAs today are a mix of rose-gradient pills and hand-rolled flat <a>s. Golden replaces both with one marketingButton."
            />
            <LayoutSwitch defaultLayout="grid">
              <Specimen
                label="Today · gradient + hand-rolled"
                surface="marketing"
                status="current"
                note="CTA.tsx uses a from-rose-600 → rose-700 gradient; MarketingCtaSection hand-rolls flat rose <a>s."
              >
                <CTA label="Upload your data" href="/upload" />
                <a className="rounded-md bg-rose-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm">
                  Hand-rolled flat
                </a>
              </Specimen>
              <Specimen
                label="Golden · marketingButton"
                surface="marketing"
                status="golden"
                note="src/app/(marketing)/_components/marketing-ui.tsx — primary · ghost · white · bare × default · lg"
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
              </Specimen>
              <Specimen
                label="Golden · on dark"
                surface="marketing"
                status="golden"
                dark
                note="white + bare variants for dark bands; bare takes colour inline (per-provider)."
              >
                <button
                  className={marketingButton({ variant: "white", size: "lg" })}
                >
                  White lg
                </button>
                <button
                  className={marketingButton({ variant: "bare", size: "lg" })}
                  style={{ background: "oklch(0.63 0.21 18)", color: "#fff" }}
                >
                  Bare · Tinder
                </button>
              </Specimen>
              <Specimen
                label="App · <Button> (shadcn)"
                surface="app"
                status="golden"
                note="src/components/ui/button.tsx — the app surface keeps this; default · secondary · outline · ghost · destructive · link"
              >
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ BLOG CTA FAMILY */}
          <section>
            <SectionTitle
              n="04"
              title="Blog CTA family"
              sub="Four separate in-article CTA components today, no golden equivalent yet — a strong consolidation target onto the marketing primitives."
            />
            <LayoutSwitch defaultLayout="grid">
              <Specimen
                label="StickyCtaCard"
                surface="blog"
                status="current"
                note="src/components/mdx/StickyCtaCard.tsx — sidebar sticky CTA"
              >
                <div className="w-full max-w-sm">
                  <StickyCtaCard />
                </div>
              </Specimen>
              <Specimen
                label="CtaCard"
                surface="blog"
                status="current"
                note="src/components/mdx/CtaCard.tsx — in-article card (CtaInjector)"
              >
                <div className="w-full max-w-xl">
                  <CtaCard />
                </div>
              </Specimen>
              <Specimen
                label="NewsletterCard"
                surface="blog"
                status="current"
                note="src/components/mdx/NewsletterCard.tsx — in-article capture"
              >
                <div className="w-full max-w-xl">
                  <NewsletterCard />
                </div>
              </Specimen>
              <Specimen
                label="CTA (inline)"
                surface="blog"
                status="current"
                note="src/components/mdx/CTA.tsx — inline mid-article button (gradient)"
              >
                <CTA label="Upload your data" href="/upload" />
                <CTA
                  label="How to request"
                  href="/how-to-request-your-data"
                  variant="secondary"
                />
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ GOLDEN PRIMITIVES */}
          <section>
            <SectionTitle
              n="05"
              title="Golden primitives"
              sub="The shared vocabulary — no legacy counterpart, these are the building blocks. Loud in marketing, quiet in the app."
            />
            <LayoutSwitch defaultLayout="grid">
              <Specimen
                label="<SectionHead> + Eyebrow"
                surface="shared"
                status="golden"
                note="<Eyebrow>, <SectionHead>, <GridBg> exported from marketing-ui."
              >
                <div className="w-full">
                  <SectionHead
                    eyebrow="Why it's different"
                    title="Real behavior, not self-reports"
                    lead="Eyebrow → balanced display heading → muted lead."
                  />
                </div>
              </Specimen>
              <Specimen
                label="App type scale"
                surface="app"
                status="not-built"
                note="golden.css app-mode: mono kicker + functional title. Not yet a repo component."
              >
                <div className="w-full">
                  <span className="font-mono text-[11px] font-medium tracking-[0.07em] text-gray-500 uppercase">
                    Match rate · Tinder · all time
                  </span>
                  <p className="mt-1.5 text-[clamp(28px,3.4vw,40px)] leading-[1.04] font-bold tracking-[-0.03em] text-gray-900">
                    Your insights
                  </p>
                </div>
              </Specimen>
              <Specimen
                label="Stat tiles"
                surface="shared"
                status="candidate"
                note="Tile strip (research hero + golden). Candidate: <StatTiles>."
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
                label="<FaqList>"
                surface="shared"
                status="golden"
                note="src/app/(marketing)/_components/FaqList.tsx — details accordion, used on /golden."
              >
                <div className="w-full">
                  <FaqList
                    items={[
                      {
                        q: "Is my data actually anonymous?",
                        a: "Yes — identifiers are stripped in your browser before anything is uploaded.",
                      },
                      {
                        q: "Does it cost anything?",
                        a: "Uploading and seeing your insights is free.",
                      },
                    ]}
                  />
                </div>
              </Specimen>
              <Specimen
                label="Cohort badge"
                surface="app"
                status="not-built"
                note="golden.css .cohort (top/good/mid). Candidate: <CohortBadge>."
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[12.5px] font-semibold whitespace-nowrap text-amber-700">
                  <SparklesIcon className="h-3.5 w-3.5" />
                  Top 10% of men
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[12.5px] font-semibold text-emerald-700">
                  <CheckIcon className="h-3.5 w-3.5" />
                  Above average
                </span>
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ COVERAGE */}
          <section>
            <SectionTitle
              n="06"
              title="Coverage & extraction backlog"
              sub="What's a real shared component vs. still inline or unbuilt — the iteration list."
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
                      [
                        "StickyCtaCard / CtaCard / CTA / NewsletterCard",
                        "blog",
                        "current",
                      ],
                      ["marketingButton", "marketing", "golden"],
                      ["Eyebrow / SectionHead / GridBg", "shared", "golden"],
                      ["NewsletterSignup", "marketing", "golden"],
                      ["CtaBand", "marketing", "golden"],
                      ["FaqList", "shared", "golden"],
                      ["<Button> (shadcn)", "app", "golden"],
                      ["StatTiles", "shared", "candidate"],
                      ["Provider / pricing cards", "marketing", "candidate"],
                      [
                        "App-mode: hero-stats, panel, app-title",
                        "app",
                        "not-built",
                      ],
                      ["CohortBadge", "app", "not-built"],
                      [
                        "Blog: prose, tldr, pullstat, cta-card",
                        "blog",
                        "not-built",
                      ],
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
        </div>

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
