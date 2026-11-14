/** Tag promotional internal links without changing their destination state. */
export function withInternalUtm(
  href: string,
  attribution: { medium: string; campaign: string; content: string },
): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "https://www.swipestats.io");
  const tags = {
    utm_source: "swipestats",
    utm_medium: attribution.medium,
    utm_campaign: attribution.campaign,
    utm_content: attribution.content,
  };
  for (const [key, value] of Object.entries(tags)) {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
