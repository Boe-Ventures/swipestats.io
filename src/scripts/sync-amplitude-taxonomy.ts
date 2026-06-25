/**
 * Sync the analytics tracking plan → Amplitude's Taxonomy API.
 *
 * Source of truth: `analytics.registry.ts` (categories/descriptions) +
 * `analytics.properties.ts` (per-property type/required/description). This pushes
 * those definitions into Amplitude so the project's taxonomy reflects our
 * registry instead of drifting — the anti-drift payoff of the typed catalog.
 *
 * Run:  bun src/scripts/sync-amplitude-taxonomy.ts
 *
 * Credentials come from env and MUST be the same project's pair:
 *   NEXT_PUBLIC_AMPLITUDE_API_KEY  (project API key)
 *   AMPLITUDE_SECRET_KEY           (project secret key)
 * Local .env points at the DEV project; set prod keys to target prod.
 *
 * Idempotent-ish: re-running treats "already exists" as a skip. It's a CREATE
 * pass — updating existing definitions (PUT) + enum_values + PII classifications
 * are a deliberate v2 (kept out so the first push can't 400 on encoding).
 */
import {
  CLIENT_EVENT_REGISTRY,
  SERVER_EVENT_REGISTRY,
} from "@/lib/analytics/analytics.registry";
import {
  CLIENT_EVENT_PROPERTIES,
  SERVER_EVENT_PROPERTIES,
  type PropertyMeta,
} from "@/lib/analytics/analytics.properties";

const API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
const SECRET = process.env.AMPLITUDE_SECRET_KEY;
const BASE = "https://analytics.eu.amplitude.com/api/2/taxonomy";

if (!API_KEY || !SECRET) {
  console.error(
    "❌ Missing NEXT_PUBLIC_AMPLITUDE_API_KEY / AMPLITUDE_SECRET_KEY in env.",
  );
  process.exit(1);
}

const AUTH = `Basic ${Buffer.from(`${API_KEY}:${SECRET}`).toString("base64")}`;

async function post(
  path: string,
  params: Record<string, string | undefined>,
): Promise<{ ok: boolean; exists: boolean; status: number; text: string }> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) body.set(k, v);
  }
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: AUTH,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await res.text();
  return {
    ok: res.ok && /"success"\s*:\s*true/i.test(text),
    exists: /exist/i.test(text),
    status: res.status,
    text,
  };
}

/** Map our display type → Amplitude property type (+ array flag). */
function mapType(t: string): { type: string; isArray: boolean } {
  if (t.endsWith("[]")) return { type: "string", isArray: true };
  if (t === "number") return { type: "number", isArray: false };
  if (t === "boolean") return { type: "boolean", isArray: false };
  return { type: "string", isArray: false }; // string | enum | "string | null"
}

async function main() {
  // 1) Categories
  const categories = new Set<string>();
  for (const meta of [
    ...Object.values(SERVER_EVENT_REGISTRY),
    ...Object.values(CLIENT_EVENT_REGISTRY),
  ]) {
    categories.add(meta.category);
  }
  let catOk = 0;
  for (const category of categories) {
    const r = await post("/category", { category_name: category });
    if (r.ok || r.exists) catOk++;
    else console.warn(`  ⚠ category "${category}": ${r.status} ${r.text}`);
  }
  console.log(`categories: ${catOk}/${categories.size}`);

  // 2) Events + their properties
  const sets = [
    { registry: SERVER_EVENT_REGISTRY, props: SERVER_EVENT_PROPERTIES },
    { registry: CLIENT_EVENT_REGISTRY, props: CLIENT_EVENT_PROPERTIES },
  ] as const;

  let evOk = 0;
  let evTotal = 0;
  let propOk = 0;
  let propTotal = 0;

  for (const { registry, props } of sets) {
    for (const [eventName, meta] of Object.entries(registry)) {
      evTotal++;
      const r = await post("/event", {
        event_type: eventName,
        category: meta.category,
        description: meta.description,
        is_active: "true",
      });
      if (r.ok || r.exists) evOk++;
      else console.warn(`  ⚠ event "${eventName}": ${r.status} ${r.text}`);

      const eventProps =
        (props as Record<string, Record<string, PropertyMeta>>)[eventName] ??
        {};
      for (const [propName, pmeta] of Object.entries(eventProps)) {
        propTotal++;
        const { type, isArray } = mapType(pmeta.type);
        const r2 = await post("/event-property", {
          event_type: eventName,
          event_property: propName,
          description: pmeta.description,
          type,
          is_array_type: isArray ? "true" : undefined,
          is_required: pmeta.required ? "true" : "false",
        });
        if (r2.ok || r2.exists) propOk++;
        else
          console.warn(
            `  ⚠ property "${eventName}.${propName}": ${r2.status} ${r2.text}`,
          );
      }
    }
  }

  console.log(`events: ${evOk}/${evTotal}`);
  console.log(`properties: ${propOk}/${propTotal}`);
  console.log("✅ taxonomy sync complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
