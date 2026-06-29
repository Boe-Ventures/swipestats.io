"use client";

import type { DateRange } from "react-day-picker";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "../button";
import { Calendar } from "../calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

import { cn } from "../lib/utils";
import {
  Controller,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "../form-new";

interface DateRangePickerFieldProps<
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
  disabledDates?: (date: Date) => boolean;
  numberOfMonths?: number;
  fromYear?: number;
  toYear?: number;
}

export function DateRangePickerField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder = "Pick a date range",
  description,
  disabled,
  className,
  required,
  disabledDates,
  numberOfMonths = 2,
  fromYear,
  toYear,
}: DateRangePickerFieldProps<TFieldValues, TName>) {
  const formatDateRange = (dateRange: DateRange | undefined) => {
    if (!dateRange?.from) {
      return placeholder;
    }

    if (dateRange.to) {
      return `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`;
    }

    return format(dateRange.from, "LLL dd, y");
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          className={cn("flex flex-col", className)}
          data-invalid={fieldState.invalid}
        >
          {label && (
            <FieldLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FieldLabel>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-between pl-3 text-left font-normal",
                  !field.value?.from && "text-muted-foreground",
                )}
                disabled={disabled}
                aria-invalid={fieldState.invalid}
              >
                {formatDateRange(field.value)}
                <CalendarIcon className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={field.value?.from as Date | undefined}
                selected={field.value}
                onSelect={field.onChange}
                numberOfMonths={numberOfMonths}
                disabled={disabledDates}
                className="rounded-lg border shadow-sm"
                showOutsideDays={false}
                fromYear={fromYear}
                toYear={toYear}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
