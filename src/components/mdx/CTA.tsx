import Link from "next/link";
import { cn } from "@/components/ui/lib/utils";
import { marketingButton } from "@/app/(marketing)/_components/marketing-ui";

interface CTAProps {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}

// Flat golden styling. `primary` and `ghost` map straight onto the shared
// marketingButton cva; `secondary` keeps the legacy dark treatment but flat
// (no gradient) so the public variant set stays unchanged for callers.
const variantClasses = {
  primary: marketingButton({ variant: "primary", size: "lg" }),
  secondary: cn(
    marketingButton({ variant: "primary", size: "lg" }),
    "bg-gray-900 text-white shadow-none hover:bg-gray-800",
  ),
  ghost: marketingButton({ variant: "ghost", size: "lg" }),
};

export function CTA({ label, href, variant = "primary", className }: CTAProps) {
  return (
    <div className="my-8 text-center">
      <Link href={href} className={cn(variantClasses[variant], className)}>
        {label}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
