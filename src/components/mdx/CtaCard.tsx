import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

interface Feature {
  label: string;
  description?: string;
}

interface CtaCardProps {
  title: string;
  description: string;
  buttonText: string;
  buttonHref: string;
  features?: Feature[];
}

export function CtaCard({
  title,
  description,
  buttonText,
  buttonHref,
  features,
}: CtaCardProps) {
  // Default features if none provided
  const defaultFeatures: Feature[] = [
    {
      label: "100% Free",
      description: "No credit card required, ever",
    },
    {
      label: "Anonymous & Private",
      description: "Your data is processed securely and never shared",
    },
    {
      label: "Compare with Demographics",
      description: "See how you stack up against others worldwide",
    },
    {
      label: "Instant Insights",
      description: "Get your personalized dating statistics in seconds",
    },
  ];

  const displayFeatures = features || defaultFeatures;

  return (
    <section className="not-prose relative my-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg transition-shadow hover:shadow-xl">
      {/* Content - positioned relatively to be above gradient */}
      <div className="relative z-10 p-6 sm:p-8">
        {/* Title */}
        <h2 className="text-[1.75rem] leading-[110%] font-bold tracking-tight text-gray-900">
          {title}
        </h2>

        {/* Description */}
        <div className="mt-2.5 text-lg leading-[160%] text-gray-700">
          <p>{description}</p>
        </div>

        {/* Features list */}
        <ul className="mt-5 space-y-2.5">
          {displayFeatures.map((feature, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <span className="mt-0.5 block flex-none">
                <Check className="size-5 text-emerald-600" strokeWidth={2.5} />
              </span>
              <span className="block flex-1 text-[15px] leading-relaxed">
                <span className="font-semibold text-gray-900">
                  {feature.label}
                  {feature.description && ": "}
                </span>
                {feature.description && (
                  <span className="text-gray-700">{feature.description}</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <div className="-mx-3 mt-6 flex items-center gap-1">
          <Link
            href={buttonHref}
            className="group flex items-center gap-1.5 rounded-lg bg-transparent p-3 text-sm leading-[110%] font-semibold text-gray-900 transition-colors duration-100 hover:bg-gray-100 active:bg-gray-50"
          >
            <p>{buttonText}</p>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Gradient overlay - positioned at bottom-right like Tiptap design */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 z-0 translate-x-[40%] translate-y-[43%] rotate-12 select-none"
      >
        <div className="size-[38rem] rounded-full bg-gradient-to-br from-[#ff4694] to-[#E11D48] opacity-30 blur-3xl" />
      </div>
    </section>
  );
}
