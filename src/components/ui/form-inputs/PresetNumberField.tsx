"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import * as React from "react";
import { useController } from "react-hook-form";

import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "../form";
import { Label } from "../label";
import { Switch } from "../switch";
import { ToggleGroup, ToggleGroupItem } from "../toggle-group";
import { NumberField } from "./NumberField";

interface PresetOption {
  label: string;
  value: number;
}

interface PresetNumberFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
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
  presets: PresetOption[];
  defaultUseCustom?: boolean;
  unit?: string;
  placeholder?: string;
}

export function PresetNumberField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
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
  presets,
  defaultUseCustom = false,
  placeholder,
}: PresetNumberFieldProps<TFieldValues, TName>) {
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

  // Check if current value matches any preset
  const currentValue = field.value;
  const matchingPreset = presets.find(
    (preset) => preset.value === currentValue,
  );

  // Track whether user wants to use custom input
  const [useCustom, setUseCustom] = React.useState(
    defaultUseCustom || (!matchingPreset && currentValue !== undefined),
  );

  // For toggle group, we need a string value
  const toggleValue = matchingPreset ? matchingPreset.value.toString() : "";

  const handleToggleChange = (value: string) => {
    if (!value) {
      // If no value selected, clear the field
      field.onChange(undefined);
      return;
    }

    // Find the preset and set its value
    const preset = presets.find((p) => p.value.toString() === value);
    if (preset) {
      field.onChange(preset.value);
      setUseCustom(false); // Switch back to presets when a preset is selected
    }
  };

  const handleCustomToggle = (checked: boolean) => {
    setUseCustom(checked);
    if (!checked) {
      // If switching back to presets, clear value if no preset matches
      if (!matchingPreset) {
        field.onChange(undefined);
      }
    }
  };

  return (
    <FormItem className={className}>
      {label && (
        <div className="flex h-3.5 items-center gap-2">
          <FormLabel className="leading-none">{label}</FormLabel>
          <div className="flex items-center space-x-2">
            <Label
              htmlFor={`${name}-custom-switch`}
              className="text-muted-foreground sr-only text-xs leading-none"
            >
              custom
            </Label>
            <Switch
              id={`${name}-custom-switch`}
              checked={useCustom}
              onCheckedChange={handleCustomToggle}
              disabled={disabled}
              className="scale-75"
            />
          </div>
        </div>
      )}
      <FormControl>
        <div>
          {!useCustom ? (
            <ToggleGroup
              variant="outline"
              type="single"
              value={toggleValue}
              onValueChange={handleToggleChange}
              disabled={disabled}
              className="justify-start"
            >
              {presets.map((preset) => (
                <ToggleGroupItem
                  key={preset.value}
                  value={preset.value.toString()}
                  className="data-[state=on]:bg-primary px-3 data-[state=on]:text-white"
                >
                  {preset.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : (
            <NumberField
              control={control}
              name={name}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              allowDecimals={allowDecimals}
              currency={currency}
              thousandSeparator={thousandSeparator}
              disabled={disabled}
              className="mb-0"
            />
          )}
        </div>
      </FormControl>
      {description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
}
