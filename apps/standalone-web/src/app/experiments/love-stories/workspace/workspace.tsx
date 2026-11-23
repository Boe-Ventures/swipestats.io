"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { domain, domainClient, type RouterOutputs } from "@/domain/react";
import { authClient } from "@/server/better-auth/client";
import {
  personFields,
  encounterFields,
  entryFields,
} from "@/lib/love-stories/model";

const api = domainClient.loveStories;
const button =
  "rounded-lg border border-stone-300 px-3 py-2 text-sm hover:bg-stone-100 disabled:opacity-40";
const primary = `${button} bg-stone-800 text-white hover:bg-stone-700`;
const inputStyle =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white p-2 text-stone-900";
type Encounter = RouterOutputs["loveStories"]["encounter"]["list"][number];
type Entry = RouterOutputs["loveStories"]["entry"]["get"];
type Field = {
  name: string;
  label: string;
  type?: "number" | "textarea" | "list" | "url" | "date" | "time";
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
};
const personFormFields: Field[] = [
  { name: "displayName", label: "Name", required: true },
  { name: "tagline", label: "A few words about them" },
  { name: "summary", label: "Your overall reflection", type: "textarea" },
  {
    name: "currentResidenceCountryCode",
    label: "Current country (two-letter code)",
  },
  {
    name: "currentResidenceSubdivisionCode",
    label: "Current state / region code",
  },
  { name: "currentResidenceCity", label: "Current city" },
  { name: "originCountryCode", label: "Origin country (two-letter code)" },
  { name: "originSubdivisionCode", label: "Origin state / region code" },
  { name: "originCity", label: "Origin city" },
  {
    name: "nationalityCodes",
    label: "Nationality codes, separated by commas",
    type: "list",
  },
  {
    name: "ageAtFirstMeeting",
    label: "Their age when you met",
    type: "number",
    min: 0,
    max: 130,
  },
  {
    name: "myAgeAtFirstMeeting",
    label: "Your age when you met",
    type: "number",
    min: 0,
    max: 130,
  },
  {
    name: "firstMetYear",
    label: "Year you met",
    type: "number",
    min: 1900,
    max: 2200,
  },
  {
    name: "ageIsEstimated",
    label: "Their age is an estimate",
    options: ["true", "false"],
  },
  {
    name: "myAgeIsEstimated",
    label: "Your age is an estimate",
    options: ["true", "false"],
  },
  { name: "occupation", label: "Occupation" },
  { name: "industry", label: "Industry" },
  {
    name: "sideOccupations",
    label: "Side occupations, separated by commas",
    type: "list",
  },
  {
    name: "workArrangement",
    label: "Work arrangement",
    options: ["in_office", "hybrid", "remote"],
  },
  {
    name: "remoteRegion",
    label: "Remote region",
    options: ["americas", "europe_africa", "asia_pacific", "worldwide"],
  },
  { name: "interests", label: "Interests, separated by commas", type: "list" },
  { name: "firstContactMethod", label: "How you first connected" },
  { name: "firstContactPlatform", label: "First contact platform" },
  {
    name: "firstContactInitiator",
    label: "Who initiated",
    options: ["me", "them", "mutual", "unknown"],
  },
  { name: "lookingFor", label: "Looking for" },
  ...["compatibility", "chemistry"].map((name) => ({
    name,
    label: `${name[0]!.toUpperCase()}${name.slice(1)} (1–10)`,
    type: "number" as const,
    min: 1,
    max: 10,
  })),
  {
    name: "contactContext",
    label: "Contact and closure notes",
    type: "textarea",
  },
];
const encounterFormFields: Field[] = [
  {
    name: "kind",
    label: "Kind",
    options: [
      "approach",
      "match",
      "message",
      "call",
      "date",
      "intimate_encounter",
      "other",
    ],
  },
  {
    name: "medium",
    label: "Medium",
    options: ["in_person", "messaging", "phone", "video"],
  },
  { name: "platform", label: "Platform (Instagram, WhatsApp, etc.)" },
  {
    name: "initiator",
    label: "Who initiated",
    options: ["me", "them", "mutual", "unknown"],
  },
  {
    name: "status",
    label: "Status",
    options: ["planned", "completed", "canceled", "no_show"],
  },
  { name: "date", label: "Date, if known", type: "date" },
  { name: "time", label: "Time, if known (your local timezone)", type: "time" },
  { name: "dateNote", label: "Approximate or relative date" },
  { name: "countryCode", label: "Country (two-letter code)" },
  { name: "subdivisionCode", label: "State / region code" },
  { name: "city", label: "City" },
  { name: "venueName", label: "Venue" },
  { name: "mapUrl", label: "Map link", type: "url" },
  { name: "description", label: "What happened", type: "textarea" },
  { name: "reflection", label: "How it felt", type: "textarea" },
  {
    name: "activities",
    label: "Activities, separated by commas",
    type: "list",
  },
  ...["experienceRating", "chemistry", "compatibility"].map((name) => ({
    name,
    label: `${name === "experienceRating" ? "Experience" : name[0]!.toUpperCase() + name.slice(1)} (1–10)`,
    type: "number" as const,
    min: 1,
    max: 10,
  })),
];
function title(value: string) {
  return value.replaceAll("_", " ");
}
function Fields({
  fields,
  initial,
}: {
  fields: Field[];
  initial: Record<string, unknown>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => {
        const raw = initial[field.name];
        const value = Array.isArray(raw)
          ? raw.join(", ")
          : typeof raw === "string" ||
              typeof raw === "number" ||
              typeof raw === "boolean"
            ? String(raw)
            : "";
        return (
          <label
            key={field.name}
            className={`block text-sm ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
          >
            {field.label}
            {field.options ? (
              <select
                name={field.name}
                aria-label={field.label}
                defaultValue={value}
                className={inputStyle}
              >
                <option value="">Not specified</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {title(option)}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                name={field.name}
                aria-label={field.label}
                defaultValue={value}
                required={field.required}
                rows={4}
                className={inputStyle}
              />
            ) : (
              <input
                name={field.name}
                aria-label={field.label}
                defaultValue={value}
                required={field.required}
                type={field.type === "list" ? "text" : (field.type ?? "text")}
                min={field.min}
                max={field.max}
                step={field.type === "number" ? 1 : undefined}
                className={inputStyle}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}
function readFields(form: HTMLFormElement, fields: Field[]) {
  const data = new FormData(form);
  return Object.fromEntries(
    fields.map((field) => {
      const formValue = data.get(field.name);
      const raw = typeof formValue === "string" ? formValue : "";
      const value = raw.trim();
      return [
        field.name,
        !value
          ? null
          : field.type === "number"
            ? Number(value)
            : field.type === "list"
              ? value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean)
              : ["ageIsEstimated", "myAgeIsEstimated"].includes(field.name)
                ? value === "true"
                : field.name === "body"
                  ? raw
                  : value,
      ];
    }),
  );
}
function EditForm({
  heading,
  fields,
  initial = {},
  save,
  onDone,
}: {
  heading: string;
  fields: Field[];
  initial?: Record<string, unknown>;
  save: (data: Record<string, unknown>, requestId: string) => Promise<unknown>;
  onDone: () => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  // Keep the original version with this form draft, even if queries refresh.
  const [saveSnapshot] = useState(() => save);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      saveSnapshot(data, requestId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: domain.loveStories.key() });
      onDone();
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    mutation.mutate(readFields(event.currentTarget, fields));
  }
  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-stone-200 bg-white p-5"
    >
      <h3 className="mb-5 font-serif text-2xl">{heading}</h3>
      <fieldset disabled={mutation.isPending}>
        <Fields fields={fields} initial={initial} />
        <div className="mt-5 flex gap-3">
          <button className={primary} type="submit">
            {mutation.isPending ? "Saving…" : "Save"}
          </button>
          <button className={button} type="button" onClick={onDone}>
            Cancel
          </button>
        </div>
      </fieldset>
      {mutation.error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {mutation.error.message}
        </p>
      ) : null}
    </form>
  );
}
function calendarDate(date: Date, timezone = "UTC") {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function encounterTimeLabel(value: Encounter) {
  const context = value.timeContext;
  const date =
    value.occurredAt ??
    (context?.plannedFor ? new Date(context.plannedFor) : null);
  if (!date) return context?.label || "Date not recorded";
  const label =
    context?.precision === "day"
      ? calendarDate(date, context.timezone)
      : date.toLocaleString();
  return value.occurredAt ? label : `Planned for ${label}`;
}
function encounterInitial(value?: Encounter) {
  if (!value) return { status: "completed", date: "", time: "", dateNote: "" };
  const date =
    value.occurredAt ??
    (value.timeContext?.plannedFor
      ? new Date(value.timeContext.plannedFor)
      : null);
  const isDay = value.timeContext?.precision === "day";
  const local = date
    ? new Date(
        date.getTime() - (isDay ? 0 : date.getTimezoneOffset() * 60000),
      ).toISOString()
    : "";
  return {
    ...value,
    date:
      isDay && date
        ? calendarDate(date, value.timeContext?.timezone)
        : local.slice(0, 10),
    time: isDay ? "" : local.slice(11, 16),
    dateNote: value.timeContext?.label,
  };
}
function encounterData(raw: Record<string, unknown>, current?: Encounter) {
  const { date: rawDate, time: rawTime, dateNote, ...fields } = raw;
  const date = typeof rawDate === "string" ? rawDate : null;
  const time = typeof rawTime === "string" ? rawTime : null;
  if (time && !date) throw new Error("Add a date or leave the time empty.");
  const dateValue = date
    ? new Date(`${date}T${time || "00:00"}${time ? "" : "Z"}`)
    : null;
  const actual = !fields.status || fields.status === "completed";
  // Preserve relative anchors/other context when only prose or ratings change.
  const before = encounterInitial(current);
  const dateChanged =
    date !== (before.date || null) ||
    time !== (before.time || null) ||
    fields.status !== (current?.status ?? "completed");
  return encounterFields.parse({
    ...fields,
    occurredAt: dateChanged
      ? actual
        ? dateValue
        : null
      : (current?.occurredAt ?? null),
    timeContext: {
      ...current?.timeContext,
      label: dateNote || undefined,
      ...(dateChanged
        ? {
            precision: date
              ? time
                ? "exact"
                : "day"
              : dateNote
                ? "approximate"
                : "unknown",
            timezone: time
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : "UTC",
            plannedFor:
              !actual && dateValue ? dateValue.toISOString() : undefined,
            relativeToEncounterId: undefined,
            offsetDays: undefined,
          }
        : {}),
    },
  });
}
function EntryCard({
  id,
  onEdit,
}: {
  id: string;
  onEdit: (entry: Entry) => void;
}) {
  const query = useQuery(
    domain.loveStories.entry.get.queryOptions({
      input: { id },
      refetchOnWindowFocus: false,
    }),
  );
  if (!query.data)
    return <p>{query.error ? "Could not load entry." : "Loading entry…"}</p>;
  const value = query.data;
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-medium">{value.title || "Reflection"}</h4>
        <button type="button" className={button} onClick={() => onEdit(value)}>
          Edit entry
        </button>
      </div>
      <p className="mt-3 text-sm leading-7 whitespace-pre-wrap">{value.body}</p>
      {value.body !== value.originalBody ? (
        <details className="mt-3 text-sm">
          <summary>Original wording</summary>
          <p className="mt-2 whitespace-pre-wrap">{value.originalBody}</p>
        </details>
      ) : null}
    </article>
  );
}
function PersonStory({
  personId,
  onDeleted,
}: {
  personId: string;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [personEdit, setPersonEdit] = useState(false);
  const [encounterEdit, setEncounterEdit] = useState<Encounter | "new" | null>(
    null,
  );
  const [entryEdit, setEntryEdit] = useState<Entry | "new" | null>(null);
  const [entryTarget, setEntryTarget] = useState<string | undefined>();
  const [encounterOffset, setEncounterOffset] = useState(0);
  const [entryOffset, setEntryOffset] = useState(0);
  const person = useQuery(
    domain.loveStories.person.get.queryOptions({
      input: { id: personId },
      refetchOnWindowFocus: false,
    }),
  );
  const encounters = useQuery(
    domain.loveStories.encounter.list.queryOptions({
      input: { personId, limit: 100, offset: encounterOffset },
      refetchOnWindowFocus: false,
    }),
  );
  const entries = useQuery(
    domain.loveStories.entry.list.queryOptions({
      input: { personId, limit: 20, offset: entryOffset },
      refetchOnWindowFocus: false,
    }),
  );
  const action = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: domain.loveStories.key() }),
  });
  if (person.error)
    return (
      <p role="alert">Could not load this person. Reload and try again.</p>
    );
  if (!person.data) return <p>Loading story…</p>;
  const p = person.data;
  const rows = encounters.data ?? [];
  async function move(index: number, direction: number) {
    const items = rows.map(({ id, version }) => ({ id, version }));
    [items[index], items[index + direction]] = [
      items[index + direction]!,
      items[index]!,
    ];
    return api.encounter.reorder({ personId, items });
  }
  const canReorder = encounterOffset === 0 && rows.length < 100;
  function newEntry(encounterId?: string) {
    setEntryTarget(encounterId);
    setEntryEdit("new");
  }
  const entryFormFields: Field[] = [
    { name: "title", label: "Title" },
    { name: "body", label: "Your words", type: "textarea", required: true },
    {
      name: "sourceKind",
      label: "Source",
      options: ["typed", "transcript", "import", "summary"],
    },
  ];
  return (
    <section className="space-y-6">
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-4xl">{p.displayName}</h2>
          <button className={button} onClick={() => setPersonEdit(!personEdit)}>
            Edit person
          </button>
        </div>
        <p className="mt-2 text-stone-600">{p.tagline}</p>
        {p.summary ? (
          <p className="mt-3 leading-7 whitespace-pre-wrap">{p.summary}</p>
        ) : null}
        <p className="mt-3 text-sm text-stone-600">
          {[p.currentResidenceCity, p.currentResidenceCountryCode, p.occupation]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="mt-2 text-sm">
          {p.ageAtFirstMeeting !== null
            ? `Their age when you met: ${p.ageAtFirstMeeting}${p.ageIsEstimated ? " (estimate)" : ""}. `
            : ""}
          {p.myAgeAtFirstMeeting !== null
            ? `Your age: ${p.myAgeAtFirstMeeting}${p.myAgeIsEstimated ? " (estimate)" : ""}.`
            : ""}
        </p>
      </header>
      {personEdit ? (
        <EditForm
          heading="Edit person"
          fields={personFormFields}
          initial={p}
          save={(raw) =>
            api.person.update({
              id: p.id,
              version: p.version,
              changes: personFields.parse(raw),
            })
          }
          onDone={() => setPersonEdit(false)}
        />
      ) : null}
      {action.error ? (
        <p role="alert" className="text-red-700">
          {action.error.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-serif text-2xl">Encounters</h3>
        <button className={button} onClick={() => setEncounterEdit("new")}>
          Add encounter
        </button>
      </div>
      <p className="text-sm text-stone-600">
        Your story order. Dates are optional.
      </p>
      {encounterEdit ? (
        <EditForm
          key={encounterEdit === "new" ? "new" : encounterEdit.id}
          heading={encounterEdit === "new" ? "New encounter" : "Edit encounter"}
          fields={encounterFormFields}
          initial={encounterInitial(
            encounterEdit === "new" ? undefined : encounterEdit,
          )}
          save={(raw, requestId) =>
            encounterEdit === "new"
              ? api.encounter.create({
                  ...encounterData(raw),
                  personId,
                  requestId,
                })
              : api.encounter.update({
                  id: encounterEdit.id,
                  version: encounterEdit.version,
                  changes: encounterData(raw, encounterEdit),
                })
          }
          onDone={() => setEncounterEdit(null)}
        />
      ) : null}
      {encounters.error ? <p role="alert">Could not load encounters.</p> : null}
      <ol className="space-y-3">
        {rows.map((e, index) => (
          <li
            key={e.id}
            className="rounded-2xl border border-stone-200 bg-white p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="font-medium capitalize">
                  {[e.kind, e.medium, e.platform]
                    .filter(Boolean)
                    .map((v) => title(v!))
                    .join(" · ") || "Encounter"}
                </h4>
                <p className="mt-1 text-sm text-stone-500">
                  {encounterTimeLabel(e)}
                  {e.status ? ` · ${title(e.status)}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button className={button} onClick={() => setEncounterEdit(e)}>
                  Edit encounter
                </button>
                {canReorder ? (
                  <>
                    <button
                      className={button}
                      disabled={index === 0 || action.isPending}
                      aria-label={`Move encounter ${index + 1} up`}
                      onClick={() => action.mutate(() => move(index, -1))}
                    >
                      ↑
                    </button>
                    <button
                      className={button}
                      disabled={index === rows.length - 1 || action.isPending}
                      aria-label={`Move encounter ${index + 1} down`}
                      onClick={() => action.mutate(() => move(index, 1))}
                    >
                      ↓
                    </button>
                  </>
                ) : null}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap">{e.description}</p>
            {e.reflection ? (
              <p className="mt-3 whitespace-pre-wrap text-stone-600">
                {e.reflection}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-stone-500">
              {[e.venueName, e.city, e.countryCode].filter(Boolean).join(", ")}
            </p>
            {e.mapUrl ? (
              <a
                className="mt-2 inline-block text-sm underline"
                href={e.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open map
              </a>
            ) : null}
            <div className="mt-4 flex gap-3">
              <button className={button} onClick={() => newEntry(e.id)}>
                Add reflection
              </button>
              <button
                className={button}
                disabled={action.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this encounter? Linked entries will be kept.",
                    )
                  )
                    action.mutate(() =>
                      api.encounter.delete({ id: e.id, version: e.version }),
                    );
                }}
              >
                Delete encounter
              </button>
            </div>
          </li>
        ))}
      </ol>
      {!rows.length && !encounters.isPending ? (
        <p className="text-stone-500">
          An encounter can be as simple as a first hello.
        </p>
      ) : null}
      <div className="flex gap-2">
        {encounterOffset > 0 ? (
          <button
            className={button}
            onClick={() => setEncounterOffset((v) => Math.max(0, v - 100))}
          >
            Previous encounters
          </button>
        ) : null}
        {rows.length === 100 ? (
          <button
            className={button}
            onClick={() => setEncounterOffset((v) => v + 100)}
          >
            More encounters
          </button>
        ) : null}
      </div>
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-2xl">Entries and reflections</h3>
        <button className={button} onClick={() => newEntry()}>
          Write an entry
        </button>
      </div>
      {entryEdit ? (
        <>
          <EditForm
            key={entryEdit === "new" ? "new" : entryEdit.id}
            heading={
              entryTarget && entryEdit === "new"
                ? "Reflection on this encounter"
                : "Your reflection"
            }
            fields={entryFormFields}
            initial={entryEdit === "new" ? { sourceKind: "typed" } : entryEdit}
            save={(raw, requestId) =>
              entryEdit === "new"
                ? api.entry.create({
                    ...entryFields.parse(raw),
                    requestId,
                    personIds: [personId],
                    encounterIds: entryTarget ? [entryTarget] : [],
                  })
                : api.entry.update({
                    id: entryEdit.id,
                    version: entryEdit.version,
                    changes: entryFields.parse(raw),
                  })
            }
            onDone={() => setEntryEdit(null)}
          />
          {entryEdit !== "new" ? (
            <button
              className={button}
              disabled={action.isPending}
              onClick={() => {
                if (
                  window.confirm("Delete this entry and its original wording?")
                )
                  action.mutate(async () => {
                    await api.entry.delete({
                      id: entryEdit.id,
                      version: entryEdit.version,
                    });
                    setEntryEdit(null);
                  });
              }}
            >
              Delete entry
            </button>
          ) : null}
        </>
      ) : null}
      {entries.error ? <p role="alert">Could not load entries.</p> : null}
      {entries.data?.map((e) => (
        <EntryCard key={e.id} id={e.id} onEdit={setEntryEdit} />
      ))}
      <div className="flex gap-2">
        {entryOffset > 0 ? (
          <button
            className={button}
            onClick={() => setEntryOffset((v) => Math.max(0, v - 20))}
          >
            Previous entries
          </button>
        ) : null}
        {entries.data?.length === 20 ? (
          <button
            className={button}
            onClick={() => setEntryOffset((v) => v + 20)}
          >
            More entries
          </button>
        ) : null}
      </div>
      <details className="border-t border-stone-200 pt-4 text-sm">
        <summary>Remove this person</summary>
        <p className="my-3">
          Deletes their encounters and links. Entries remain in your account.
        </p>
        <button
          className={button}
          disabled={action.isPending}
          onClick={() => {
            if (
              window.confirm(
                "Delete this person and their encounters? Entries will remain.",
              )
            )
              action.mutate(async () => {
                await api.person.delete({ id: p.id, version: p.version });
                onDeleted();
              });
          }}
        >
          Delete person
        </button>
      </details>
    </section>
  );
}
export function LoveStoriesWorkspace() {
  const session = authClient.useSession();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [offset, setOffset] = useState(0);
  const people = useQuery(
    domain.loveStories.person.list.queryOptions({
      input: { limit: 50, offset },
      enabled: !!session.data?.user,
    }),
  );
  return (
    <main className="min-h-screen bg-[#f7f4ee] px-5 py-10 text-stone-800">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 border-b border-stone-300 pb-7">
          <Link href="/app/dashboard" className="text-sm text-stone-500">
            SwipeStats
          </Link>
          <h1 className="mt-4 font-serif text-5xl">Love Stories</h1>
          <p className="mt-4 max-w-xl leading-7 text-stone-600">
            People, moments, and what they meant. Your private workspace, with
            no dating-data upload needed.
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Experimental save-testing workspace
          </p>
        </header>
        {session.isPending ? (
          <p>Loading your account…</p>
        ) : !session.data?.user ? (
          <Link
            href="/signin?callbackUrl=/experiments/love-stories/workspace"
            className={primary}
          >
            Sign in to begin
          </Link>
        ) : (
          <div className="grid gap-10 md:grid-cols-[240px_1fr]">
            <aside>
              <button
                className={`${primary} mb-5 w-full`}
                onClick={() => setCreating(true)}
              >
                Add person
              </button>
              {people.error ? (
                <p role="alert">Could not load your people. Please reload.</p>
              ) : null}
              <div className="space-y-2">
                {people.data?.map((p) => (
                  <button
                    key={p.id}
                    className={`w-full rounded-xl p-3 text-left ${selected === p.id ? "bg-white ring-1 ring-stone-300" : "hover:bg-white/60"}`}
                    onClick={() => {
                      setSelected(p.id);
                      setCreating(false);
                    }}
                  >
                    <span className="block font-medium">{p.displayName}</span>
                    <span className="text-sm text-stone-500">{p.tagline}</span>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                {offset > 0 ? (
                  <button
                    className={button}
                    onClick={() => setOffset((v) => Math.max(0, v - 50))}
                  >
                    Previous
                  </button>
                ) : null}
                {people.data?.length === 50 ? (
                  <button
                    className={button}
                    onClick={() => setOffset((v) => v + 50)}
                  >
                    More people
                  </button>
                ) : null}
              </div>
            </aside>
            <div>
              {creating ? (
                <EditForm
                  heading="Someone worth remembering"
                  fields={[personFormFields[0]!, personFormFields[1]!]}
                  save={async (raw, requestId) => {
                    const p = await api.person.create({
                      ...personFields.parse(raw),
                      requestId,
                    });
                    setSelected(p.id);
                    return p;
                  }}
                  onDone={() => setCreating(false)}
                />
              ) : selected ? (
                <PersonStory
                  key={selected}
                  personId={selected}
                  onDeleted={() => setSelected(null)}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 p-10">
                  <h2 className="font-serif text-3xl">Start with a name.</h2>
                  <p className="mt-3 text-stone-600">
                    Add someone, or choose a person to revisit your story.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
