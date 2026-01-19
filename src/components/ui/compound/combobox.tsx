"use client";

import * as React from "react";

import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../lib/utils";
import { Button } from "../button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../command";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "../drawer";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

export type ComboboxOption = {
  value: string;
  label: string;
  keywords?: string[];
};

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const selectedOption = options.find((option) => option.value === value);

  if (isDesktop) {
    return (
      <div className={className}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn("w-full justify-between", triggerClassName)}
              disabled={disabled}
            >
              {selectedOption ? selectedOption.label : placeholder}
              <svg
                className="ml-2 h-4 w-4 shrink-0 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                />
              </svg>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className={cn("p-0", contentClassName)}
            style={{ width: "var(--radix-popper-anchor-width)" }}
            align="start"
          >
            <OptionsList
              options={options}
              selectedValue={value}
              onValueChange={onValueChange}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
              setOpen={setOpen}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className={className}>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            className={cn("w-full justify-between", triggerClassName)}
            disabled={disabled}
          >
            {selectedOption ? selectedOption.label : placeholder}
            <svg
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerTitle className="sr-only">{placeholder}</DrawerTitle>
          <div className="mt-4 border-t">
            <OptionsList
              options={options}
              selectedValue={value}
              onValueChange={onValueChange}
              searchPlaceholder={searchPlaceholder}
              emptyText={emptyText}
              setOpen={setOpen}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

interface OptionsListProps {
  options: ComboboxOption[];
  selectedValue?: string;
  onValueChange?: (value: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  setOpen: (open: boolean) => void;
}

function OptionsList({
  options,
  selectedValue,
  onValueChange,
  searchPlaceholder,
  emptyText,
  setOpen,
}: OptionsListProps) {
  return (
    <Command>
      <CommandInput placeholder={searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{emptyText}</CommandEmpty>
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              keywords={option.keywords}
              onSelect={(currentValue) => {
                onValueChange?.(
                  currentValue === selectedValue ? "" : currentValue,
                );
                setOpen(false);
              }}
            >
              <svg
                className={cn(
                  "mr-2 h-4 w-4",
                  selectedValue === option.value ? "opacity-100" : "opacity-0",
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
