const REDACTED = "[REDACTED]";
const PRIVATE_FIELD =
  /email|license.?key|api.?key|authorization|cookie|password|secret|token|checkout.?data|customer|request|response|headers|payload|body|config/i;

/** Keep the complete error tree, with checkout credentials removed before logging. */
export function sanitizeCheckoutError(
  error: unknown,
  privateValues: (string | undefined)[],
): unknown {
  const secrets = privateValues
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => [value, encodeURIComponent(value)])
    .sort((a, b) => b.length - a.length);
  const seen = new WeakSet<object>();

  function redact(value: string): string {
    for (const secret of secrets) value = value.replaceAll(secret, REDACTED);
    return value
      .replace(/https?:\/\/[^\s<>"']+/gi, "[REDACTED URL]")
      .replace(/[A-Z0-9._%+-]+(?:@|%40)[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED)
      .replace(/\b[A-Z0-9]{8}(?:-[A-Z0-9]{4}){3}-[A-Z0-9]{12}\b/gi, REDACTED)
      .replace(/\bBearer\s+[^\s,;"']+/gi, `Bearer ${REDACTED}`);
  }

  function visit(value: unknown, depth = 0): unknown {
    if (typeof value === "string") return redact(value);
    // Keep custom toJSON methods from bypassing redaction during serialization.
    if (typeof value === "function") return "[Function]";
    if (value === null || typeof value !== "object") {
      return typeof value === "bigint" ? value.toString() : value;
    }
    if (seen.has(value)) return "[Circular]";
    if (depth > 10) return "[Max depth]";
    seen.add(value);
    if (Array.isArray(value))
      return value.map((item) => visit(item, depth + 1));

    // Error fields are non-enumerable, so object spreading alone loses them.
    const fields = new Set(Object.getOwnPropertyNames(value));
    if (value instanceof Error) {
      fields.add("name");
      fields.add("message");
      fields.add("stack");
    }
    return Object.fromEntries(
      [...fields].map((key) => {
        if (PRIVATE_FIELD.test(key)) return [redact(key), REDACTED];
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        // Node stores Error.stack as an accessor; preserve standard Error fields.
        // Other getters are not evaluated while handling another failure.
        let field: unknown;
        try {
          field =
            value instanceof Error &&
            (key === "name" || key === "message" || key === "stack")
              ? value[key]
              : descriptor && "value" in descriptor
                ? descriptor.value
                : "[Getter]";
        } catch {
          field = "[Unreadable]";
        }
        return [redact(key), visit(field, depth + 1)];
      }),
    );
  }

  return visit(error);
}
