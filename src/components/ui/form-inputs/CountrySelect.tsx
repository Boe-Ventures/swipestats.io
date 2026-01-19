"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import * as React from "react";
import { allCountries } from "country-region-data";
import { useController } from "react-hook-form";

import type { ComboboxOption } from "../compound/combobox";
import { Combobox } from "../compound/combobox";
import { FormControl, FormItem, FormLabel, FormMessage } from "../form";

export type {
  CountrySlug,
  CountryName,
  RegionName,
  RegionSlug,
} from "country-region-data";

// Types for country-region-data
export interface Region {
  name: string;
  shortCode: string;
}

export interface CountryRegion {
  countryName: string;
  countryShortCode: string;
  regions: Region[];
}

// Transform country-region-data to our format
function transformCountryData(): CountryRegion[] {
  return allCountries.map(([countryName, countryShortCode, regions]) => ({
    countryName,
    countryShortCode,
    regions: regions.map(([name, shortCode]) => ({ name, shortCode })),
  }));
}

const countryData = transformCountryData();

// Filter functions (inspired by the provided helper functions)
export const filterCountries = (
  countries: CountryRegion[],
  priorityCountries: string[] = [],
  whitelist: string[] = [],
  blacklist: string[] = [],
): CountryRegion[] => {
  const countriesListedFirst: CountryRegion[] = [];
  let filteredCountries = countries;

  if (whitelist.length > 0) {
    filteredCountries = countries.filter(({ countryShortCode }) =>
      whitelist.includes(countryShortCode),
    );
  } else if (blacklist.length > 0) {
    filteredCountries = countries.filter(
      ({ countryShortCode }) => !blacklist.includes(countryShortCode),
    );
  }

  if (priorityCountries.length > 0) {
    priorityCountries.forEach((slug) => {
      const result = filteredCountries.find(
        ({ countryShortCode }) => countryShortCode === slug,
      );
      if (result) {
        countriesListedFirst.push(result);
      }
    });

    filteredCountries = filteredCountries.filter(
      ({ countryShortCode }) => !priorityCountries.includes(countryShortCode),
    );
  }

  return countriesListedFirst.length
    ? [...countriesListedFirst, ...filteredCountries]
    : filteredCountries;
};

export const filterRegions = (
  regions: Region[],
  priorityRegions: string[] = [],
  whitelist: string[] = [],
  blacklist: string[] = [],
): Region[] => {
  const regionsListedFirst: Region[] = [];
  let filteredRegions = regions;

  if (whitelist.length > 0) {
    filteredRegions = regions.filter(({ shortCode }) =>
      whitelist.includes(shortCode),
    );
  } else if (blacklist.length > 0) {
    filteredRegions = regions.filter(
      ({ shortCode }) => !blacklist.includes(shortCode),
    );
  }

  if (priorityRegions.length > 0) {
    priorityRegions.forEach((slug) => {
      const result = filteredRegions.find(
        ({ shortCode }) => shortCode === slug,
      );
      if (result) {
        regionsListedFirst.push(result);
      }
    });

    filteredRegions = filteredRegions.filter(
      ({ shortCode }) => !priorityRegions.includes(shortCode),
    );
  }

  return regionsListedFirst.length
    ? [...regionsListedFirst, ...filteredRegions]
    : filteredRegions;
};

interface CountrySelectProps<
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
  priorityOptions?: string[];
  whitelist?: string[];
  blacklist?: string[];
}

export function CountrySelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  label = "Country",
  placeholder = "Select a country...",
  disabled = false,
  className,
  required = false,
  priorityOptions = [],
  whitelist = [],
  blacklist = [],
}: CountrySelectProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error: _error },
  } = useController({
    name,
    control,
    rules: required ? { required: `${label} is required` } : undefined,
  });

  // Filter countries based on props
  const filteredCountries = React.useMemo(() => {
    return filterCountries(countryData, priorityOptions, whitelist, blacklist);
  }, [priorityOptions, whitelist, blacklist]);

  // Convert filtered countries to combobox options
  const countryOptions: ComboboxOption[] = React.useMemo(() => {
    return filteredCountries
      .map(({ countryName, countryShortCode }) => ({
        value: countryShortCode,
        label: countryName,
        keywords: [countryName, countryShortCode],
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredCountries]);

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
          options={countryOptions}
          value={field.value}
          onValueChange={field.onChange}
          placeholder={placeholder}
          searchPlaceholder="Search countries..."
          emptyText="No country found."
          disabled={disabled}
          className="w-full"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

interface RegionSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  control: Control<TFieldValues>;
  name: TName;
  countryCode: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  priorityOptions?: string[];
  whitelist?: string[];
  blacklist?: string[];
}

export function RegionSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  control,
  name,
  countryCode,
  label = "Region",
  placeholder = "Select a region...",
  disabled = false,
  className,
  required = false,
  priorityOptions = [],
  whitelist = [],
  blacklist = [],
}: RegionSelectProps<TFieldValues, TName>) {
  const {
    field,
    fieldState: { error: _error },
  } = useController({
    name,
    control,
    rules: required ? { required: `${label} is required` } : undefined,
  });

  // Get regions for the selected country
  const regions = React.useMemo(() => {
    if (!countryCode) return [];

    const country = countryData.find((c) => c.countryShortCode === countryCode);
    if (!country) return [];

    return filterRegions(
      country.regions,
      priorityOptions,
      whitelist,
      blacklist,
    );
  }, [countryCode, priorityOptions, whitelist, blacklist]);

  // Convert regions to combobox options
  const regionOptions: ComboboxOption[] = React.useMemo(() => {
    return regions.map(({ name, shortCode }) => ({
      value: shortCode,
      label: name,
      keywords: [name, shortCode],
    }));
  }, [regions]);

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
          options={regionOptions}
          value={field.value}
          onValueChange={field.onChange}
          placeholder={placeholder}
          searchPlaceholder="Search regions..."
          emptyText="No region found."
          disabled={disabled}
          className="w-full"
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

// Helper function to get country data by code
export function getCountryByCode(code: string): CountryRegion | undefined {
  return countryData.find((country) => country.countryShortCode === code);
}

// Helper function to get all countries
export function getAllCountries(): CountryRegion[] {
  return countryData;
}

// Helper function to get regions by country code
export function getRegionsByCountryCode(countryCode: string): Region[] {
  const country = getCountryByCode(countryCode);
  return country ? country.regions : [];
}

// Updated getCountryCodeByName function to work with country-region-data
export function getCountryCodeByName(name: string): string | null {
  if (!name || typeof name !== "string") return null;

  const normalizedName = name.toLowerCase().trim();

  // First try exact match
  for (const country of countryData) {
    if (country.countryName.toLowerCase() === normalizedName) {
      return country.countryShortCode;
    }
  }

  // Then try partial match
  for (const country of countryData) {
    if (
      country.countryName.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(country.countryName.toLowerCase())
    ) {
      return country.countryShortCode;
    }
  }

  // Common country name mappings for geo detection compatibility
  const commonMappings: Record<string, string> = {
    "united states": "US",
    usa: "US",
    america: "US",
    "united states of america": "US",
    canada: "CA",
    "united kingdom": "GB",
    uk: "GB",
    england: "GB",
    "great britain": "GB",
    norway: "NO",
    germany: "DE",
    deutschland: "DE",
    france: "FR",
    spain: "ES",
    españa: "ES",
    italy: "IT",
    italia: "IT",
    netherlands: "NL",
    holland: "NL",
    thailand: "TH",
  };

  return commonMappings[normalizedName] || null;
}
