import { SwipeStatsMark } from "@/components/ui/SwipeStatsMark";
import Link from "next/link";
import { cn } from "@/components/ui/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Golden APP-SHELL chrome - the functional, solid dialect of the golden
 * design language (NOT the translucent marketing blur header). White surfaces,
 * gray-200 hairlines, rose-600 accent, shadow-xs. A real golden design pass for
 * the authenticated app, pairing with the app.tsx data primitives.
 *
 * Presentational + server-safe (no hooks). Pass an `active` key to light up the
 * current nav item; links and brand are plain anchors so this works anywhere.
 */

/* ---------------------------------------------------------------- brand mark */

/** Compact brand tile shared by authenticated app navigation. */
function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-brand-rose grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] text-white",
        className,
      )}
    >
      <SwipeStatsMark className="h-[22px] w-[22px]" />
    </span>
  );
}

/** Wordmark and heart, links home. */
function Brand({ className }: { className?: string }) {
  return (
    <Link
      href="/app"
      className={cn(
        "dark:text-foreground flex flex-none items-center gap-2.5 text-gray-900 transition hover:opacity-90",
        className,
      )}
    >
      <BrandMark />
      <span className="text-[17px] font-bold tracking-[-0.02em]">
        SwipeStats
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- nav model */

export type GoldenNavKey = "dashboard" | "photos" | "research";

export type GoldenNavLink = {
  key: GoldenNavKey;
  label: string;
  href: string;
};

export const DEFAULT_GOLDEN_NAV: GoldenNavLink[] = [
  { key: "dashboard", label: "Dashboard", href: "/app" },
  { key: "photos", label: "Photos", href: "/app/photos" },
  { key: "research", label: "Research", href: "/research" },
];

/** Tiny duotone glyphs for the sidebar rows. Inherit currentColor. */
function NavIcon({ icon }: { icon: GoldenNavKey }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[18px] w-[18px] flex-none",
  };
  if (icon === "dashboard")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    );
  if (icon === "photos")
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2.5" />
        <circle cx="8.5" cy="8.5" r="1.6" />
        <path d="M21 15.5 16 11l-7 7" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

/* ---------------------------------------------------------------- avatar */

function Avatar({ initials }: { initials?: string }) {
  return (
    <span className="dark:border-border dark:bg-muted dark:text-muted-foreground grid h-[34px] w-[34px] flex-none place-items-center rounded-full border border-gray-200 bg-gray-100 font-mono text-[12px] font-semibold tracking-[0.02em] text-gray-600 uppercase">
      {initials ?? ""}
    </span>
  );
}

/* ---------------------------------------------------------------- top header */

export function GoldenAppHeader({
  active,
  links = DEFAULT_GOLDEN_NAV,
  userInitials,
  upgradeHref = "/app/upgrade",
  className,
}: {
  active?: GoldenNavKey;
  links?: GoldenNavLink[];
  userInitials?: string;
  upgradeHref?: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "dark:border-border dark:bg-card sticky top-0 z-50 border-b border-gray-200 bg-white",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1216px] items-center gap-6 px-6 lg:px-8">
        <Brand />

        {/* pill nav - sits left, after the brand */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const isActive = link.key === active;
            return (
              <Link
                key={link.key}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[14px] font-medium tracking-[-0.01em] transition",
                  isActive
                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                    : "dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* right cluster */}
        <div className="ml-auto flex items-center gap-3">
          <Button
            render={<Link href={upgradeHref} />}
            variant="outline"
            size="sm"
          >
            Upgrade
          </Button>
          <Avatar initials={userInitials} />
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- sidebar */

/**
 * GoldenSidebar - narrow vertical nav for desktop app layouts. Same links as
 * the header, rendered as icon + label rows. Minimal by design; pair it with
 * the header (which carries the brand + account cluster) or drop the brand in
 * via `header`.
 */
export function GoldenSidebar({
  active,
  links = DEFAULT_GOLDEN_NAV,
  header,
  footer,
  className,
}: {
  active?: GoldenNavKey;
  links?: GoldenNavLink[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "dark:border-border dark:bg-card flex w-[224px] flex-none flex-col gap-1 border-r border-gray-200 bg-white p-4",
        className,
      )}
    >
      {header ?? (
        <div className="px-2 pt-1 pb-3">
          <Brand />
        </div>
      )}

      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const isActive = link.key === active;
          return (
            <Link
              key={link.key}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium tracking-[-0.01em] transition",
                isActive
                  ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                  : "dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )}
            >
              <NavIcon icon={link.key} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </aside>
  );
}
