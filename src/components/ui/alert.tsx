import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cva } from "class-variance-authority";
import {
  CheckCircleIcon,
  InfoIcon,
  TriangleAlertIcon,
  XCircle,
} from "lucide-react";

import { cn } from "./lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current",
        info: "border-blue-200 bg-blue-50 text-blue-900 *:data-[slot=alert-description]:text-blue-800 [&>svg]:text-blue-600",
        primary:
          "border-primary/20 bg-primary/5 text-foreground *:data-[slot=alert-description]:text-foreground/80 [&>svg]:text-primary",
        success:
          "border-green-200 bg-green-50 text-green-900 *:data-[slot=alert-description]:text-green-800 [&>svg]:text-green-600",
        warning:
          "border-yellow-200 bg-yellow-50 text-yellow-900 *:data-[slot=alert-description]:text-yellow-800 [&>svg]:text-yellow-600",
        error:
          "border-red-200 bg-red-50 text-red-900 *:data-[slot=alert-description]:text-red-800 [&>svg]:text-red-600",
        neutral:
          "border-gray-200 bg-white text-gray-900 *:data-[slot=alert-description]:text-gray-700 [&>svg]:text-gray-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

function InfoAlert(props: {
  children: React.ReactNode;
  variant?: "info" | "destructive";
}) {
  const { variant = "info", children } = props;
  return (
    <Alert variant={variant}>
      <InfoIcon />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

function SuccessAlert(props: { children: React.ReactNode }) {
  return (
    <Alert variant="success">
      <CheckCircleIcon />
      <AlertDescription>{props.children}</AlertDescription>
    </Alert>
  );
}

function WarningAlert(props: { children: React.ReactNode }) {
  return (
    <Alert variant="warning">
      <TriangleAlertIcon />
      <AlertDescription>{props.children}</AlertDescription>
    </Alert>
  );
}

function ErrorAlert(props: { children: React.ReactNode }) {
  return (
    <Alert variant="error">
      <TriangleAlertIcon />
      <AlertDescription>{props.children}</AlertDescription>
    </Alert>
  );
}

function NeutralAlert(props: { children: React.ReactNode }) {
  return (
    <Alert variant="neutral">
      <InfoIcon />
      <AlertDescription>{props.children}</AlertDescription>
    </Alert>
  );
}

function PrimaryAlert(props: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Alert variant="primary">
      {props.icon || <InfoIcon />}
      <AlertDescription>{props.children}</AlertDescription>
    </Alert>
  );
}

// Original SwipeStats Alert component (legacy design with left border accent)
type SwipestatsAlertColor = {
  background: string;
  border: string;
  text: string;
  icon: string;
};

type SwipestatsAlertCategory = "success" | "danger" | "warning" | "info";
const swipestatsAlertColors: Record<
  SwipestatsAlertCategory,
  SwipestatsAlertColor
> = {
  success: {
    background: "bg-green-50",
    border: "border-green-400",
    text: "text-green-800",
    icon: "text-green-400",
  },
  danger: {
    background: "bg-red-50",
    border: "border-red-400",
    text: "text-red-800",
    icon: "text-red-400",
  },
  warning: {
    background: "bg-yellow-50",
    border: "border-yellow-400",
    text: "text-yellow-800",
    icon: "text-yellow-400",
  },
  info: {
    background: "bg-blue-50",
    border: "border-blue-400",
    text: "text-blue-800",
    icon: "text-blue-400",
  },
} as const;

function SwipestatsAlert({
  title,
  category,
  description,
  descriptionList,
}: {
  title: string;
  category: SwipestatsAlertCategory;
  description?: React.ReactNode;
  descriptionList?: string[];
}) {
  const colors = swipestatsAlertColors[category];

  const icon = {
    success: <CheckCircleIcon className={cn("h-5 w-5", colors.icon)} />,
    danger: (
      <XCircle className={cn("h-5 w-5", colors.icon)} aria-hidden="true" />
    ),
    warning: (
      <TriangleAlertIcon
        className={cn("h-5 w-5", colors.icon)}
        aria-hidden="true"
      />
    ),
    info: (
      <InfoIcon className={cn("h-5 w-5", colors.icon)} aria-hidden="true" />
    ),
  }[category];

  return (
    <div
      className={cn(
        "rounded-md border-l-4 p-4",
        colors.background,
        colors.border,
      )}
    >
      <div className="flex">
        <div className="flex-shrink-0">{icon}</div>
        <div className="ml-3">
          <h3 className={cn("text-sm font-medium", colors.text)}>{title}</h3>
          {description && (
            <div className={cn("mt-2 text-sm", colors.text)}>
              <p>{description}</p>
            </div>
          )}

          {descriptionList && (
            <div className={cn("mt-2 text-sm", colors.text)}>
              <ul role="list" className="list-disc space-y-1 pl-5">
                {descriptionList.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export {
  Alert,
  AlertTitle,
  AlertDescription,
  InfoAlert,
  PrimaryAlert,
  SuccessAlert,
  WarningAlert,
  ErrorAlert,
  NeutralAlert,
  SwipestatsAlert,
};
