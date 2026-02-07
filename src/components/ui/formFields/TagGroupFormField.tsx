"use client";

import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../form";
import { cn } from "../lib/utils";
import { Button } from "../button";

interface TagOption {
  value: string;
  label: string;
}

interface TagGroupFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<ControllerProps<TFieldValues, TName>, "render"> {
  label?: string;
  options: TagOption[];
  className?: string;
}

export function TagGroupFormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  options,
  className,
  ...props
}: TagGroupFormFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      {...props}
      render={({ field }) => (
        <FormItem className={cn("space-y-2", className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className="flex flex-wrap gap-2">
              {options.map((option) => {
                const currentValue = (field.value ?? []) as string[];
                const isSelected = currentValue.includes(option.value);

                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isSelected) {
                        // Remove from selection
                        field.onChange(
                          currentValue.filter((v) => v !== option.value),
                        );
                      } else {
                        // Add to selection
                        field.onChange([...currentValue, option.value]);
                      }
                    }}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
