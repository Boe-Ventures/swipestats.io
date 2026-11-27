"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock3, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type Field = {
  name: string;
  label: string;
  type?: "number" | "textarea" | "list" | "url" | "date" | "time" | "multi";
  options?: string[];
  optionLabels?: Record<string, string>;
  required?: boolean;
  min?: number;
  max?: number;
};

type Section = { title: string; description: string; names: string[] };
const personSections: Section[] = [
  {
    title: "The basics",
    description: "A name and a few words to remember them by.",
    names: ["displayName", "tagline", "summary"],
  },
  {
    title: "Current residence",
    description: "Current home, separate from where encounters happened.",
    names: [
      "currentResidenceCountryCode",
      "currentResidenceSubdivisionCode",
      "currentResidenceCity",
    ],
  },
  {
    title: "Origin & nationality",
    description:
      "One primary country of origin, optional other origins, and any nationalities.",
    names: [
      "originCountryCode",
      "additionalOriginCountryCodes",
      "originSubdivisionCode",
      "originCity",
      "nationalityCodes",
    ],
  },
  {
    title: "Background & appearance",
    description:
      "Optional details. Keep impressions and uncertainty in the notes.",
    names: [
      "backgroundGroups",
      "backgroundDetail",
      "backgroundSource",
      "backgroundNotes",
      "eyeColor",
      "eyeColorNotes",
      "heightCm",
      "appearance",
    ],
  },
  {
    title: "When you met",
    description: "Your ages at the start, including estimates.",
    names: [
      "ageAtFirstMeeting",
      "myAgeAtFirstMeeting",
      "firstMetYear",
      "ageIsEstimated",
      "myAgeIsEstimated",
    ],
  },
  {
    title: "Work & interests",
    description: "What they do and how freely they can travel.",
    names: [
      "occupation",
      "industry",
      "sideOccupations",
      "workArrangement",
      "remoteRegion",
      "interests",
    ],
  },
  {
    title: "Your connection",
    description: "How it started, what you wanted, and how it felt.",
    names: [
      "firstContactMethod",
      "firstContactPlatform",
      "firstContactInitiator",
      "lookingFor",
      "compatibility",
      "chemistry",
      "contactContext",
    ],
  },
];
const encounterSections: Section[] = [
  {
    title: "The encounter",
    description: "What kind of contact you had and who initiated.",
    names: ["kind", "medium", "platform", "initiator", "status"],
  },
  {
    title: "Date & time",
    description:
      "Leave unknown dates or times blank. Add an approximate date in your own words.",
    names: ["date", "time", "dateNote"],
  },
  {
    title: "Place",
    description: "Where it happened, with an optional map link.",
    names: ["countryCode", "subdivisionCode", "city", "venueName", "mapUrl"],
  },
  {
    title: "Your reflection",
    description: "What happened and how it felt.",
    names: [
      "description",
      "reflection",
      "activities",
      "experienceRating",
      "chemistry",
      "compatibility",
    ],
  },
];

function optionLabel(value: string) {
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  const label = value.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function DateControl({
  id,
  field,
  initial,
}: {
  id: string;
  field: Field;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  return (
    <>
      <input type="hidden" name={field.name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              className="w-full justify-between font-normal"
              aria-label={field.label}
            >
              {selected ? format(selected, "PPP") : "Pick a date"}
              <CalendarIcon className="text-muted-foreground size-4" />
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            fromYear={1900}
            toYear={new Date().getFullYear() + 5}
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              setValue(date ? format(date, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
          />
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setValue("");
                setOpen(false);
              }}
            >
              Clear date
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

function MultiChoiceControl({
  id,
  field,
  initial,
}: {
  id: string;
  field: Field;
  initial: unknown;
}) {
  const [values, setValues] = useState<string[]>(
    Array.isArray(initial) ? (initial as string[]) : [],
  );
  const label = (value: string) =>
    field.optionLabels?.[value] ?? optionLabel(value);
  if ((field.options?.length ?? 0) <= 12)
    return (
      <div
        id={id}
        className="grid gap-2 sm:grid-cols-2"
        role="group"
        aria-label={field.label}
      >
        {field.options?.map((value) => (
          <label key={value} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={field.name}
              value={value}
              checked={values.includes(value)}
              onChange={(event) =>
                setValues(
                  event.target.checked
                    ? [...values, value]
                    : values.filter((v) => v !== value),
                )
              }
            />
            {label(value)}
          </label>
        ))}
      </div>
    );
  return (
    <div id={id} className="space-y-2">
      <select
        aria-label={field.label}
        className="w-full rounded-md border p-2"
        value=""
        onChange={(event) => {
          if (event.target.value) setValues([...values, event.target.value]);
        }}
      >
        <option value="">Add a country</option>
        {field.options
          ?.filter((v) => !values.includes(v))
          .map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
      </select>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded border px-2 py-1 text-sm">
            <input type="hidden" name={field.name} value={value} />
            {label(value)}
            <button
              type="button"
              className="ml-2"
              aria-label={`Remove ${label(value)} from ${field.label}`}
              onClick={() => setValues(values.filter((v) => v !== value))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function FormField({ field, initial }: { field: Field; initial: unknown }) {
  const id = useId();
  const value = Array.isArray(initial)
    ? initial.join(", ")
    : ["string", "number", "boolean"].includes(typeof initial)
      ? String(initial)
      : "";
  const options = [
    { value: "", label: "Not specified" },
    ...(field.options ?? []).map((value) => ({
      value,
      label: field.optionLabels?.[value] ?? optionLabel(value),
    })),
  ];
  const common = {
    id,
    name: field.name,
    "aria-label": field.label,
    defaultValue: value,
    required: field.required,
  };
  return (
    <div
      className={`space-y-2 ${field.type === "textarea" || field.type === "url" ? "sm:col-span-2" : ""}`}
    >
      <label htmlFor={id} className="text-sm font-medium">
        {field.label}
      </label>
      {field.type === "multi" ? (
        <MultiChoiceControl id={id} field={field} initial={initial} />
      ) : field.options ? (
        <Select name={field.name} defaultValue={value} items={options}>
          <SelectTrigger id={id} aria-label={field.label} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "date" ? (
        <DateControl id={id} field={field} initial={value} />
      ) : field.type === "time" || field.type === "url" ? (
        <>
          <InputGroup>
            <InputGroupAddon>
              {field.type === "time" ? (
                <Clock3 aria-hidden="true" />
              ) : (
                <LinkIcon aria-hidden="true" />
              )}
            </InputGroupAddon>
            <InputGroupInput
              {...common}
              type={field.type}
              step={field.type === "time" ? 60 : undefined}
              placeholder={
                field.type === "url" ? "https://maps.google.com/…" : undefined
              }
              aria-describedby={`${id}-help`}
            />
          </InputGroup>
          <p id={`${id}-help`} className="text-muted-foreground text-xs">
            {field.type === "time"
              ? "Your local time. Leave blank if you only know the day."
              : "Paste a Google Maps or other place link, starting with https://."}
          </p>
        </>
      ) : field.type === "textarea" ? (
        <Textarea {...common} rows={4} />
      ) : (
        <Input
          {...common}
          type={field.type === "number" ? "number" : "text"}
          min={field.min}
          max={field.max}
          step={field.type === "number" ? 1 : undefined}
        />
      )}
    </div>
  );
}

export function Fields({
  fields,
  initial,
}: {
  fields: Field[];
  initial: Record<string, unknown>;
}) {
  const sections = fields.some((field) => field.name === "currentResidenceCity")
    ? personSections
    : fields.some((field) => field.name === "dateNote")
      ? encounterSections
      : null;
  const grid = (items: Field[]) => (
    <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
      {items.map((field) => (
        <FormField
          key={field.name}
          field={field}
          initial={initial[field.name]}
        />
      ))}
    </div>
  );
  if (!sections) return grid(fields);
  return (
    <div className="space-y-8">
      {sections
        .filter((section) =>
          section.names.some((name) =>
            fields.some((field) => field.name === name),
          ),
        )
        .map((section) => (
          <section
            key={section.title}
            className="border-t pt-6 first:border-t-0 first:pt-0"
          >
            <h4 className="text-base font-medium">{section.title}</h4>
            <p className="text-muted-foreground mt-2 mb-5 text-sm">
              {section.description}
            </p>
            {grid(
              section.names.flatMap((name) =>
                fields.filter((field) => field.name === name),
              ),
            )}
          </section>
        ))}
    </div>
  );
}
