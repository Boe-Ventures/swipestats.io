import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { checkAdminAuth } from "@/lib/admin-auth";
import { AUTH_RETURN_TO_HEADER, getSafeInternalPath } from "@/lib/auth-utils";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthorized } = await checkAdminAuth();

  if (!isAuthorized) {
    const returnTo = getSafeInternalPath(
      (await headers()).get(AUTH_RETURN_TO_HEADER),
    );
    redirect(
      returnTo ? `/signin?returnTo=${encodeURIComponent(returnTo)}` : "/signin",
    );
  }

  return (
    <div className="dark:bg-background min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="dark:bg-card border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="dark:text-foreground dark:hover:text-muted-foreground text-xl font-bold text-gray-900 hover:text-gray-700"
              >
                SwipeStats Admin
              </Link>
              <div className="flex items-center gap-2 rounded-md bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">
                <ShieldAlert className="h-3 w-3" />
                ADMIN MODE
              </div>
              <nav className="hidden items-center gap-1 border-l pl-4 sm:flex">
                <Link
                  href="/admin/swipe-rank"
                  className="dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                >
                  SwipeRank
                </Link>
                <Link
                  href="/admin/media-review"
                  className="dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                >
                  Media review
                </Link>
              </nav>
            </div>
            <Link
              href="/app/dashboard"
              className="dark:text-muted-foreground dark:hover:text-foreground text-sm text-gray-600 hover:text-gray-900"
            >
              Back to App →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
