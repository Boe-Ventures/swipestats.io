import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Images,
  Layers2,
  LockKeyhole,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

import { marketingOgImage } from "@/lib/og-images";
import { CtaBand } from "../_components/CtaBand";
import {
  Eyebrow,
  GridBg,
  SectionHead,
  marketingButton,
} from "../_components/marketing-ui";
import { ProfileComparePreview } from "./ProfileComparePreview";

const START_HREF = "/try?source=profile_compare_landing";
const description =
  "Compare dating profile photos, prompts, and bios side by side. Build Tinder and Hinge profile variants, explore AI feedback, and start free with SwipeStats.";
const ogImage = marketingOgImage({
  title: "See your profile before someone else does.",
  path: "/profile-compare",
  variant: "centered",
});

export const metadata: Metadata = {
  title: "Dating Profile Compare: Photos, Prompts & Bios",
  description,
  alternates: { canonical: "/profile-compare" },
  openGraph: {
    title: "Your next first impression | SwipeStats",
    description,
    url: "/profile-compare",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "SwipeStats Profile Compare",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Your next first impression | SwipeStats",
    description,
    images: [ogImage],
  },
};

const features = [
  {
    icon: Images,
    title: "Find your opening photo",
    body: "Put your photos in a different order and see how the whole profile reads. Keep the adventure shot, try a clearer portrait first.",
  },
  {
    icon: MessageSquareText,
    title: "Give your words a second draft",
    body: "Compare a new bio or prompt answer with your original. See which version gives someone a better place to start a conversation.",
  },
  {
    icon: Layers2,
    title: "Keep your options side by side",
    body: "Build variants for Tinder and Hinge, or try different versions for the same app. Your photos stay together in one library.",
  },
];

const faqs = [
  {
    q: "Do I need my Tinder or Hinge data export?",
    a: "No. You can start with your photos and add prompts and a bio yourself. Importing your dating data is optional and can bring existing content into SwipeStats.",
  },
  {
    q: "Can I try it without signing up?",
    a: "Yes. The start button opens a guest workspace. Create an account when you want to keep access across browsers and devices.",
  },
  {
    q: "What is free, and what is paid?",
    a: "You can start a comparison and arrange profile variants for free. AI profile roasts and feedback require SwipeStats Plus or Elite; the editor shows the upgrade options before you generate them.",
  },
  {
    q: "Will my profile be public?",
    a: "Your comparison starts private. Publishing a comparison or sharing an AI roast is a separate choice. Review what you are sharing before you publish a link.",
  },
  {
    q: "Does this update my dating apps?",
    a: "No. This is a workspace for planning and reviewing your profile. You decide which changes to make, then apply them in the dating app yourself.",
  },
  {
    q: "Does this tell me which version will get more matches?",
    a: "No. Comparing layouts and getting AI feedback can help you make a more informed choice, but neither measures how people will respond. There is no guaranteed match increase or live A/B test on your dating apps.",
  },
];

function StartLink({
  children = "Build my profile",
  placement,
}: {
  children?: React.ReactNode;
  placement: string;
}) {
  return (
    <Link
      href={`${START_HREF}&placement=${placement}`}
      prefetch={false}
      className={marketingButton({ size: "lg" })}
    >
      {children}
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

export default function ProfileComparePage() {
  return (
    <>
      <section className="relative isolate py-14 sm:py-20 lg:py-24">
        <GridBg />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:px-8">
          <div className="min-w-0">
            <Eyebrow>SwipeStats / Profile Compare</Eyebrow>
            <h1 className="mt-5 max-w-xl text-[clamp(42px,5vw,68px)] leading-[1.02] font-bold tracking-[-0.045em] text-balance">
              See your profile before someone else does.
            </h1>
            <p className="text-muted-foreground mt-6 max-w-lg text-lg leading-relaxed">
              The right photos. A bio that sounds like you. A better opening
              line. Put your dating profiles side by side and decide what feels
              right.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <StartLink placement="hero" />
              <a
                href="#how-it-works"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold hover:text-rose-600"
              >
                See how it works <ArrowDown className="size-4" aria-hidden />
              </a>
            </div>
            <ul className="text-muted-foreground mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs">
              {[
                "Start free",
                "No data export needed",
                "Private until you publish",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-rose-600" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <ProfileComparePreview />
        </div>
      </section>

      <section className="border-border bg-muted/30 border-y py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHead
            eyebrow="Small changes. A different impression."
            title="Make the whole profile work together."
            lead="An excellent photo can still be the wrong opener. A good prompt can get lost in the mix. See the full story before you change it."
          />
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <article key={title}>
                <Icon
                  className="size-7 text-rose-600"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <h3 className="mt-5 text-xl font-semibold tracking-tight">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-3 text-base leading-relaxed">
                  {body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionHead
            eyebrow="From camera roll to a clearer choice"
            title="Start with the photos you already have."
          />
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              [
                "Bring your photos",
                "Open a guest workspace and add photos to your library. No waiting for a dating-app export.",
              ],
              [
                "Build a few versions",
                "Choose an app, arrange your photos, and add your prompts and bio. Try another order or another angle.",
              ],
              [
                "Choose what to change",
                "Compare the versions, get an optional AI second opinion, then update your dating app when you are ready.",
              ],
            ].map(([title, body], index) => (
              <li key={title} className="border-border border-t pt-5">
                <span className="font-mono text-sm text-rose-600">
                  0{index + 1}
                </span>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  {body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-gray-950 py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 font-mono text-xs tracking-wider text-rose-300 uppercase">
              <Sparkles className="size-4" aria-hidden />
              Optional AI feedback · Plus &amp; Elite
            </span>
            <h2 className="mt-5 text-[clamp(32px,4vw,46px)] leading-[1.08] font-bold tracking-tight text-balance">
              A second opinion with something to say.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-300">
              Get an AI profile roast that looks at your photos, prompts, and
              bio together. Use the suggestions that sound like you. Leave the
              rest.
            </p>
            <div className="mt-7">
              <StartLink placement="ai">Start with my profile</StartLink>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              Comparison is free to start. AI feedback is a paid feature.
            </p>
          </div>
          <ul className="divide-y divide-white/15">
            {[
              [
                "A role for every photo",
                "Keep, maybe, or cut suggestions, with an explanation of what each photo adds.",
              ],
              [
                "Words you can work with",
                "Alternative prompt answers and bio rewrites to help you get past the blank page.",
              ],
              [
                "A place to start",
                "Prioritized changes to consider, rather than a pile of disconnected opinions.",
              ],
            ].map(([title, body]) => (
              <li key={title} className="py-6 first:pt-0">
                <h3 className="text-xl font-semibold">{title}</h3>
                <p className="mt-2 leading-relaxed text-gray-300">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-[auto_1fr] lg:px-8">
          <LockKeyhole
            className="size-9 text-rose-600"
            strokeWidth={1.5}
            aria-hidden
          />
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight">
              Your work in progress stays yours.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
              Comparisons start private. You choose whether to publish a
              comparison or share a roast. Nothing changes on Tinder or Hinge
              until you make the change there yourself.
            </p>
            <Link
              href="/privacy"
              className="mt-4 inline-block text-sm font-semibold text-rose-600 underline underline-offset-4 dark:text-rose-400"
            >
              How SwipeStats handles your data
            </Link>
          </div>
        </div>
      </section>

      <section className="border-border bg-muted/30 border-t py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-6">
          <SectionHead
            eyebrow="A few things to know"
            title="Before you start."
          />
          <div className="divide-border mt-8 divide-y">
            {faqs.map((faq) => (
              <details key={faq.q} className="group py-5">
                <summary className="cursor-pointer text-base leading-relaxed font-semibold marker:text-rose-600">
                  {faq.q}
                </summary>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <CtaBand
          center
          eyebrow="Your next first impression"
          title="Make a profile that feels like you."
          lead="Bring your photos. Try a few versions. Take the next step when it feels right."
          actions={
            <StartLink placement="footer">Build my profile for free</StartLink>
          }
        />
      </section>
    </>
  );
}
