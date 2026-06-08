import type { Metadata } from "next";

import { getPublicComparisonForShare } from "./og-data";

interface Props {
  params: Promise<{ shareKey: string }>;
}

// The page itself is a client component (interactive feedback / session), so it
// can't export metadata. This sibling server layout supplies og:title /
// og:description / twitter card; the share image comes from the colocated
// opengraph-image.tsx, which Next wires into og:image + twitter:image.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareKey } = await params;
  const comparison = await getPublicComparisonForShare(shareKey);

  if (!comparison) {
    return { title: "Comparison Not Found" };
  }

  const subject = comparison.profileName ?? "this profile";
  const versions = comparison.columns.length;

  // No " | SwipeStats" suffix — the root layout's title.template adds the brand
  // to the document <title>, while og/twitter title stay clean for the unfurl.
  const title = comparison.name ?? `${subject}'s profile, compared`;
  const description =
    versions > 1
      ? `Compare ${subject}'s dating profile across ${versions} versions and vote on which one works best.`
      : `See ${subject}'s dating profile and weigh in. Built with SwipeStats.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function ShareProfileCompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
