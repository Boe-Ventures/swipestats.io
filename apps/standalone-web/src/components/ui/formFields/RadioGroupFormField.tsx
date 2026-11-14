"use client";

import { Star } from "lucide-react";
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import {
  Controller,
  FieldError,
  FieldLegend,
  FieldSet,
  getFormFieldIds,
} from "../form-new";
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
    <Controller
      {...props}
      render={({ field, fieldState }) => (
        <FieldSet
          className={cn("space-y-2", className)}
          data-invalid={fieldState.invalid}
          aria-invalid={fieldState.invalid}
          aria-describedby={
            fieldState.invalid ? getFormFieldIds(field.name).errorId : undefined
          }
        >
          {label && (
            <FieldLegend id={getFormFieldIds(field.name).labelId}>
              {label}
            </FieldLegend>
          )}
          <div
            className="flex gap-1"
            role="radiogroup"
            aria-labelledby={
              label ? getFormFieldIds(field.name).labelId : undefined
            }
          >
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
                aria-invalid={fieldState.invalid}
                aria-label={`${rating} star${rating === 1 ? "" : "s"}`}
                aria-checked={field.value === rating}
                role="radio"
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
