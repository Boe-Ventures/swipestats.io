const REDACTED = "[REDACTED]";
const PRIVATE_FIELD =
  /email|license.?key|api.?key|authorization|cookie|password|secret|token|checkout.?data|customer|request|response|headers|payload|body|config/i;

// Lemon Squeezy errors contain a message and JSON cause, not a request payload.
export function sanitizeCheckoutError(
  error: unknown,
  privateValues: (string | undefined)[],
): unknown {
  const secrets = privateValues
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => [value, encodeURIComponent(value)]);
  const seen = new WeakSet<object>();

  function visit(value: unknown): unknown {
    if (typeof value === "string") {
      let text = value;
      for (const secret of secrets) text = text.replaceAll(secret, REDACTED);
      return text
        .replace(/https?:\/\/[^\s<>"']+/gi, "[REDACTED URL]")
        .replace(/[A-Z0-9._%+-]+(?:@|%40)[A-Z0-9.-]+\.[A-Z]{2,}/gi, REDACTED)
        .replace(/\b[A-Z0-9]{8}(?:-[A-Z0-9]{4}){3}-[A-Z0-9]{12}\b/gi, REDACTED)
        .replace(/\bBearer\s+[^\s,;"']+/gi, `Bearer ${REDACTED}`);
    }
    if (value === null || typeof value !== "object") {
      return typeof value === "function" ? undefined : value;
    }
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    if (Array.isArray(value)) return value.map(visit);
    const fields =
      value instanceof Error
        ? {
            name: value.name,
            message: value.message,
            stack: value.stack,
            cause: value.cause,
            errors:
              value instanceof AggregateError
                ? (value.errors as unknown)
                : undefined,
            code: "code" in value ? value.code : undefined,
          }
        : value;
    return Object.fromEntries(
      Object.entries(fields).map(([key, field]) => [
        key,
        PRIVATE_FIELD.test(key) ? REDACTED : visit(field),
      ]),
    );
  }

  return visit(error);
}
