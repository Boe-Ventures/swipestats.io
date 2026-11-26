"use client";

import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form";

import {
  Controller,
  FieldError,
  FieldLegend,
  FieldSet,
  getFormFieldIds,
} from "../form-new";
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
                  aria-invalid={fieldState.invalid}
                  aria-pressed={isSelected}
                >
                  {option.label}
                </Button>
              );
            })}
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
