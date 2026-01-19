import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import Link from "next/link";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "./lib/utils";

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
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
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

// Simple spinner component
const Spinner = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <svg
    className={cn("animate-spin", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

/**
 * Button component with support for loading states and polymorphic rendering via asChild.
 *
 * @param variant - Visual style variant: default, destructive, outline, secondary, ghost, link
 * @param size - Size variant: default, sm, lg, icon, icon-sm, icon-lg
 * @param asChild - When true, delegates rendering to child component (requires single child)
 * @param loading - Shows spinner and disables button (incompatible with asChild)
 *
 * @example
 * // ✅ Basic usage
 * <Button variant="outline">Click me</Button>
 *
 * @example
 * // ✅ With icon
 * <Button variant="outline" size="sm">
 *   <IconGitBranch />
 *   New Branch
 * </Button>
 *
 * @example
 * // ✅ Icon-only button
 * <Button variant="outline" size="icon" aria-label="Submit">
 *   <ArrowUpIcon />
 * </Button>
 *
 * @example
 * // ✅ With loading state
 * <Button loading={true} disabled>Saving...</Button>
 *
 * @example
 * // ✅ asChild with single child (simple text)
 * <Button asChild variant="outline">
 *   <Link href="/login">Login</Link>
 * </Button>
 *
 * @example
 * // ❌ WRONG - asChild with multiple children
 * // This will throw: "React.Children.only expected to receive a single React element child"
 * <Button asChild variant="outline">
 *   <Link href="/path">
 *     <Icon />
 *     <span>Text</span>
 *   </Link>
 * </Button>
 *
 * @example
 * // ✅ CORRECT - Use ButtonLink instead for links with multiple children
 * <ButtonLink href="/path" variant="outline">
 *   <Icon />
 *   <span>Text</span>
 * </ButtonLink>
 *
 * @example
 * // ✅ CORRECT - Or wrap children in a fragment
 * <Button asChild variant="outline">
 *   <Link href="/path">
 *     <>
 *       <Icon />
 *       <span>Text</span>
 *     </>
 *   </Link>
 * </Button>
 *
 * @remarks
 * - The `loading` prop automatically adds a spinner and is disabled when `asChild` is true
 * - When using `asChild`, the child component must accept className and other button props
 * - For Next.js Link components with multiple children, use ButtonLink instead
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
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {!asChild && loading && <Spinner className="size-4" />}
      {children}
    </Comp>
  );
}

/**
 * Button-styled Next.js Link component.
 *
 * Use this component when you need a link that looks like a button,
 * especially when the link contains multiple children (icon + text).
 * This is the recommended alternative to using Button with asChild
 * when you have multiple child elements.
 *
 * @param variant - Visual style variant: default, destructive, outline, secondary, ghost, link
 * @param size - Size variant: default, sm, lg, icon, icon-sm, icon-lg
 * @param href - Next.js Link href prop
 *
 * @example
 * // ✅ Link with icon and text
 * <ButtonLink href="/dashboard" variant="outline" size="sm">
 *   <HomeIcon />
 *   <span>Dashboard</span>
 * </ButtonLink>
 *
 * @example
 * // ✅ Simple link button
 * <ButtonLink href="/login" variant="default">
 *   Login
 * </ButtonLink>
 *
 * @remarks
 * - Accepts all Next.js Link props (href, prefetch, replace, etc.)
 * - Does not support the loading prop (use Button for that)
 * - Automatically handles button styling with proper gap spacing for icons
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
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </Link>
  );
}

export { Button, ButtonLink, buttonVariants };
