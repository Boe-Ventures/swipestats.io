"use client";

import { ArrowUpRight, Megaphone } from "lucide-react";

import { marketingButton } from "@/app/(marketing)/_components/marketing-ui";
import { cn } from "@/components/ui/lib/utils";
import { useSponsorTracking } from "@/hooks/use-sponsor-tracking";
import {
  ACTIVE_SPONSOR_CAMPAIGN,
  type SponsorCampaign,
} from "@/lib/sponsorship";

export interface SponsorCardProps {
  campaign?: SponsorCampaign;
  className?: string;
}

export function SponsorCard({
  campaign = ACTIVE_SPONSOR_CAMPAIGN,
  className,
}: SponsorCardProps) {
  const { sponsorRef, trackClick } = useSponsorTracking(
    campaign,
    "blog-inline",
  );
  const isPaid = campaign.kind === "paid";

  return (
    <aside
      ref={sponsorRef}
      aria-label={
        isPaid ? `Sponsored by ${campaign.sponsorName}` : campaign.title
      }
      data-sponsor-card={campaign.id}
      className={cn(
        "not-prose my-9 overflow-hidden rounded-3xl bg-gray-950 text-white shadow-[0_20px_55px_oklch(0.16_0.03_286/0.2)]",
        className,
      )}
    >
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-9">
          <div className="flex items-center gap-2.5 font-mono text-[11px] font-semibold tracking-[0.1em] text-rose-300 uppercase">
            <span className="grid size-8 place-items-center rounded-[10px] bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/20">
              <Megaphone className="size-4" />
            </span>
            {campaign.eyebrow}
          </div>

          <h2 className="mt-5 text-[clamp(26px,4vw,34px)] leading-[1.08] font-bold tracking-[-0.035em] text-balance text-white">
            {campaign.title}
          </h2>
          <p className="mt-3.5 max-w-xl text-[16px] leading-7 text-gray-300">
            {campaign.description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3.5">
            <a
              href={campaign.href}
              onClick={trackClick}
              target={isPaid ? "_blank" : undefined}
              rel={isPaid ? "sponsored noopener noreferrer" : undefined}
              className={marketingButton({
                variant: "primary",
                size: "default",
              })}
            >
              {campaign.ctaText}
              <ArrowUpRight className="size-4" />
            </a>
            <span className="text-[12.5px] font-medium text-gray-400">
              {isPaid
                ? `Sponsored by ${campaign.sponsorName}`
                : "Direct partnership"}
            </span>
          </div>
        </div>

        <div className="relative grid content-center gap-3 overflow-hidden border-t border-white/10 bg-[radial-gradient(circle_at_top_right,oklch(0.55_0.22_15/0.32),transparent_58%)] p-6 sm:p-8 lg:border-t-0 lg:border-l">
          <div className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-rose-500/10 blur-3xl" />
          {campaign.proof.map((item, index) => (
            <div
              key={`${item.value}-${item.label}`}
              className={cn(
                "relative rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 backdrop-blur-sm",
                index === 0 && "border-rose-300/25 bg-rose-400/10",
              )}
            >
              <div className="text-xl font-bold tracking-[-0.03em] text-white">
                {item.value}
              </div>
              <div className="mt-0.5 text-[12px] font-medium text-gray-400">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
