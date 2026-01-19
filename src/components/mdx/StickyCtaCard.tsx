import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

interface Feature {
  label: string;
}

interface StickyCtaCardProps {
  title?: string;
  description?: string;
  trustBadge?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  features?: Feature[];
}

export function StickyCtaCard({
  title = "Get Your Dating App Insights",
  description = "Upload your data anonymously and compare it to demographics from around the world. 100% private and secure.",
  trustBadge = "Rated 5 stars by over 4,000 users",
  primaryButtonText = "Upload Your Data",
  primaryButtonHref = "/upload?provider=tinder",
  secondaryButtonText = "View Demo",
  secondaryButtonHref = "/",
  features = [
    { label: "100% anonymous processing" },
    { label: "Compare with demographics" },
    { label: "Data-driven insights" },
  ],
}: StickyCtaCardProps) {
  return (
    <div className="rounded-xl border border-rose-200/60 bg-gradient-to-r from-white via-gray-50 to-white p-6 shadow-lg">
      {/* Title */}
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        {description}
      </p>

      {/* Trust badge */}
      <div className="mt-4 flex items-center gap-2 text-xs font-medium text-rose-600">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
        {trustBadge}
      </div>

      {/* CTA Buttons */}
      <div className="mt-6 space-y-2">
        <ButtonLink
          href={primaryButtonHref}
          size="lg"
          className="w-full font-bold"
        >
          {primaryButtonText}
        </ButtonLink>

        <ButtonLink
          href={secondaryButtonHref}
          variant="outline"
          size="lg"
          className="w-full"
        >
          {secondaryButtonText}
        </ButtonLink>
      </div>

      {/* Features list */}
      <div className="mt-6 space-y-2 border-t border-gray-200 pt-4">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex items-start gap-2 text-xs text-gray-600"
          >
            <Check
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-600"
              strokeWidth={2.5}
            />
            <span>{feature.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
