import type { Metadata } from "next";

import { getPublicProfileRoastForShare } from "./og-data";

interface Props {
  params: Promise<{ shareKey: string }>;
}

// The page itself is a client component (interactive tabs / preview), so it
// can't export metadata. This sibling server layout supplies og:title /
// og:description / twitter card; the share image comes from the colocated
// opengraph-image.tsx, which Next wires into og:image + twitter:image.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareKey } = await params;
  const roast = await getPublicProfileRoastForShare(shareKey);

  if (!roast) {
    return { title: "Roast Not Found" };
  }

  // No " | SwipeStats" suffix — the root layout's title.template adds the brand
  // to the document <title>, while og/twitter title stay clean for the unfurl.
  const title = roast.subject
    ? `${roast.subject}'s profile got roasted`
    : "This profile got roasted";
  const description =
    roast.result.overall.verdict || roast.result.overall.headline;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ShareProfileRoastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
