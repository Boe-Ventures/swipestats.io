import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import Link from "next/link";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
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
 * Action primitive with loading states and Base UI polymorphic rendering.
 * Use `render={<Link href="/login" />}` to render a link while preserving
 * button behavior and styling, or use `ButtonLink` for an explicit link API.
 */
function Button({
  className,
  variant,
  size,
  loading = false,
  disabled,
  children,
  render,
  nativeButton,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
  }) {
  const classes = cn(buttonVariants({ variant, size, className }));
  return (
    <ButtonPrimitive
      data-slot="button"
      className={classes}
      disabled={disabled || loading}
      render={render}
      nativeButton={nativeButton ?? render === undefined}
      {...props}
    >
      {loading && <Spinner data-icon="inline-start" />}
      {children}
    </ButtonPrimitive>
  );
}

/**
 * ButtonLink — a Next.js `<Link>` styled as a button.
 *
 * The ergonomic, crash-safe way to render a link that looks like a button
 * (handles icons + text). Does not support `loading` because links navigate.
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
