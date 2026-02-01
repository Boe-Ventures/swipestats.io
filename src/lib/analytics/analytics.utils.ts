// =====================================================
// SANITIZATION UTILITIES
// =====================================================

/**
 * Remove nullish values from an object
 *
 * @example
 * ```ts
 * const clean = omitNullish({ name: "John", age: null, city: undefined });
 * // Result: { name: "John" }
 * ```
 */
export function omitNullish<T extends Record<string, unknown>>(
  obj: T | undefined,
): Record<string, unknown> {
  if (!obj) return {};

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Sanitize properties for Vercel Analytics
 *
 * Converts to: string | number | boolean | null only
 * - Dates → ISO strings
 * - Objects/Arrays → JSON strings
 * - Long strings → Truncated to 450 chars
 *
 * @example
 * ```ts
 * const sanitized = sanitizeForVercel({
 *   date: new Date(),
 *   nested: { foo: "bar" },
 *   long: "x".repeat(500)
 * });
 * // Result: { date: "2024-01-01T00:00:00.000Z", nested: '{"foo":"bar"}', long: "xxx...450 chars" }
 * ```
 */
export function sanitizeForVercel(
  properties?: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  if (!properties) return {};

  const withoutNullish = omitNullish(properties);
  const sanitized: Record<string, string | number | boolean | null> = {};

  for (const [key, value] of Object.entries(withoutNullish)) {
    let sanitizedValue: string | number | boolean | null;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitizedValue = value;
    } else if (value instanceof Date) {
      sanitizedValue = value.toISOString();
    } else {
      try {
        sanitizedValue = JSON.stringify(value);
      } catch {
        sanitizedValue = "[object]";
      }
    }

    // Truncate long strings
    if (typeof sanitizedValue === "string" && sanitizedValue.length > 450) {
      sanitized[key] = sanitizedValue.slice(0, 450);
    } else {
      sanitized[key] = sanitizedValue;
    }
  }

  return sanitized;
}
