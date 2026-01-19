"use client";

import { Star } from "lucide-react";
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../form";
import { cn } from "../lib/utils";

interface StarRatingFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends Omit<ControllerProps<TFieldValues, TName>, "render"> {
  label?: string;
  options: number[];
  className?: string;
}

export function StarRatingFormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  label,
  options,
  className,
  ...props
}: StarRatingFormFieldProps<TFieldValues, TName>) {
  return (
    <FormField
      {...props}
      render={({ field }) => (
        <FormItem className={cn("space-y-2", className)}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className="flex gap-1">
              {options.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => field.onChange(rating)}
                  className={cn(
                    "transition-colors",
                    field.value && rating <= field.value
                      ? "text-yellow-400"
                      : "text-gray-300 hover:text-yellow-200",
                  )}
                >
                  <Star
                    className="h-8 w-8"
                    fill={
                      field.value && rating <= field.value
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              ))}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
