import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
} from "@heroicons/react/20/solid";
import { cn } from "@/components/ui/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { SmartLink } from "@/components/ui/smart-link";
import {
  Eyebrow,
  SectionHead,
  marketingButton,
} from "@/app/(marketing)/_components/marketing-ui";
import { NewsletterSignup } from "@/app/(marketing)/_components/NewsletterSignup";
import { CtaBand } from "@/app/(marketing)/_components/CtaBand";
import { FaqList } from "@/app/(marketing)/_components/FaqList";
// shared shadcn foundation (the other ~85%, surfaced live)
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SimpleSelect } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  InfoAlert,
  SuccessAlert,
  WarningAlert,
  ErrorAlert,
} from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SimpleDialog } from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  AppPageHeader,
  Panel,
  PanelHeader,
  HeroStats,
  CohortBadge,
  StatTiles,
  Funnel,
  PercentileBars,
  Prose,
  Tldr,
  PullStat,
} from "@/components/golden";
import { LayoutSwitch } from "./LayoutSwitch";
import { ToastDemo } from "./Demos";
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

type StatusKind =
  | "current"
  | "golden"
  | "shadcn"
  | "candidate"
  | "not-built";

function Status({ kind }: { kind: StatusKind }) {
  const map = {
    current: { label: "● live today", cls: "text-blue-600" },
    golden: { label: "✓ golden", cls: "text-emerald-600" },
    shadcn: { label: "◆ shadcn", cls: "text-violet-600" },
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
                note="src/app/(marketing)/_components/CtaBand.tsx · used on /golden; extract target for research + how-to."
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
                note="The full home/blog block · now backed by <NewsletterSignup>."
              >
                <div className="w-full">
                  <NewsletterCTA />
                </div>
              </Specimen>
              <Specimen
                label="Golden newsletter block"
                surface="marketing"
                status="golden"
                note="The full golden band (eyebrow → heading → copy → shared NewsletterSignup) · the like-for-like replacement for the block on the left."
              >
                <div className="relative w-full overflow-hidden rounded-3xl bg-gray-950 p-10 text-white max-[720px]:p-7">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-[180px] -right-[120px] h-[600px] w-[600px] rounded-full blur-[10px] [background:radial-gradient(circle,oklch(0.586_0.253_17.585/0.5),transparent_65%)]"
                  />
                  <div className="relative grid grid-cols-1 items-center gap-7 md:grid-cols-[1fr_auto]">
                    <div>
                      <Eyebrow noRule className="text-rose-500">
                        Don&apos;t lose track
                      </Eyebrow>
                      <h3 className="mt-3 text-[24px] font-bold tracking-[-0.02em] text-white">
                        Get a reminder when to upload
                      </h3>
                      <p className="mt-2.5 max-w-[440px] text-[14.5px] text-gray-400">
                        Data requests take a day or two. Leave your email and
                        we&apos;ll nudge you when it&apos;s time to upload.
                      </p>
                    </div>
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
                note="src/app/(marketing)/_components/marketing-ui.tsx · primary · ghost · white · bare × default · lg"
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
                note="src/components/ui/button.tsx · the app surface keeps this; default · secondary · outline · ghost · destructive · link"
              >
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </Specimen>
              <Specimen
                label="Links & loading · the canonical pattern"
                surface="shared"
                status="golden"
                note="ButtonLink = link styled as a button (icon+text safe). Button loading renders <Spinner>. asChild merges styles onto any element. SmartLink = inline text link."
              >
                <ButtonLink href="/upload" size="sm">
                  <ArrowRightIcon className="h-4 w-4" />
                  ButtonLink
                </ButtonLink>
                <Button size="sm" loading>
                  Loading
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href="#ds-links">asChild &lt;a&gt;</a>
                </Button>
                <span className="text-sm text-gray-600">
                  Inline <SmartLink href="/privacy">SmartLink</SmartLink> in
                  copy.
                </span>
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ BLOG CTA FAMILY */}
          <section>
            <SectionTitle
              n="04"
              title="Blog CTA family"
              sub="Consolidated onto the golden system: flat rose marketingButton, gray neutrals, and the shared NewsletterSignup. Same public props, golden styling."
            />
            <LayoutSwitch defaultLayout="grid">
              <Specimen
                label="StickyCtaCard"
                surface="blog"
                status="golden"
                note="src/components/mdx/StickyCtaCard.tsx · sidebar sticky CTA"
              >
                <div className="w-full max-w-sm">
                  <StickyCtaCard />
                </div>
              </Specimen>
              <Specimen
                label="CtaCard"
                surface="blog"
                status="golden"
                note="src/components/mdx/CtaCard.tsx · in-article card (CtaInjector)"
              >
                <div className="w-full max-w-xl">
                  <CtaCard />
                </div>
              </Specimen>
              <Specimen
                label="NewsletterCard"
                surface="blog"
                status="golden"
                note="src/components/mdx/NewsletterCard.tsx · now renders the shared NewsletterSignup"
              >
                <div className="w-full max-w-xl">
                  <NewsletterCard />
                </div>
              </Specimen>
              <Specimen
                label="CTA (inline)"
                surface="blog"
                status="golden"
                note="src/components/mdx/CTA.tsx · inline mid-article button"
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
              sub="The shared vocabulary, with no legacy counterpart. These are the building blocks: loud in marketing, quiet in the app."
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
                note="src/app/(marketing)/_components/FaqList.tsx · details accordion, used on /golden."
              >
                <div className="w-full">
                  <FaqList
                    items={[
                      {
                        q: "Is my data actually anonymous?",
                        a: "Yes · identifiers are stripped in your browser before anything is uploaded.",
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

          {/* ============================ FOUNDATION BANNER */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-6">
            <h2 className="text-[20px] font-bold tracking-[-0.02em] text-gray-900">
              Shared foundation{" "}
              <span className="font-medium text-gray-400">
                · the shadcn library under ~85% of the app
              </span>
            </h2>
            <p className="mt-1.5 max-w-[760px] text-[14px] text-gray-600">
              These render with zero data. The golden marketing system sits on
              top of this layer; the app surface uses it directly. Rendered live
              from <span className="font-mono text-[13px]">src/components/ui</span>.
            </p>
          </div>

          {/* ============================ FORMS */}
          <section>
            <SectionTitle
              n="06"
              title="Form controls"
              sub="The biggest category missing until now. Every control renders standalone, no data deps."
            />
            <LayoutSwitch defaultLayout="grid">
              <Specimen
                label="Text inputs"
                surface="shared"
                status="shadcn"
                note="input.tsx · textarea.tsx · label.tsx"
              >
                <div className="flex w-full flex-col gap-3">
                  <div>
                    <Label htmlFor="ds-email">Email</Label>
                    <Input
                      id="ds-email"
                      placeholder="you@email.com"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ds-msg">Message</Label>
                    <Textarea
                      id="ds-msg"
                      placeholder="Type something…"
                      className="mt-1.5"
                    />
                  </div>
                  <Input disabled placeholder="Disabled input" />
                </div>
              </Specimen>
              <Specimen
                label="Toggles & choices"
                surface="shared"
                status="shadcn"
                note="checkbox · switch · radio-group · toggle-group"
              >
                <div className="flex w-full flex-col gap-4">
                  <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
                    <Checkbox defaultChecked /> Email me a reminder
                  </label>
                  <label className="flex items-center gap-2.5 text-[14px] text-gray-700">
                    <Switch defaultChecked /> Share anonymously
                  </label>
                  <RadioGroup defaultValue="tinder" className="flex gap-5">
                    <label className="flex items-center gap-2 text-[14px] text-gray-700">
                      <RadioGroupItem value="tinder" /> Tinder
                    </label>
                    <label className="flex items-center gap-2 text-[14px] text-gray-700">
                      <RadioGroupItem value="hinge" /> Hinge
                    </label>
                  </RadioGroup>
                  <ToggleGroup type="single" defaultValue="week">
                    <ToggleGroupItem value="day">Day</ToggleGroupItem>
                    <ToggleGroupItem value="week">Week</ToggleGroupItem>
                    <ToggleGroupItem value="month">Month</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </Specimen>
              <Specimen
                label="Select"
                surface="shared"
                status="shadcn"
                note="select.tsx (SimpleSelect)"
              >
                <SimpleSelect
                  placeholder="Pick a provider"
                  options={[
                    { value: "tinder", label: "Tinder" },
                    { value: "hinge", label: "Hinge" },
                    { value: "bumble", label: "Bumble" },
                  ]}
                />
              </Specimen>
              <Specimen
                label="Buttons · sizes & state"
                surface="app"
                status="shadcn"
                note="button.tsx"
              >
                <Button size="sm">sm</Button>
                <Button size="default">default</Button>
                <Button size="lg">lg</Button>
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ FEEDBACK */}
          <section>
            <SectionTitle
              n="07"
              title="Feedback & states"
              sub="Alerts, toasts, and loading/empty states: the system's reactions, previously unrepresented."
            />
            <LayoutSwitch defaultLayout="grid">
              <Specimen
                label="Alerts"
                surface="shared"
                status="shadcn"
                note="alert.tsx · Info / Success / Warning / Error helpers (+ 3 more)"
              >
                <div className="flex w-full flex-col gap-3">
                  <InfoAlert>Your export is processing.</InfoAlert>
                  <SuccessAlert>Insights are ready to view.</SuccessAlert>
                  <WarningAlert>Bumble can take up to 30 days.</WarningAlert>
                  <ErrorAlert>Couldn&apos;t parse the uploaded file.</ErrorAlert>
                </div>
              </Specimen>
              <Specimen
                label="Toasts (Sonner)"
                surface="shared"
                status="shadcn"
                note="toast.tsx · click to fire each type"
              >
                <ToastDemo />
              </Specimen>
              <Specimen
                label="Skeleton + Progress"
                surface="shared"
                status="shadcn"
                note="skeleton.tsx · progress.tsx · loading states"
              >
                <div className="flex w-full flex-col gap-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Progress value={62} className="mt-1" />
                </div>
              </Specimen>
              <Specimen
                label="Empty state"
                surface="shared"
                status="shadcn"
                note="empty.tsx · compound empty/zero-data state"
              >
                <div className="w-full">
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>No profiles yet</EmptyTitle>
                      <EmptyDescription>
                        Upload your export to see your insights here.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ OVERLAYS */}
          <section>
            <SectionTitle
              n="08"
              title="Overlays"
              sub="Dialogs, sheets, popovers, and menus: the entire interactive overlay family. Click any trigger."
            />
            <LayoutSwitch defaultLayout="grid">
              <Specimen
                label="Dialog / Sheet / Drawer"
                surface="app"
                status="shadcn"
                note="dialog.tsx (SimpleDialog) · sheet.tsx · drawer.tsx"
              >
                <SimpleDialog
                  title="Delete profile?"
                  description="This permanently removes your uploaded data."
                  trigger={<Button variant="outline">Open dialog</Button>}
                >
                  <p className="text-sm text-gray-600">Dialog body content.</p>
                </SimpleDialog>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">Open sheet</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Filters</SheetTitle>
                      <SheetDescription>Refine the directory.</SheetDescription>
                    </SheetHeader>
                  </SheetContent>
                </Sheet>
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline">Open drawer</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Quick actions</DrawerTitle>
                      <DrawerDescription>
                        Mobile-friendly bottom drawer.
                      </DrawerDescription>
                    </DrawerHeader>
                  </DrawerContent>
                </Drawer>
              </Specimen>
              <Specimen
                label="Popover / Tooltip / Menu"
                surface="app"
                status="shadcn"
                note="popover.tsx · tooltip.tsx · dropdown-menu.tsx"
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline">Popover</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <p className="text-sm text-gray-600">Popover content.</p>
                  </PopoverContent>
                </Popover>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Tooltip</Button>
                    </TooltipTrigger>
                    <TooltipContent>Helpful hint</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Menu</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Specimen>
              <Specimen
                label="Accordion"
                surface="shared"
                status="shadcn"
                note="accordion.tsx (radix · distinct from the golden FaqList)"
              >
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="a">
                    <AccordionTrigger>Is my data anonymous?</AccordionTrigger>
                    <AccordionContent>
                      Yes, identifiers are stripped in your browser.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="b">
                    <AccordionTrigger>Does it cost anything?</AccordionTrigger>
                    <AccordionContent>Seeing your insights is free.</AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Specimen>
              <Specimen
                label="Tabs"
                surface="app"
                status="shadcn"
                note="tabs.tsx · the app's section switcher"
              >
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="usage">Daily usage</TabsTrigger>
                    <TabsTrigger value="chats">Conversations</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="pt-3 text-sm text-gray-600">
                    Overview panel.
                  </TabsContent>
                  <TabsContent value="usage" className="pt-3 text-sm text-gray-600">
                    Daily usage panel.
                  </TabsContent>
                  <TabsContent value="chats" className="pt-3 text-sm text-gray-600">
                    Conversations panel.
                  </TabsContent>
                </Tabs>
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ CARDS & BADGES */}
          <section>
            <SectionTitle
              n="09"
              title="Cards, badges & avatars"
              sub="The base of almost every app surface, shown standalone for the first time."
            />
            <LayoutSwitch defaultLayout="grid">
              <Specimen
                label="Card anatomy"
                surface="app"
                status="shadcn"
                note="card.tsx · Header / Title / Description / Content / Footer slots"
              >
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Match rate</CardTitle>
                    <CardDescription>Tinder · all time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="text-3xl font-bold tracking-tight tabular-nums">
                      19.9%
                    </span>
                  </CardContent>
                  <CardFooter>
                    <Button size="sm" variant="outline">
                      View details
                    </Button>
                  </CardFooter>
                </Card>
              </Specimen>
              <Specimen
                label="Badge variants"
                surface="shared"
                status="shadcn"
                note="badge.tsx · default / secondary / destructive / outline"
              >
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </Specimen>
              <Specimen
                label="Avatar"
                surface="shared"
                status="shadcn"
                note="avatar.tsx"
              >
                <Avatar>
                  <AvatarFallback>KB</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>SS</AvatarFallback>
                </Avatar>
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ APP-MODE GOLDEN */}
          <section>
            <SectionTitle
              n="10"
              title="App-mode golden primitives"
              sub="The app dialect, now built: big hero stat, cohort badge, stat tiles, panel, funnel. Quiet chrome, loud numbers."
            />
            <LayoutSwitch defaultLayout="stack">
              <Specimen
                label="<HeroStats>"
                surface="app"
                status="golden"
                note="src/components/golden/app.tsx — the page-opening headline number + supporting grid."
              >
                <HeroStats
                  lead={{
                    kicker: "Match rate · Tinder · all time",
                    value: "19.9%",
                    sub: "4,345 matches from 38,608 swipes",
                  }}
                  stats={[
                    { k: "Total swipes", v: "38,608" },
                    { k: "Matches", v: "4,345" },
                    { k: "Msgs sent", v: "4,733" },
                    { k: "Avg response", v: "1h 9m" },
                  ]}
                />
              </Specimen>
              <Specimen
                label="<StatTiles> + <CohortBadge>"
                surface="app"
                status="golden"
                note="Tile strip with up/down deltas, and the cohort standing pill (top / good / mid)."
              >
                <div className="flex w-full flex-col gap-4">
                  <StatTiles
                    items={[
                      { k: "Total swipes", v: "38,608" },
                      { k: "Matches", v: "4,345", d: "↑ 12% vs cohort", trend: "up" },
                      { k: "Ghosted", v: "42%", d: "↓ worse", trend: "down" },
                      { k: "Avg response", v: "1h 9m" },
                    ]}
                  />
                  <div className="flex flex-wrap gap-2">
                    <CohortBadge tier="top" icon={<SparklesIcon />}>
                      Top 10% of men
                    </CohortBadge>
                    <CohortBadge tier="good" icon={<CheckIcon />}>
                      Above average
                    </CohortBadge>
                    <CohortBadge tier="mid">Median</CohortBadge>
                  </div>
                </div>
              </Specimen>
              <Specimen
                label="<Funnel> + <PercentileBars>"
                surface="app"
                status="golden"
                note="src/components/golden/data-viz.tsx — the dating funnel + how-you-compare bars. (Full charts stay in InsightsShowcase / Recharts.)"
              >
                <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
                  <Funnel
                    steps={[
                      { label: "Swiped right", value: "21,875", width: "100%" },
                      { label: "Matches", value: "4,345", width: "62%", drop: "−80% drop-off" },
                      { label: "Chats", value: "1,265", width: "32%", drop: "−71%" },
                      {
                        label: "No reply",
                        value: "3,080",
                        width: "20%",
                        color: "var(--color-gray-400)",
                      },
                    ]}
                  />
                  <PercentileBars
                    rows={[
                      { name: "Women", width: "89%", value: "28.7%" },
                      {
                        name: "Non-binary",
                        width: "32%",
                        value: "9.4%",
                        color: "oklch(0.55 0.16 295)",
                      },
                      {
                        name: "Men",
                        width: "14%",
                        value: "4.6%",
                        color: "oklch(0.62 0.1 200)",
                      },
                    ]}
                  />
                </div>
              </Specimen>
              <Specimen
                label="<AppPageHeader> + <Panel>"
                surface="app"
                status="golden"
                note="The app type scale (mono kicker + functional title) and the panel/card chrome."
              >
                <div className="flex w-full flex-col gap-4">
                  <AppPageHeader
                    kicker="Dashboard · Tinder"
                    title="Your insights"
                    sub="How you really swipe, match, and message."
                    actions={
                      <Button size="sm" variant="outline">
                        Share
                      </Button>
                    }
                  />
                  <Panel>
                    <PanelHeader title="Conversation outcomes" meta="386 chats" />
                    <p className="text-[13px] text-gray-500">
                      Panel chrome: title + mono meta, neutral surface, subtle
                      border.
                    </p>
                  </Panel>
                </div>
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ BLOG-PROSE GOLDEN */}
          <section>
            <SectionTitle
              n="11"
              title="Blog-prose golden primitives"
              sub="Editorial mode: the prose scale plus the inline callouts (TL;DR, pull-stat)."
            />
            <LayoutSwitch defaultLayout="grid">
              <Specimen
                label="<Prose>"
                surface="blog"
                status="golden"
                note="src/components/golden/blog.tsx — wraps MDX/article body with the golden type scale."
              >
                <Prose>
                  <h2>What the data actually says</h2>
                  <p>
                    Across <strong>7,000+ profiles</strong>, the median match
                    rate tells a clear story.{" "}
                    <a href="#ds-prose">See the dataset</a>.
                  </p>
                  <ul>
                    <li>Women match roughly 6× more often than men</li>
                    <li>Response time predicts conversation length</li>
                  </ul>
                  <h3>By the numbers</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Gender</th>
                        <th>Match rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Women</td>
                        <td>28.7%</td>
                      </tr>
                      <tr>
                        <td>Men</td>
                        <td>4.6%</td>
                      </tr>
                    </tbody>
                  </table>
                </Prose>
              </Specimen>
              <Specimen
                label="<Tldr> + <PullStat>"
                surface="blog"
                status="golden"
                note="The rose TL;DR callout and the left-border pull-stat for in-article emphasis."
              >
                <div className="flex w-full flex-col gap-6">
                  <Tldr
                    items={[
                      "Real behavior, not self-reports",
                      <>
                        Women match <strong>6×</strong> more often than men
                      </>,
                      "Response time is the strongest signal",
                    ]}
                  />
                  <PullStat
                    value="965k+"
                    label="YouTube views generated from the dataset"
                  />
                </div>
              </Specimen>
            </LayoutSwitch>
          </section>

          {/* ============================ COVERAGE */}
          <section>
            <SectionTitle
              n="12"
              title="Coverage & extraction backlog"
              sub="From a full sweep of 160 marketing + 49 app + 53 shadcn files (389 patterns). This table is itself rendered on the shadcn <Table> primitive (dogfooding)."
            />
            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Surface</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(
                    [
                      ["MarketingCtaSection (legacy)", "marketing", "current"],
                      ["NewsletterCTA block", "marketing", "current"],
                      ["marketingButton", "marketing", "golden"],
                      ["Spinner + Button (shadcn spec)", "shared", "golden"],
                      ["Eyebrow / SectionHead / GridBg", "shared", "golden"],
                      ["NewsletterSignup", "marketing", "golden"],
                      ["CtaBand (research + how-to + golden)", "marketing", "golden"],
                      ["FaqList", "shared", "golden"],
                      ["Blog CTAs (Sticky/Cta/CTA/Newsletter)", "blog", "golden"],
                      ["Compare dialogs → Field/Controller", "app", "golden"],
                      ["Form controls (input/select/toggles)", "shared", "shadcn"],
                      ["Feedback (alert/toast/skeleton/empty)", "shared", "shadcn"],
                      ["Overlays (dialog/sheet/popover/menu)", "shared", "shadcn"],
                      ["Card / Badge / Avatar", "shared", "shadcn"],
                      ["StatTiles", "shared", "candidate"],
                      ["Provider / pricing cards", "marketing", "candidate"],
                      ["Insights cards (CohortBenchmark/Percentile)", "app", "candidate"],
                      ["File-upload / dropzone + stepper", "upload", "candidate"],
                      ["Auth forms (sign-in/up/reset)", "app", "candidate"],
                      ["App-mode (HeroStats/CohortBadge/StatTiles/Panel)", "app", "golden"],
                      ["Data-viz: Funnel / PercentileBars", "app", "golden"],
                      ["Blog: Prose / Tldr / PullStat", "blog", "golden"],
                      ["App shell (AppHeader / sidebar)", "app", "not-built"],
                      ["Data-viz: charts (InsightsShowcase) · Mapbox", "app", "candidate"],
                      ["Error / 404 / dark-mode / a11y states", "shared", "not-built"],
                    ] as [string, Surface, StatusKind][]
                  ).map(([name, surface, status]) => (
                    <TableRow key={name}>
                      <TableCell className="font-mono text-[12.5px] text-gray-900">
                        {name}
                      </TableCell>
                      <TableCell>
                        <Tag surface={surface} />
                      </TableCell>
                      <TableCell>
                        <Status kind={status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
