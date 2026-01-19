import { redirect } from "next/navigation";

import { getSession } from "@/server/better-auth/server";

export default async function ProfileCompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth");
  }

  // Header is now handled by the app layout
  return <>{children}</>;
}
