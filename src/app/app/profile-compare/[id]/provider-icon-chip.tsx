import Image from "next/image";

import { cn } from "@/components/ui/lib/utils";
import type { ProviderConfig } from "./provider-config";

interface ProviderIconChipProps {
  config: ProviderConfig;
  className?: string;
  /** When true, ring the chip in green to signal the column is marked done. */
  done?: boolean;
}

/**
 * The small rounded brand chip shown next to a column's name.
 *
 * - Providers with a raster `iconImage` (Hinge, Bumble) render the image
 *   full-bleed, since the asset already carries its own on-brand background.
 * - Everyone else gets their vector glyph drawn white on the brand color.
 */
export function ProviderIconChip({
  config,
  className,
  done,
}: ProviderIconChipProps) {
  const Icon = config.icon;
  const doneRing = done
    ? "ring-2 ring-green-500 ring-offset-1 ring-offset-background"
    : undefined;

  if (config.iconImage) {
    return (
      <span
        className={cn(
          "relative h-8 w-8 shrink-0 overflow-hidden rounded-lg shadow-sm",
          doneRing,
          className,
        )}
      >
        <Image
          src={config.iconImage}
          alt={`${config.name} logo`}
          fill
          sizes="32px"
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm",
        doneRing,
        className,
      )}
      style={{ backgroundColor: config.brandColor }}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
