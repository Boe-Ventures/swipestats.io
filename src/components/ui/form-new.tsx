"use client";

/**
 * Modern React Hook Form Components
 *
 * This module provides a modern, explicit approach to building forms with React Hook Form.
 * It follows the latest best practices for accessibility, validation, and developer experience.
 *
 * Key differences from legacy form.tsx:
 * - Uses direct Controller instead of wrapped FormField
 * - Explicit fieldState handling for validation states
 * - Proper aria-invalid and data-invalid attributes
 * - More flexible and composable
 *
 * @example Basic Input Field
 * ```tsx
 * <Controller
 *   name="email"
 *   control={form.control}
 *   render={({ field, fieldState }) => (
 *     <Field data-invalid={fieldState.invalid}>
 *       <FieldLabel htmlFor={field.name}>Email</FieldLabel>
 *       <Input
 *         {...field}
 *         id={field.name}
 *         type="email"
 *         aria-invalid={fieldState.invalid}
 *       />
 *       <FieldDescription>We'll never share your email.</FieldDescription>
 *       {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
 *     </Field>
 *   )}
 * />
 * ```
 *
 * @example Select Field
 * ```tsx
 * <Controller
 *   name="country"
 *   control={form.control}
 *   render={({ field, fieldState }) => (
 *     <Field data-invalid={fieldState.invalid}>
 *       <FieldLabel htmlFor={field.name}>Country</FieldLabel>
 *       <Select value={field.value} onValueChange={field.onChange}>
 *         <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
 *           <SelectValue placeholder="Select" />
 *         </SelectTrigger>
 *         <SelectContent>
 *           <SelectItem value="us">United States</SelectItem>
 *         </SelectContent>
 *       </Select>
 *       {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
 *     </Field>
 *   )}
 * />
 * ```
 *
 * @example Checkbox Array
 * ```tsx
 * <Controller
 *   name="preferences"
 *   control={form.control}
 *   render={({ field, fieldState }) => (
 *     <FieldSet>
 *       <FieldLegend>Preferences</FieldLegend>
 *       <FieldGroup data-slot="checkbox-group">
 *         {options.map((option) => (
 *           <Field key={option.id} orientation="horizontal" data-invalid={fieldState.invalid}>
 *             <Checkbox
 *               id={option.id}
 *               checked={field.value?.includes(option.id)}
 *               onCheckedChange={(checked) => {
 *                 const newValue = checked
 *                   ? [...(field.value || []), option.id]
 *                   : (field.value || []).filter((v) => v !== option.id);
 *                 field.onChange(newValue);
 *               }}
 *               aria-invalid={fieldState.invalid}
 *             />
 *             <FieldLabel htmlFor={option.id}>{option.label}</FieldLabel>
 *           </Field>
 *         ))}
 *       </FieldGroup>
 *       {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
 *     </FieldSet>
 *   )}
 * />
 * ```
 */

import * as React from "react";
import type { FieldError as RHFFieldError } from "react-hook-form";
import { cn } from "./lib/utils";

// Re-export for convenience
export {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
export { zodResolver } from "@hookform/resolvers/zod";

/* -----------------------------------------------------------------------------
 * Field - Main container for form fields
 * Supports responsive layouts and validation states
 * -------------------------------------------------------------------------- */

type FieldOrientation = "horizontal" | "vertical" | "responsive";

interface FieldProps extends React.ComponentProps<"div"> {
  /**
   * Layout orientation for the field
   * - horizontal: Label and control side by side
   * - vertical: Label above control (default)
   * - responsive: Vertical on mobile, horizontal on desktop
   */
  orientation?: FieldOrientation;
  /**
   * Set to true when the field has validation errors
   * Enables error styling via CSS
   */
  "data-invalid"?: boolean;
}

function Field({ className, orientation = "vertical", ...props }: FieldProps) {
  return (
    <div
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "grid gap-2",
        orientation === "horizontal" && "grid-cols-[1fr_auto] items-center",
        orientation === "responsive" &&
          "grid-cols-1 md:grid-cols-[1fr_auto] md:items-center",
        className,
      )}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * FieldContent - Groups label and description (for responsive layouts)
 * -------------------------------------------------------------------------- */

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("grid gap-1.5", className)}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * FieldLabel - Accessible label for form controls
 * -------------------------------------------------------------------------- */

interface FieldLabelProps extends React.ComponentProps<"label"> {
  /**
   * Visual style variant
   */
  variant?: "default" | "label";
}

function FieldLabel({
  className,
  variant = "default",
  ...props
}: FieldLabelProps) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        variant === "label" && "text-base",
        className,
      )}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * FieldDescription - Helper text for form fields
 * -------------------------------------------------------------------------- */

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * FieldError - Displays validation errors
 * -------------------------------------------------------------------------- */

interface FieldErrorProps extends Omit<React.ComponentProps<"p">, "children"> {
  /**
   * Array of field errors from React Hook Form
   * Typically pass [fieldState.error] from Controller render prop
   */
  errors?: Array<RHFFieldError | undefined>;
}

function FieldError({ className, errors, ...props }: FieldErrorProps) {
  const errorMessages = errors
    ?.filter((error): error is RHFFieldError => !!error?.message)
    .map((error) => error.message);

  if (!errorMessages || errorMessages.length === 0) {
    return null;
  }

  return (
    <p
      data-slot="field-error"
      className={cn("text-destructive text-sm font-medium", className)}
      role="alert"
      {...props}
    >
      {errorMessages.join(", ")}
    </p>
  );
}

/* -----------------------------------------------------------------------------
 * FieldSet - Semantic grouping for related fields (radio groups, checkboxes)
 * -------------------------------------------------------------------------- */

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="fieldset"
      className={cn("grid gap-3", className)}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * FieldLegend - Caption for FieldSet
 * -------------------------------------------------------------------------- */

interface FieldLegendProps extends React.ComponentProps<"legend"> {
  variant?: "default" | "label";
}

function FieldLegend({
  className,
  variant = "default",
  ...props
}: FieldLegendProps) {
  return (
    <legend
      data-slot="field-legend"
      className={cn(
        "text-sm font-medium",
        variant === "label" && "text-base",
        className,
      )}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * FieldGroup - Container for multiple related fields
 * -------------------------------------------------------------------------- */

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "grid gap-3",
        // Special spacing for checkbox groups
        "data-[slot=checkbox-group]:gap-2",
        className,
      )}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * FieldTitle - Title within a field (for complex layouts)
 * -------------------------------------------------------------------------- */

function FieldTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  );
}

/* -----------------------------------------------------------------------------
 * Exports
 * -------------------------------------------------------------------------- */

export {
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldTitle,
};
