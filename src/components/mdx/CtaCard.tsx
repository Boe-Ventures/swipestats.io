import { ButtonLink } from "@/components/ui/button";

interface Feature {
  label: string;
  description?: string;
}

interface CtaCardProps {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  features?: Feature[];
}

const FUNNEL_STEPS = [
  { label: "Swipes", pct: 100 },
  { label: "Matches", pct: 47 },
  { label: "Chats", pct: 28 },
  { label: "Dates", pct: 12 },
];

function MiniFunnelViz() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2.5">
      {FUNNEL_STEPS.map((step) => (
        <div key={step.label} className="flex items-center gap-3">
          <span className="w-16 text-right text-sm font-medium text-gray-500">
            {step.label}
          </span>
          <div className="relative h-5 flex-1">
            <div
              className="h-full rounded-sm bg-linear-to-r from-rose-400 to-rose-600"
              style={{ width: `${step.pct}%` }}
            />
          </div>
          <span className="w-10 text-sm text-gray-400 tabular-nums">
            {step.pct}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function CtaCard({
  title = "Matches drop off a cliff?",
  description = "Check your Tinder or Hinge data and get your dating funnel in seconds.",
  buttonText = "Analyze My Data (Free)",
  buttonHref = "/upload",
}: CtaCardProps) {
  return (
    <section className="not-prose relative my-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-shadow hover:shadow-xl">
      <div className="relative z-10 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
        {/* Left: Copy + CTA */}
        <div className="flex-1">
          <h2 className="text-[1.75rem] leading-[110%] font-bold tracking-tight text-gray-900">
            {title}
          </h2>
          <p className="mt-2.5 text-lg leading-[160%] text-gray-700">
            {description}
          </p>
          <div className="mt-5">
            <ButtonLink href={buttonHref} size="lg">
              {buttonText}
            </ButtonLink>
          </div>
        </div>

        {/* Right: Funnel visualization (desktop only) */}
        <div className="hidden sm:block sm:w-64">
          <MiniFunnelViz />
        </div>
      </div>

      {/* Subtle gradient blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 z-0 translate-x-[40%] translate-y-[43%] rotate-12 select-none"
      >
        <div className="size-[38rem] rounded-full bg-linear-to-br from-[#ff4694] to-[#E11D48] opacity-20 blur-3xl" />
      </div>
    </section>
  );
}
