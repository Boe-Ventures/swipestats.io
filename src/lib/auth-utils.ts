export const AUTH_RETURN_TO_HEADER = "x-auth-return-to";

const INTERNAL_URL_BASE = "https://swipestats.invalid";

export function getSafeInternalPath(value: string | null): string | null {
  if (!value?.startsWith("/")) return null;

  try {
    const url = new URL(value, INTERNAL_URL_BASE);
    if (url.origin !== INTERNAL_URL_BASE) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function getAuthPageHref(
  pathname: "/signin" | "/signup",
  searchParams: URLSearchParams,
): string {
  const params = new URLSearchParams();
  const returnTo = getSafeInternalPath(
    searchParams.get("returnTo") ??
      searchParams.get("callbackUrl") ??
      searchParams.get("redirect"),
  );
  if (returnTo) params.set("returnTo", returnTo);

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function getCallbackURL(
  searchParams: URLSearchParams,
  fallback = "/app/dashboard",
): string {
  const returnTo =
    searchParams.get("returnTo") ??
    searchParams.get("callbackUrl") ??
    searchParams.get("redirect");

  return getSafeInternalPath(returnTo) ?? fallback;
}
