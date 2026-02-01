import Link from "next/link";

interface CTAProps {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}

export function CTA({ label, href, variant = "primary", className }: CTAProps) {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-semibold shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

  const variantClasses = {
    primary:
      "bg-linear-to-r from-rose-600 to-rose-700 text-white hover:from-rose-700 hover:to-rose-800 focus-visible:outline-rose-600",
    secondary:
      "bg-linear-to-r from-gray-700 to-gray-800 text-white hover:from-gray-800 hover:to-gray-900 focus-visible:outline-gray-700",
    ghost:
      "border-2 border-gray-300 text-gray-900 hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-gray-500",
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className || ""}`;

  return (
    <div className="my-8 text-center">
      <Link href={href} className={combinedClasses}>
        {label}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
