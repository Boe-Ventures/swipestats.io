import { SWIPESTATS_HEART_BARS } from "@/lib/brand";

export function SwipeStatsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="currentColor"
      role="img"
      aria-label="SwipeStats logo"
    >
      {SWIPESTATS_HEART_BARS.map((bar) => (
        <rect key={bar.x} {...bar} />
      ))}
    </svg>
  );
}
