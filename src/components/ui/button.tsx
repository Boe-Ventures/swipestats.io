import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import Link from "next/link";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "./lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs dark:text-white",
        destructive:
          "bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/80 dark:hover:bg-destructive/90 text-destructive-foreground shadow-xs",
        outline:
          "bg-background hover:bg-accent hover:text-accent-foreground dark:bg-background dark:border-border dark:hover:bg-accent/80 border shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/80 border-secondary-foreground/20 hover:border-secondary-foreground/30 dark:border-secondary-foreground/20 dark:hover:border-secondary-foreground/30 border shadow-xs transition-colors",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/80 dark:hover:text-accent-foreground",
        link: "text-primary dark:text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-7 gap-1 rounded-md px-2.5 text-xs has-[>svg]:px-2",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-7",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Button — the action primitive (shadcn spec, Radix `Slot` for composition).
 *
 * Pick the right tool:
 * - **Action** (onClick, submit): `<Button>` — supports `loading`.
 * - **Link styled as a button**: prefer `<ButtonLink href>` (a real `<Link>`,
 *   safe with icons + text). `<Button asChild>` also works for any element.
 * - **Inline text link**: `<SmartLink href>` from `./smart-link`.
 *
 * `asChild` merges the button styles onto a single child element via Radix
 * `Slot` (the shadcn way). It is crash-safe — the child may contain icons and
 * text. For a loading state on a slotted child, compose `<Spinner />` yourself.
 *
 * @example
 * // Action with loading state (Spinner is rendered for you)
 * <Button loading={isSaving}>Save</Button>
 *
 * @example
 * // Icon + text
 * <Button variant="outline" size="sm">
 *   <GitBranchIcon /> New branch
 * </Button>
 *
 * @example
 * // Render another element as a button
 * <Button asChild variant="outline">
 *   <Link href="/login">Login</Link>
 * </Button>
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const classes = cn(buttonVariants({ variant, size, className }));

  // asChild: hand the button styles to a single child via Slot. Pass ONLY the
  // child (no spinner sibling) so it never trips Slot's single-child rule.
  if (asChild) {
    return (
      <Slot data-slot="button" className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      data-slot="button"
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner data-icon="inline-start" />}
      {children}
    </button>
  );
}

/**
 * ButtonLink — a Next.js `<Link>` styled as a button.
 *
 * The ergonomic, crash-safe way to render a link that looks like a button
 * (handles icons + text). Equivalent to `<Button asChild><Link/></Button>`
 * without the single-child caveat. Does not support `loading` (links navigate).
 *
 * @example
 * <ButtonLink href="/dashboard" variant="outline" size="sm">
 *   <HomeIcon /> Dashboard
 * </ButtonLink>
 */
function ButtonLink({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link
      data-slot="button-link"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </Link>
  );
}

export { Button, ButtonLink, buttonVariants };
