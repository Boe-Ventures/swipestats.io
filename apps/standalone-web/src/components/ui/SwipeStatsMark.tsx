import {
  SWIPESTATS_HEART_BARS,
  SWIPESTATS_MARK_RED,
  SWIPESTATS_MARK_VIEW_BOX,
  SWIPESTATS_TILE_RADIUS,
} from "@/lib/brand";

export function SwipeStatsMark({
  className,
  tile = false,
}: {
  className?: string;
  tile?: boolean;
}) {
  return (
    <svg
      viewBox={tile ? SWIPESTATS_MARK_VIEW_BOX : "52 48 408 408"}
      className={className}
      fill={tile ? "white" : "currentColor"}
      aria-hidden="true"
    >
      {tile && (
        <rect
          width="512"
          height="512"
          rx={SWIPESTATS_TILE_RADIUS}
          fill={SWIPESTATS_MARK_RED}
        />
      )}
      {SWIPESTATS_HEART_BARS.map((bar) => (
        <rect key={bar.x} {...bar} />
      ))}
    </svg>
  );
}
