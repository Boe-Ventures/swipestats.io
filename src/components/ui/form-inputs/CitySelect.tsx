"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import * as React from "react";
import { useController } from "react-hook-form";

import type { ComboboxOption } from "../compound/combobox";
import { Combobox } from "../compound/combobox";
import { FormControl, FormItem, FormLabel, FormMessage } from "../form";

// Import type from shared location to avoid duplication
export interface MajorCity {
  id: string;
  name: string;
  country: string;
  countryName: string;
  region: string;
  regionCode?: string;
  currency: "usd" | "eur" | "nok" | "gbp" | "cad" | "thb";
  timezone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  bannerImage: string;
  budgetSuggestions: {
    buy: number;
    rent: number;
    rentShort: number;
  };
  keywords: string[];
}

interface CitySelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  cities: MajorCity[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  onCitySelect?: (city: MajorCity | undefined) => void;
}

export function CitySelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  cities,
  label = "City",
  placeholder = "Search for a city...",
  disabled = false,
  className,
  required = false,
  onCitySelect,
}: CitySelectProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error: _error },
  } = useController({
    name,
    control,
    rules: required ? { required: `${label} is required` } : undefined,
  });

  // Convert cities to combobox options
  const cityOptions: ComboboxOption[] = React.useMemo(() => {
    return cities.map((city) => ({
      value: city.id,
      label: `${city.name}, ${city.region}, ${city.countryName}`,
      keywords: [
        city.name,
        city.region,
        city.countryName,
        city.country,
        ...city.keywords,
      ],
    }));
  }, [cities]);

  // Handle value change and call onCitySelect
  const handleValueChange = (value: string) => {
    field.onChange(value);

    if (onCitySelect) {
      const selectedCity = cities.find((city) => city.id === value);
      onCitySelect(selectedCity);
    }
  };

  // Get selected city for display
  const selectedCity = React.useMemo(() => {
    return cities.find((city) => city.id === field.value);
  }, [cities, field.value]);

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
          options={cityOptions}
          value={field.value}
          onValueChange={handleValueChange}
          placeholder={placeholder}
          searchPlaceholder="Search cities..."
          emptyText="No city found."
          disabled={disabled}
          className="w-full"
        />
      </FormControl>
      {selectedCity && (
        <div className="text-muted-foreground mt-1 text-xs">
          {selectedCity.region}, {selectedCity.countryName} •{" "}
          {selectedCity.currency.toUpperCase()}
        </div>
      )}
      <FormMessage />
    </FormItem>
  );
}
