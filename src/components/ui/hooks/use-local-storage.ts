// useLocalStorage.ts
// Minimal, Next.js-safe localStorage hook with:
// - SSR/hydration safety (read in effect)
// - cross-tab ('storage') + same-tab (CustomEvent) sync
// - optional namespacing (defaults to "")
// - simple JSON storage (no migrations/versions)

"use client";

import * as React from "react";

export type UseStorageOptions<T> = {
  /** Key without namespace; final key is `${namespace}${key}` */
  key: string;
  /** Value used if nothing in storage or storage unavailable */
  defaultValue?: T;
  /** Sync across tabs & same tab (multiple hooks) — default: true */
  sync?: boolean;
  /** Optional namespace prefix; default "" */
  namespace?: string;
};

type UseStorageReturn<T> = [
  T, // value
  (next: T | ((prev: T) => T)) => void, // set
  () => void, // remove
];

// ---------- internals ----------

const DEFAULT_NAMESPACE = "";
const LOCAL_EVENT = "ls-sync"; // same-tab sync event name

function isStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined") return false;
    const k = "__ls_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function buildKey(key: string, ns?: string) {
  return `${ns ?? DEFAULT_NAMESPACE}${key}`;
}

function getItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setItem(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore (quota/private mode/etc.) */
  }
}

function removeItem(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function parseJSON<T>(raw: string | null): T | undefined {
  if (raw == null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

// ---------- hook ----------

export function useLocalStorage<T>(
  opts: UseStorageOptions<T> & { defaultValue: T },
): [T, (next: T | ((p: T) => T)) => void, () => void];
export function useLocalStorage<T>(
  opts: UseStorageOptions<T>,
): [T | undefined, (next: T | ((p: T) => T)) => void, () => void];
export function useLocalStorage<T>({
  key,
  defaultValue,
  sync = true,
  namespace,
}: UseStorageOptions<T>): UseStorageReturn<T> {
  const storageKey = React.useMemo(
    () => buildKey(key, namespace),
    [key, namespace],
  );
  const storageAvailable = React.useMemo(() => isStorageAvailable(), []);
  const [value, setValue] = React.useState<T>(defaultValue as T);

  const setFrom = React.useCallback(
    (next: T | undefined) => {
      const resolved = next ?? (defaultValue as T);
      setValue((prev) => (Object.is(prev, resolved) ? prev : resolved));
    },
    [defaultValue],
  );

  const read = React.useCallback((): T | undefined => {
    if (!storageAvailable) return defaultValue;
    const parsed = parseJSON<T>(getItem(storageKey));
    return parsed === undefined ? defaultValue : parsed;
  }, [storageAvailable, storageKey, defaultValue]);

  // Read after mount (SSR-safe) and whenever key/namespace changes
  React.useEffect(() => {
    setFrom(read());
  }, [read, setFrom]);

  // Sync: cross-tab via 'storage' + same-tab via custom event
  React.useEffect(() => {
    if (!sync) return;

    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== window.localStorage) return;
      if (e.key !== storageKey) return;
      setFrom(parseJSON<T>(e.newValue));
    };

    const onLocal = (e: Event) => {
      const ce = e as CustomEvent<{ key: string }>;
      if (ce.detail.key !== storageKey) return;
      setFrom(read());
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_EVENT, onLocal as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_EVENT, onLocal as EventListener);
    };
  }, [sync, storageKey, setFrom, read]);

  const write = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((current) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(current) : next;

        if (storageAvailable) {
          setItem(storageKey, JSON.stringify(resolved));
          // same-tab sync: tell other hook instances for the same key
          queueMicrotask(() => {
            window.dispatchEvent(
              new CustomEvent(LOCAL_EVENT, { detail: { key: storageKey } }),
            );
          });
        }

        return resolved;
      });
    },
    [storageAvailable, storageKey],
  );

  const remove = React.useCallback(() => {
    if (storageAvailable) {
      removeItem(storageKey);
      queueMicrotask(() => {
        window.dispatchEvent(
          new CustomEvent(LOCAL_EVENT, { detail: { key: storageKey } }),
        );
      });
    }
    setFrom(undefined);
  }, [storageAvailable, storageKey, setFrom]);

  return [value, write, remove];
}

// ---------- utilities ----------

/** Read a value outside of React (e.g., event handler). Returns default if unavailable/missing. */
export function readLocalStorage<T = unknown>(
  key: string,
  opts?: { defaultValue?: T; namespace?: string },
): T | undefined {
  if (!isStorageAvailable()) return opts?.defaultValue;
  const storageKey = buildKey(key, opts?.namespace);
  const parsed = parseJSON<T>(getItem(storageKey));
  return parsed === undefined ? opts?.defaultValue : parsed;
}

/** Build a namespaced key if you need it elsewhere */
export const storageKey = (key: string, namespace = DEFAULT_NAMESPACE) =>
  buildKey(key, namespace);
