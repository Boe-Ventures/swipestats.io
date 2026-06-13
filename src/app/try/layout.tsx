import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Try SwipeStats — No signup required",
  description:
    "Compare your dating profiles side by side and collect real ratings and feedback. No signup required.",
  robots: { index: false, follow: false },
};

export default function TryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
