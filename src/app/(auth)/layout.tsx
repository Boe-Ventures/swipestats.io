import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | SwipeStats",
    default: "SwipeStats - Analyze Your Dating Profile",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
