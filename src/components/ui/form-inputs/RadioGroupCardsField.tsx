"use client";

import type * as React from "react";
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import {
  Controller,
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSet,
  getFormFieldIds,
} from "../form-new";
import { RadioGroup, RadioGroupItem } from "../radio-group";
import { cn } from "../lib/utils";

interface RadioGroupCardsOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

type Layout = "single" | "grid";

interface RadioGroupCardsFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<ControllerProps<TFieldValues, TName>, "render"> {
  label?: string;
  description?: string;
  options: RadioGroupCardsOption[];
  className?: string;
  cardClassName?: string;
  layout?: Layout;
  gridCols?: number;
}

export function RadioGroupCardsField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  options,
  className,
  cardClassName,
  layout = "grid",
  gridCols = 2,
  ...props
}: RadioGroupCardsFieldProps<TFieldValues, TName>) {
  // TODO simplify this, just use cn
  const getGridClassName = () => {
    if (layout === "single") {
      return "grid gap-3";
    }

    // Create responsive grid classes based on gridCols
    const cols = Math.min(Math.max(gridCols, 1), 6); // Limit between 1-6 columns
    return `grid grid-cols-1 gap-3 sm:grid-cols-${cols}`;
  };

  return (
    <Controller
      {...props}
      render={({ field, fieldState }) => (
        <FieldSet
          className={cn("space-y-3", className)}
          data-invalid={fieldState.invalid}
          aria-invalid={fieldState.invalid}
          aria-describedby={
            [
              description
                ? getFormFieldIds(field.name).descriptionId
                : undefined,
              fieldState.invalid
                ? getFormFieldIds(field.name).errorId
                : undefined,
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
        >
          {label && (
            <FieldLegend id={getFormFieldIds(field.name).labelId}>
              {label}
            </FieldLegend>
          )}
          {description && (
            <FieldDescription id={getFormFieldIds(field.name).descriptionId}>
              {description}
            </FieldDescription>
          )}
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className={getGridClassName()}
            aria-invalid={fieldState.invalid}
          >
            {options.map((option) => (
              <div key={option.value} className="space-y-0">
                <label
                  htmlFor={`${field.name}-radio-${option.value}`}
                  className={cn(
                    layout === "grid"
                      ? "border-input hover:border-ring focus-within:border-ring focus-within:ring-ring/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-primary/20 has-[*[data-state=checked]]:border-primary has-[*[data-state=checked]]:bg-primary/5 has-[*[data-state=checked]]:ring-primary/20 relative flex min-h-[80px] cursor-pointer items-start gap-3 rounded-lg border p-4 shadow-sm transition-all focus-within:ring-[3px] has-[*[data-state=checked]]:ring-[3px] has-[:checked]:ring-[3px]"
                      : "border-input hover:border-ring focus-within:border-ring focus-within:ring-ring/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-primary/20 has-[*[data-state=checked]]:border-primary has-[*[data-state=checked]]:bg-primary/5 has-[*[data-state=checked]]:ring-primary/20 relative flex cursor-pointer items-center gap-3 rounded-lg border p-4 shadow-sm transition-all focus-within:ring-[3px] has-[*[data-state=checked]]:ring-[3px] has-[:checked]:ring-[3px]",
                    cardClassName,
                  )}
                >
                  <RadioGroupItem
                    id={`${field.name}-radio-${option.value}`}
                    value={option.value}
                    className={cn("shrink-0", layout === "grid" && "mt-1")}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="space-y-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          layout === "grid" ? "leading-tight" : "leading-none",
                        )}
                      >
                        {option.label}
                      </p>
                      {option.description && (
                        <p
                          className={cn(
                            "text-muted-foreground text-xs",
                            layout === "grid" ? "leading-relaxed" : "",
                          )}
                        >
                          {option.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {option.icon && (
                    <div className="text-muted-foreground absolute top-3 right-3 flex size-6 shrink-0 items-center justify-center">
                      {option.icon}
                    </div>
                  )}
                </label>
              </div>
            ))}
          </RadioGroup>
          {fieldState.invalid && (
            <FieldError
              id={getFormFieldIds(field.name).errorId}
              errors={[fieldState.error]}
            />
          )}
        </FieldSet>
      )}
    />
  );
}
