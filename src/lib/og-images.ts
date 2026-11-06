import { env } from "@/env";

type MarketingOgOptions = {
  title: string;
  subtitle?: string;
  path: string;
  screenshot?: string;
  variant?: "centered" | "hero" | "split";
};

export function marketingOgImage({
  title,
  path,
  screenshot,
  variant = "hero",
}: MarketingOgOptions) {
  const params = new URLSearchParams({ title, path, variant, v: "2" });
  if (screenshot) params.set("screenshot", screenshot);

  return `${env.NEXT_PUBLIC_BASE_URL}/api/og?${params.toString()}`;
}
