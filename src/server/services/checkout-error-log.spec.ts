import { expect, test } from "bun:test";
import { sanitizeCheckoutError } from "./checkout-error-log";

test("retains nested diagnostics while redacting checkout credentials", () => {
  const email = "fixture@example.com";
  const apiKey = "fixture-api-credential";
  const license = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";
  const error = new Error(`Checkout failed for ${email}`, {
    cause: [
      {
        detail: "Receipt URL is invalid",
        source: { pointer: "/receipt_link_url" },
      },
      {
        detail: "Button text is invalid",
        source: { pointer: "/receipt_button_text" },
      },
      Object.assign(
        new Error(
          `Credential ${apiKey}; license ${license}; ${encodeURIComponent(email)}`,
        ),
        { code: "ECONNREFUSED" },
      ),
      new AggregateError([new Error("Socket failure details")], ""),
      {
        password: "private-password",
        token: "private-token",
        request: { body: "private-request" },
        url: `https://example.com/download#licenseKey=${license}`,
      },
    ],
  });
  const logged = JSON.stringify(sanitizeCheckoutError(error, [email, apiKey]));
  for (const diagnostic of [
    "Error: Checkout failed for [REDACTED]",
    "Receipt URL is invalid",
    "/receipt_link_url",
    "Button text is invalid",
    "/receipt_button_text",
    "ECONNREFUSED",
    "Socket failure details",
  ])
    expect(logged).toContain(diagnostic);
  for (const secret of [
    email,
    encodeURIComponent(email),
    apiKey,
    license,
    "private-password",
    "private-token",
    "private-request",
    "https://example.com",
  ])
    expect(logged).not.toContain(secret);
});
