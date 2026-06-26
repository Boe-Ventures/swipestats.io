import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design System — SwipeStats",
  description: "Living component reference: marketing, blog, and app surfaces.",
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-white text-gray-900">{children}</div>;
}
