"use client";

import type * as React from "react";
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import { Checkbox } from "../checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../form";
import { cn } from "../lib/utils";

interface CheckboxGroupCardsOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

type Layout = "single" | "grid";

interface CheckboxGroupCardsFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<ControllerProps<TFieldValues, TName>, "render"> {
  label?: string;
  description?: string;
  options: CheckboxGroupCardsOption[];
  className?: string;
  cardClassName?: string;
  gridClassName?: string;
  layout?: Layout;
}

export function CheckboxGroupCardsField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  description,
  options,
  className,
  cardClassName,
  gridClassName: customGridClassName,
  layout = "grid",
  ...props
}: CheckboxGroupCardsFieldProps<TFieldValues, TName>) {
  const gridClassName =
    customGridClassName ||
    (layout === "grid" ? "grid-cols-1  sm:grid-cols-2" : "");

  return (
    <FormField
      {...props}
      render={() => (
        <FormItem className={cn("space-y-3", className)}>
          {label && <FormLabel>{label}</FormLabel>}
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
          <div className={cn("grid gap-3", gridClassName)}>
            {options.map((option) => (
              <FormField
                key={option.value}
                control={props.control}
                name={props.name}
                render={({ field }) => {
                  const fieldValue = field.value as string[] | undefined;
                  const isChecked = Array.isArray(fieldValue)
                    ? fieldValue.includes(option.value)
                    : false;

                  return (
                    <FormItem className="space-y-0">
                      <FormControl>
                        <label
                          htmlFor={`checkbox-${option.value}`}
                          className={cn(
                            // revisit if the extra has-[:checked] is needed, the blue bg stopped working out of nowhere and this was a quick fix
                            layout === "grid"
                              ? cn(
                                  "border-input hover:border-ring focus-within:border-ring focus-within:ring-ring/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-primary/20 has-[*[data-state=checked]]:border-primary has-[*[data-state=checked]]:bg-primary/5 has-[*[data-state=checked]]:ring-primary/20 relative flex cursor-pointer gap-3 rounded-lg border p-4 shadow-sm transition-all focus-within:ring-[3px] has-[*[data-state=checked]]:ring-[3px] has-[:checked]:ring-[3px]",
                                  option.description
                                    ? "min-h-[80px] items-start"
                                    : "min-h-[60px] items-center",
                                )
                              : "border-input hover:border-ring focus-within:border-ring focus-within:ring-ring/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-primary/20 has-[*[data-state=checked]]:border-primary has-[*[data-state=checked]]:bg-primary/5 has-[*[data-state=checked]]:ring-primary/20 relative flex cursor-pointer items-center gap-3 rounded-lg border p-4 shadow-sm transition-all focus-within:ring-[3px] has-[*[data-state=checked]]:ring-[3px] has-[:checked]:ring-[3px]",
                            cardClassName,
                          )}
                        >
                          <Checkbox
                            id={`checkbox-${option.value}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              const currentValue = Array.isArray(fieldValue)
                                ? fieldValue
                                : [];
                              if (checked) {
                                field.onChange([...currentValue, option.value]);
                              } else {
                                field.onChange(
                                  currentValue.filter(
                                    (value: string) => value !== option.value,
                                  ),
                                );
                              }
                            }}
                            className={cn(
                              "shrink-0",
                              layout === "grid" && option.description && "mt-1",
                            )}
                          />
                          <div
                            className={cn(
                              "flex-1",
                              layout === "grid" && option.description
                                ? "space-y-2"
                                : "space-y-0",
                            )}
                          >
                            <div
                              className={cn(
                                option.description ? "space-y-1" : "space-y-0",
                              )}
                            >
                              <p
                                className={cn(
                                  "text-sm font-medium",
                                  layout === "grid" && option.description
                                    ? "leading-tight"
                                    : "leading-none",
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
                            <div
                              className={cn(
                                "text-muted-foreground flex size-6 shrink-0 items-center justify-center",
                                option.description
                                  ? "absolute top-3 right-3"
                                  : "relative",
                              )}
                            >
                              {option.icon}
                            </div>
                          )}
                        </label>
                      </FormControl>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
