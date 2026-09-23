"use client";

import type { ComponentProps } from "react";
import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Credential forms stay visible but cannot submit before their handlers attach. */
export function ClientAuthForm({
  children,
  ...props
}: Omit<ComponentProps<"form">, "method">) {
  const hydrated = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  return (
    <form {...props} method="post">
      <fieldset disabled={!hydrated} style={{ display: "contents" }}>
        {children}
      </fieldset>
      <noscript>
        <p role="status">
          Enable JavaScript to sign in or manage your account.
        </p>
      </noscript>
    </form>
  );
}
