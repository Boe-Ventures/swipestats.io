"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import * as React from "react";
import { useEffect, useState } from "react";
import { parseDate } from "chrono-node";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "../button";
import { Calendar } from "../calendar";
import { Input } from "../input";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

import { cn } from "../lib/utils";
import {
  Controller,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  getFieldControlA11yProps,
  getFormFieldIds,
} from "../form-new";

interface DatePickerFieldProps<
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
  captionLayout?: "dropdown" | "label" | "dropdown-months" | "dropdown-years";
  fromYear?: number;
  toYear?: number;
}

export function DatePickerField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder = "Pick a date",
  description,
  disabled,
  className,
  required,
  disabledDates,
  captionLayout = "dropdown",
  fromYear,
  toYear,
}: DatePickerFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const ids = getFormFieldIds(field.name);
        const controlA11y = getFieldControlA11yProps(field.name, {
          hasDescription: Boolean(description),
          hasError: fieldState.invalid,
          "aria-invalid": fieldState.invalid,
        });
        return (
          <Field
            className={cn("flex flex-col", className)}
            data-invalid={fieldState.invalid}
          >
            {label && (
              <FieldLabel id={ids.labelId} htmlFor={controlA11y.id}>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </FieldLabel>
            )}
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    {...controlA11y}
                    variant="outline"
                    className={cn(
                      "w-full justify-between pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                    disabled={disabled}
                  >
                    {field.value ? (
                      format(field.value, "PPP")
                    ) : (
                      <span>{placeholder}</span>
                    )}
                    <CalendarIcon className="h-4 w-4 opacity-50" />
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={disabledDates}
                  captionLayout={captionLayout}
                  fromYear={fromYear}
                  toYear={toYear}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {description && (
              <FieldDescription id={ids.descriptionId}>
                {description}
              </FieldDescription>
            )}
            {fieldState.invalid && (
              <FieldError id={ids.errorId} errors={[fieldState.error]} />
            )}
          </Field>
        );
      }}
    />
  );
}

interface NaturalDatePickerFieldProps<
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
  fromYear?: number;
  toYear?: number;
}

// Internal component to handle the natural date picker logic
interface NaturalDatePickerInputProps {
  field: {
    name?: string;
    value: Date | undefined;
    onChange: (value: Date | undefined) => void;
  };
  placeholder: string;
  disabled?: boolean;
  disabledDates?: (date: Date) => boolean;
  fromYear?: number;
  toYear?: number;
  controlA11y: ReturnType<typeof getFieldControlA11yProps>;
}

function NaturalDatePickerInput({
  field,
  placeholder,
  disabled,
  disabledDates,
  fromYear,
  toYear,
  controlA11y,
}: NaturalDatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Sync input value with field value
  useEffect(() => {
    if (field.value) {
      setInputValue(format(field.value, "PPP"));
    } else if (inputValue) {
      setInputValue("");
    }
  }, [field.value, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (!value.trim()) {
      // Clear the date if input is empty
      field.onChange(undefined);
      return;
    }

    const parsedDate = parseDate(value);
    if (parsedDate) {
      field.onChange(parsedDate);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      field.onChange(date);
      setInputValue(format(date, "PPP"));
      setOpen(false);
    }
  };

  return (
    <div className="relative flex gap-2">
      <Input
        {...controlA11y}
        value={inputValue}
        placeholder={placeholder}
        className="bg-background pr-10"
        disabled={disabled}
        onChange={handleInputChange}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
              disabled={disabled}
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          }
        />
        <PopoverContent className="w-auto overflow-hidden p-0" align="end">
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={handleDateSelect}
            disabled={disabledDates}
            captionLayout="dropdown"
            fromYear={fromYear}
            toYear={toYear}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function NaturalDatePickerField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder = "Tomorrow or next week",
  description,
  disabled,
  className,
  required,
  disabledDates,
  fromYear,
  toYear,
}: NaturalDatePickerFieldProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const ids = getFormFieldIds(field.name);
        const controlA11y = getFieldControlA11yProps(field.name, {
          hasDescription: Boolean(description),
          hasError: fieldState.invalid,
          "aria-invalid": fieldState.invalid,
        });
        return (
          <Field className={className} data-invalid={fieldState.invalid}>
            {label && (
              <FieldLabel id={ids.labelId} htmlFor={controlA11y.id}>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </FieldLabel>
            )}
            <NaturalDatePickerInput
              field={field}
              placeholder={placeholder}
              disabled={disabled}
              disabledDates={disabledDates}
              fromYear={fromYear}
              toYear={toYear}
              controlA11y={controlA11y}
            />
            {description && (
              <FieldDescription id={ids.descriptionId}>
                {description}
              </FieldDescription>
            )}
            {fieldState.invalid && (
              <FieldError id={ids.errorId} errors={[fieldState.error]} />
            )}
          </Field>
        );
      }}
    />
  );
}

// Keep the old Calendar29 for backwards compatibility (deprecated)
export function Calendar29() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("In 2 days");
  const [date, setDate] = React.useState<Date | undefined>(
    parseDate(value) || undefined,
  );

  function formatDate(date: Date | undefined) {
    if (!date) {
      return "";
    }
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="date" className="px-1">
        Schedule Date
      </label>
      <div className="relative flex gap-2">
        <Input
          id="date"
          value={value}
          placeholder="Tomorrow or next week"
          className="bg-background pr-10"
          onChange={(e) => {
            setValue(e.target.value);
            const date = parseDate(e.target.value);
            if (date) {
              setDate(date);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                id="date-picker"
                variant="ghost"
                className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
              >
                <CalendarIcon className="size-3.5" />
                <span className="sr-only">Select date</span>
              </Button>
            }
          />
          <PopoverContent className="w-auto overflow-hidden p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={(date) => {
                if (date) {
                  setDate(date);
                  setValue(formatDate(date));
                  setOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="text-muted-foreground px-1 text-sm">
        Your post will be published on{" "}
        <span className="font-medium">{formatDate(date)}</span>.
      </div>
    </div>
  );
}
