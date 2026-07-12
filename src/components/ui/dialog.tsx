"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "./lib/utils";

import { useMediaQuery } from "./hooks/use-media-query";
import {
  Drawer,
  DrawerClose as DrawerClosePrimitive,
  DrawerContent as DrawerContentPrimitive,
  DrawerDescription as DrawerDescriptionPrimitive,
  DrawerFooter as DrawerFooterPrimitive,
  DrawerHeader as DrawerHeaderPrimitive,
  DrawerOverlay as DrawerOverlayPrimitive,
  DrawerPortal as DrawerPortalPrimitive,
  DrawerTitle as DrawerTitlePrimitive,
  DrawerTrigger as DrawerTriggerPrimitive,
} from "./drawer";
import { ScrollArea } from "./scroll-area";

// Original Dialog Components (Desktop)
function DialogRoot({
  ...props
}: Omit<DialogPrimitive.Root.Props, "children"> & {
  children?: React.ReactNode;
}) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTriggerPrimitive({
  ...props
}: Omit<
  DialogPrimitive.Trigger.Props,
  "children" | "className" | "style" | "render"
> & {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  render?: React.ReactElement;
}) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortalPrimitive({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClosePrimitive({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlayPrimitive({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContentPrimitive({
  className,
  children,
  showCloseButton = true,
  size = "default",
  ...props
}: Omit<DialogPrimitive.Popup.Props, "children" | "className" | "style"> & {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  showCloseButton?: boolean;
  size?: "default" | "sm" | "lg" | "xl" | "2xl" | "full";
}) {
  return (
    <DialogPortalPrimitive data-slot="dialog-portal">
      <DialogOverlayPrimitive />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg transition-[opacity,transform] duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
          {
            "sm:max-w-lg": size === "default",
            "sm:max-w-sm": size === "sm",
            "sm:max-w-2xl": size === "lg",
            "sm:max-w-4xl": size === "xl",
            "sm:max-w-6xl": size === "2xl",
            "sm:max-w-[calc(100vw-2rem)]": size === "full",
          },
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring bg-muted hover:bg-muted/80 absolute top-3 right-3 rounded-full p-2 opacity-80 transition-all hover:scale-105 hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortalPrimitive>
  );
}

function DialogHeaderPrimitive({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooterPrimitive({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-row justify-end gap-3 px-1 py-4", className)}
      {...props}
    />
  );
}

function DialogTitlePrimitive({
  className,
  ...props
}: Omit<DialogPrimitive.Title.Props, "className" | "style"> & {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescriptionPrimitive({
  className,
  ...props
}: Omit<DialogPrimitive.Description.Props, "className" | "style"> & {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

// Responsive Dialog Components (Public API)
function Dialog({
  repositionInputs = false, // Default to false for better mobile keyboard handling (ironically)
  ...props
}: React.ComponentProps<typeof DialogRoot> & {
  repositionInputs?: boolean;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return <DialogRoot {...props} />;
  }

  return (
    <Drawer
      repositionInputs={repositionInputs}
      {...(props as React.ComponentProps<typeof Drawer>)}
    />
  );
}

function DialogTrigger({
  render,
  children,
  ...props
}: React.ComponentProps<typeof DialogTriggerPrimitive>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    if (children === undefined) {
      return <DialogTriggerPrimitive render={render} {...props} />;
    }

    return (
      <DialogTriggerPrimitive render={render} {...props}>
        {children}
      </DialogTriggerPrimitive>
    );
  }

  if (React.isValidElement(render)) {
    const renderElement = render as React.ReactElement<{
      children?: React.ReactNode;
    }>;
    return (
      <DrawerTriggerPrimitive asChild {...props}>
        {React.cloneElement(
          renderElement,
          undefined,
          children ?? renderElement.props.children,
        )}
      </DrawerTriggerPrimitive>
    );
  }

  return <DrawerTriggerPrimitive {...props}>{children}</DrawerTriggerPrimitive>;
}

function DialogContent({
  className,
  children,
  scrollable = false,
  size = "default",
  ...props
}: React.ComponentProps<typeof DialogContentPrimitive> & {
  scrollable?: boolean;
  size?: "default" | "sm" | "lg" | "xl" | "2xl" | "full";
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <DialogContentPrimitive
        className={cn(className, scrollable && "max-h-[90dvh] overflow-y-auto")}
        size={size}
        {...props}
      >
        {children}
      </DialogContentPrimitive>
    );
  }

  // Filter out showCloseButton for drawer (not supported)
  const { showCloseButton: _showCloseButton, ...drawerProps } = props;

  return (
    <DrawerContentPrimitive
      className={cn("px-4", className)}
      scrollable={scrollable}
      {...drawerProps}
    >
      {children}
    </DrawerContentPrimitive>
  );
}

function DialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeaderPrimitive>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return <DialogHeaderPrimitive className={className} {...props} />;
  }

  return <DrawerHeaderPrimitive className={className} {...props} />;
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooterPrimitive>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return <DialogFooterPrimitive className={className} {...props} />;
  }

  return <DrawerFooterPrimitive className={className} {...props} />;
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitlePrimitive>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    // Desktop: Keep original alignment (usually text-left)
    return <DialogTitlePrimitive className={className} {...props} />;
  }

  // Mobile: Use flex centering for perfect alignment
  return (
    <DrawerTitlePrimitive
      className={cn("flex items-center justify-center", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescriptionPrimitive>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return <DialogDescriptionPrimitive className={className} {...props} />;
  }

  return <DrawerDescriptionPrimitive className={className} {...props} />;
}

function DialogClose({
  className,
  ...props
}: React.ComponentProps<typeof DialogClosePrimitive>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return <DialogClosePrimitive className={className} {...props} />;
  }

  return (
    <DrawerClosePrimitive
      className={typeof className === "string" ? className : undefined}
      {...(props as React.ComponentProps<typeof DrawerClosePrimitive>)}
    />
  );
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogOverlayPrimitive>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return <DialogOverlayPrimitive className={className} {...props} />;
  }

  return (
    <DrawerOverlayPrimitive
      className={typeof className === "string" ? className : undefined}
      {...(props as React.ComponentProps<typeof DrawerOverlayPrimitive>)}
    />
  );
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPortalPrimitive>) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return <DialogPortalPrimitive {...props} />;
  }

  return (
    <DrawerPortalPrimitive
      {...(props as unknown as React.ComponentProps<
        typeof DrawerPortalPrimitive
      >)}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};

// SimpleDialog - A less verbose way to create dialogs
type SimpleDialogProps = {
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
  /**
   * Fixed content rendered between the header and the (scrollable) body —
   * e.g. tabs or a toolbar that should stay put while the body scrolls.
   * Use this instead of `sticky` inside the body: the body's padding offsets
   * sticky children, letting scrolled content peek through above them.
   */
  subHeader?: React.ReactNode;
  footer?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  showCloseButton?: boolean;
  scrollable?: boolean;
  repositionInputs?: boolean;
  drawerHeight?: string;
  size?: "default" | "sm" | "lg" | "xl" | "2xl" | "full";
};

export function SimpleDialog({
  title,
  description,
  children,
  trigger,
  subHeader,
  footer,
  open,
  onOpenChange,
  className,
  showCloseButton = true,
  scrollable = false,
  repositionInputs = false, // Default to false for better mobile keyboard handling
  size = "default",
}: SimpleDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      repositionInputs={repositionInputs}
    >
      {trigger && React.isValidElement(trigger) && (
        <DialogTrigger render={trigger} />
      )}
      <DialogContent
        className={cn(
          className,
          // Cap the WHOLE dialog (header included) at 90dvh and let the body
          // row shrink — capping only the body would push the total past the
          // viewport by the header's height.
          scrollable &&
            footer &&
            "max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)]",
        )}
        showCloseButton={showCloseButton}
        scrollable={scrollable && !footer} // Disable DialogContent's scrollable if we have footer (we'll handle it manually)
        size={size}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {/* Handle scrollable content with footer - use special layout on both desktop and mobile */}
        {scrollable && footer ? (
          <div className="flex min-h-0 flex-col">
            {subHeader && <div className="px-1 pt-4 pb-3">{subHeader}</div>}
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto px-1 py-4",
                subHeader && "pt-0",
              )}
            >
              {children}
            </div>
            <DialogFooter className="border-t py-3">
              <div className="w-full">{footer}</div>
            </DialogFooter>
          </div>
        ) : (
          <>
            {subHeader && <div className="px-1 pt-4 pb-3">{subHeader}</div>}
            <div className={cn("px-1 py-4", subHeader && "pt-0")}>
              {children}
            </div>
            {footer && (
              <DialogFooter className="border-t py-3">
                <div className="w-full">{footer}</div>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ScrollableDialogContent - A wrapper that ensures proper scrolling in complex dialogs
type ScrollableDialogContentProps = React.ComponentProps<
  typeof DialogContent
> & {
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function ScrollableDialogContent({
  children,
  footer,
  className,
  ...props
}: ScrollableDialogContentProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <DialogContent
      className={cn(
        className,
        // Apply overflow styles only on desktop
        isDesktop && "max-h-[90dvh] overflow-y-auto",
      )}
      scrollable={true}
      {...props}
    >
      {isDesktop ? (
        // Desktop: Direct content (original working approach)
        children
      ) : (
        // Mobile: ScrollArea wrapped (for drawer compatibility)
        <ScrollArea className="max-h-[85dvh]">{children}</ScrollArea>
      )}
      {footer && <DialogFooter>{footer}</DialogFooter>}
    </DialogContent>
  );
}
