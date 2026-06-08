/**
 * Apps the AI profile composer supports — a subset of DataProvider (all have a
 * prompt bank). Single source of truth across the boundary: the server router
 * validates input with `z.enum(COMPOSE_PROVIDER_KEYS)`, and the client pickers
 * render `COMPOSE_PROVIDERS`. Pure data (no client/server-only imports) so both
 * sides can import it.
 */
export const COMPOSE_PROVIDER_KEYS = ["TINDER", "HINGE", "BUMBLE"] as const;

export type ComposeProvider = (typeof COMPOSE_PROVIDER_KEYS)[number];

export const COMPOSE_PROVIDERS: readonly {
  key: ComposeProvider;
  label: string;
}[] = [
  { key: "TINDER", label: "Tinder" },
  { key: "HINGE", label: "Hinge" },
  { key: "BUMBLE", label: "Bumble" },
];

/** Display label for a compose provider key (falls back to the raw key). */
export function composeProviderLabel(key: string): string {
  return COMPOSE_PROVIDERS.find((p) => p.key === key)?.label ?? key;
}
