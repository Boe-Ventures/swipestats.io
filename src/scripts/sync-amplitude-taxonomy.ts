/**
 * Create or update the typed tracking plan in Amplitude's EU Taxonomy API.
 *
 * The event registry and property metadata are the source of truth. Re-running
 * this script updates descriptions, categories, types, enum values, and required
 * flags instead of treating an existing definition as synchronized.
 */
import {
  CLIENT_EVENT_REGISTRY,
  SERVER_EVENT_REGISTRY,
} from "@/lib/analytics/analytics.registry";
import {
  CLIENT_EVENT_PROPERTIES,
  SERVER_EVENT_PROPERTIES,
  USER_TRAITS,
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

type Method = "GET" | "POST" | "PUT";

interface ApiResult {
  ok: boolean;
  exists: boolean;
  status: number;
  text: string;
}

async function request(
  method: Method,
  path: string,
  params: Record<string, string | undefined> = {},
): Promise<ApiResult> {
  const values = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) values.set(key, value);
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const url =
      method === "GET" && values.size > 0
        ? `${BASE}${path}?${values.toString()}`
        : `${BASE}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: AUTH,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      ...(method === "GET" ? {} : { body: values }),
    });
    const responseText = await response.text();

    if ((response.status === 429 || response.status >= 500) && attempt < 7) {
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      const retryDelay = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1_000
        : Math.min(500 * 2 ** attempt, 8_000);
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      continue;
    }

    return {
      ok:
        response.ok &&
        (/"success"\s*:\s*true/i.test(responseText) ||
          responseText.trim() === "true"),
      exists:
        (response.status === 409 && /already exists/i.test(responseText)) ||
        (response.ok && /"success"\s*:\s*false/i.test(responseText)),
      status: response.status,
      text: responseText,
    };
  }

  throw new Error("Amplitude taxonomy retry loop ended unexpectedly");
}

async function upsert(
  createPath: string,
  createParams: Record<string, string | undefined>,
  updatePath: string,
  updateParams: Record<string, string | undefined>,
): Promise<ApiResult> {
  const created = await request("POST", createPath, createParams);
  if (created.ok) return created;
  if (!created.exists) return created;
  return request("PUT", updatePath, updateParams);
}

function amplitudeType(meta: PropertyMeta): {
  type: string;
  isArray: boolean;
} {
  if (meta.type.endsWith("[]")) return { type: "string", isArray: true };
  if (meta.values && meta.values.length > 0) {
    return { type: "enum", isArray: false };
  }
  if (meta.type === "number") return { type: "number", isArray: false };
  if (meta.type === "boolean") return { type: "boolean", isArray: false };
  return { type: "string", isArray: false };
}

function propertyParams(
  meta: PropertyMeta,
): Record<string, string | undefined> {
  const { type, isArray } = amplitudeType(meta);
  return {
    description: meta.description,
    type,
    enum_values:
      type === "enum" && meta.values ? meta.values.join(",") : undefined,
    is_array_type: isArray ? "true" : "false",
  };
}

async function main() {
  const categories = new Set<string>();
  for (const meta of [
    ...Object.values(SERVER_EVENT_REGISTRY),
    ...Object.values(CLIENT_EVENT_REGISTRY),
  ]) {
    categories.add(meta.category);
  }

  let categoriesSynced = 0;
  const existingCategories = await request("GET", "/category");
  if (!existingCategories.ok) {
    throw new Error(
      `Unable to read Amplitude categories: ${existingCategories.status} ${existingCategories.text}`,
    );
  }
  const categoryIds = new Map(
    (
      JSON.parse(existingCategories.text) as {
        data: { id: number; name: string }[];
      }
    ).data.map((category) => [category.name, category.id]),
  );
  for (const category of categories) {
    const created = await request("POST", "/category", {
      category_name: category,
    });
    let result = created;
    if (created.exists) {
      const id = categoryIds.get(category);
      result = id
        ? await request("PUT", `/category/${id}`, {
            category_name: category,
          })
        : {
            ok: false,
            exists: false,
            status: 404,
            text: `Category ${category} was reported as existing but was not listed`,
          };
    }
    if (result.ok) categoriesSynced++;
    else {
      console.warn(
        `  ⚠ category "${category}": ${result.status} ${result.text}`,
      );
    }
  }
  console.log(`categories: ${categoriesSynced}/${categories.size}`);

  const sets = [
    { registry: SERVER_EVENT_REGISTRY, props: SERVER_EVENT_PROPERTIES },
    { registry: CLIENT_EVENT_REGISTRY, props: CLIENT_EVENT_PROPERTIES },
  ] as const;

  let eventsSynced = 0;
  let eventsTotal = 0;
  let propertiesSynced = 0;
  let propertiesTotal = 0;

  for (const { registry, props } of sets) {
    for (const [eventName, meta] of Object.entries(registry)) {
      eventsTotal++;
      const result = await upsert(
        "/event",
        {
          event_type: eventName,
          category: meta.category,
          description: meta.description,
          is_active: "true",
        },
        `/event/${encodeURIComponent(eventName)}`,
        {
          category: meta.category,
          description: meta.description,
          is_active: "true",
        },
      );
      if (result.ok) eventsSynced++;
      else
        console.warn(
          `  ⚠ event "${eventName}": ${result.status} ${result.text}`,
        );

      const eventProperties =
        (props as Record<string, Record<string, PropertyMeta>>)[eventName] ??
        {};
      for (const [propertyName, propertyMeta] of Object.entries(
        eventProperties,
      )) {
        propertiesTotal++;
        const metadata = propertyParams(propertyMeta);
        const propertyResult = await upsert(
          "/event-property",
          {
            ...metadata,
            event_type: eventName,
            event_property: propertyName,
            is_required: propertyMeta.required ? "true" : "false",
          },
          `/event-property/${encodeURIComponent(propertyName)}`,
          {
            ...metadata,
            event_type: eventName,
            is_required: propertyMeta.required ? "true" : "false",
          },
        );
        if (propertyResult.ok) propertiesSynced++;
        else
          console.warn(
            `  ⚠ property "${eventName}.${propertyName}": ${propertyResult.status} ${propertyResult.text}`,
          );
      }
    }
  }

  const userProperties = Object.entries(USER_TRAITS);
  let userPropertiesSynced = 0;
  for (const [propertyName, propertyMeta] of userProperties) {
    const taxonomyName = `gp:${propertyName}`;
    const metadata = propertyParams(propertyMeta);
    const result = await upsert(
      "/user-property",
      { ...metadata, user_property: taxonomyName },
      `/user-property/${encodeURIComponent(taxonomyName)}`,
      metadata,
    );
    if (result.ok) userPropertiesSynced++;
    else
      console.warn(
        `  ⚠ user property "${propertyName}": ${result.status} ${result.text}`,
      );
  }

  console.log(`events: ${eventsSynced}/${eventsTotal}`);
  console.log(`properties: ${propertiesSynced}/${propertiesTotal}`);
  console.log(
    `user properties: ${userPropertiesSynced}/${userProperties.length}`,
  );

  if (
    categoriesSynced !== categories.size ||
    eventsSynced !== eventsTotal ||
    propertiesSynced !== propertiesTotal ||
    userPropertiesSynced !== userProperties.length
  ) {
    throw new Error("Amplitude taxonomy synchronization was incomplete");
  }

  console.log("✅ taxonomy sync complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
