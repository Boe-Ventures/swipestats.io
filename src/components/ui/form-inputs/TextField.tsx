"use client";

import type * as React from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

import {
  Controller,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  getFieldControlA11yProps,
  getFormFieldIds,
} from "../form-new";
import { Input } from "../input";
import { Textarea } from "../textarea";

interface TextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  placeholder?: string;
  description?: string;
  type?: React.HTMLInputTypeAttribute;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
}

export function TextField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder,
  description,
  type = "text",
  disabled,
  className,
  required,
  multiline = false,
  rows = 3,
}: TextFieldProps<TFieldValues, TName>) {
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
            {multiline ? (
              <Textarea
                {...field}
                {...controlA11y}
                rows={rows}
                placeholder={placeholder}
                disabled={disabled}
              />
            ) : (
              <Input
                {...field}
                {...controlA11y}
                type={type}
                placeholder={placeholder}
                disabled={disabled}
              />
            )}
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
