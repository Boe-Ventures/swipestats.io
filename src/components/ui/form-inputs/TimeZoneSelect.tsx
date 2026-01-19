"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { useController } from "react-hook-form";

import type { ComboboxOption } from "../compound/combobox";
import { Combobox } from "../compound/combobox";
import { FormControl, FormItem, FormLabel, FormMessage } from "../form";

// Generate timezone options using Intl API
function generateTimezoneOptions(): ComboboxOption[] {
  try {
    const timezones = Intl.supportedValuesOf("timeZone");
    const now = new Date();

    return timezones
      .map((tz) => {
        try {
          // Get timezone offset and name
          const formatter = new Intl.DateTimeFormat("en", {
            timeZone: tz,
            timeZoneName: "longOffset",
          });
          const parts = formatter.formatToParts(now);
          const offset =
            parts.find((part) => part.type === "timeZoneName")?.value || "";

          // Create a more readable label
          const cityName = tz.split("/").pop()?.replace(/_/g, " ") || tz;
          const region = tz.split("/")[0];

          return {
            value: tz,
            label: `${offset} ${cityName}${region !== cityName ? ` (${region})` : ""}`,
            keywords: [cityName, region!, tz], // Allow searching by city, region, and timezone code
          };
        } catch {
          // Fallback for unsupported timezones
          return {
            value: tz,
            label: tz.replace(/_/g, " "),
            keywords: [tz, tz.replace(/_/g, " ")],
          };
        }
      })
      .sort((a, b) => {
        // Sort by offset first, then alphabetically
        const offsetRegex = /[+-]\d{2}:\d{2}/;
        const offsetA = offsetRegex.exec(a.label)?.[0] || "";
        const offsetB = offsetRegex.exec(b.label)?.[0] || "";

        if (offsetA !== offsetB) {
          return offsetA.localeCompare(offsetB);
        }

        return a.label.localeCompare(b.label);
      });
  } catch {
    // Fallback for environments that don't support Intl.supportedValuesOf
    return [
      {
        value: "UTC",
        label: "+00:00 UTC",
        keywords: ["UTC", "Coordinated Universal Time"],
      },
      {
        value: "America/New_York",
        label: "-05:00 New York (America)",
        keywords: ["New York", "America", "Eastern Time", "EST", "EDT"],
      },
      {
        value: "America/Los_Angeles",
        label: "-08:00 Los Angeles (America)",
        keywords: ["Los Angeles", "America", "Pacific Time", "PST", "PDT"],
      },
      {
        value: "Europe/London",
        label: "+00:00 London (Europe)",
        keywords: ["London", "Europe", "GMT", "BST"],
      },
      {
        value: "Europe/Paris",
        label: "+01:00 Paris (Europe)",
        keywords: ["Paris", "Europe", "CET", "CEST"],
      },
      {
        value: "Asia/Tokyo",
        label: "+09:00 Tokyo (Asia)",
        keywords: ["Tokyo", "Asia", "JST"],
      },
      {
        value: "Asia/Shanghai",
        label: "+08:00 Shanghai (Asia)",
        keywords: ["Shanghai", "Asia", "CST"],
      },
      {
        value: "Asia/Kolkata",
        label: "+05:30 Kolkata (Asia)",
        keywords: ["Kolkata", "India", "Asia", "IST"],
      },
      {
        value: "Australia/Sydney",
        label: "+11:00 Sydney (Australia)",
        keywords: ["Sydney", "Australia", "AEST", "AEDT"],
      },
    ];
  }
}

// Memoize timezone options since they don't change
const timezoneOptions = generateTimezoneOptions();

interface TimeZoneSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export function TimeZoneSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label = "Time Zone",
  placeholder = "Select a time zone...",
  disabled = false,
  className,
  required = false,
}: TimeZoneSelectProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error: _error },
  } = useController({
    name,
    control,
    rules: required ? { required: `${label} is required` } : undefined,
  });

  return (
    <FormItem className={className}>
      {label && (
        <FormLabel>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
      )}
      <FormControl>
        <Combobox
          options={timezoneOptions}
          value={field.value}
          onValueChange={field.onChange}
          placeholder={placeholder}
          searchPlaceholder="Search time zones..."
          emptyText="No time zone found."
          disabled={disabled}
          className="w-full"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

// Helper function to get user's detected timezone
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

// Helper function to get timezone offset
export function getTimezoneOffset(
  timezone: string,
  date: Date = new Date(),
): string {
  try {
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    });
    const parts = formatter.formatToParts(date);
    return (
      parts.find((part) => part.type === "timeZoneName")?.value || "+00:00"
    );
  } catch {
    return "+00:00";
  }
}

// Helper function to get all timezones
export function getAllTimezones() {
  return timezoneOptions;
}
