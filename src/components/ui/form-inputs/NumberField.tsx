"use client";

import type * as React from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "../form";
import { Input } from "../input";

interface NumberFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  allowDecimals?: boolean;
  currency?: string;
  thousandSeparator?: boolean;
}

export function NumberField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder,
  description,
  disabled,
  className,
  required,
  min,
  max,
  step = 1,
  allowDecimals = false,
  currency,
  thousandSeparator = true,
}: NumberFieldProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error: _error },
  } = useController({
    name,
    control,
    rules: {
      required: required ? `${label || "This field"} is required` : undefined,
      min:
        min !== undefined
          ? { value: min, message: `Minimum value is ${min}` }
          : undefined,
      max:
        max !== undefined
          ? { value: max, message: `Maximum value is ${max}` }
          : undefined,
    },
  });

  // Format number for display (with thousand separators if enabled)
  const formatNumber = (value: number | undefined): string => {
    if (value === undefined || isNaN(value)) return "";

    if (thousandSeparator) {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: allowDecimals ? 0 : 0,
        maximumFractionDigits: allowDecimals ? 2 : 0,
      });
    }

    return allowDecimals ? value.toString() : Math.floor(value).toString();
  };

  // Parse display string back to number
  const parseNumber = (value: string): number | undefined => {
    if (!value.trim()) return undefined;

    // Remove thousand separators and currency symbols
    const cleanValue = value.replace(/[,\s$€£¥₹]/g, "");
    const parsed = allowDecimals
      ? parseFloat(cleanValue)
      : parseInt(cleanValue, 10);

    return isNaN(parsed) ? undefined : parsed;
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseNumber(rawValue);
    field.onChange(numericValue);
  };

  // Handle blur to reformat the display
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const numericValue = parseNumber(e.target.value);
    if (numericValue !== undefined) {
      // Update the input display with formatted value
      e.target.value = formatNumber(numericValue);
    }
    field.onBlur();
  };

  const displayValue = formatNumber(field.value);

  return (
    <FormItem className={className}>
      {label && (
        <FormLabel>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
      )}
      <FormControl>
        <div className="relative">
          {currency && (
            <div className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
              {currency}
            </div>
          )}
          <Input
            type="text"
            inputMode="numeric"
            placeholder={placeholder}
            disabled={disabled}
            defaultValue={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            min={min}
            max={max}
            step={step}
            className={currency ? "pl-8" : undefined}
          />
        </div>
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}
