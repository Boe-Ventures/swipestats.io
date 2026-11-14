import { Suspense } from "react";

import { EmailPreferencesClient } from "./EmailPreferencesClient";

export const metadata = {
  title: "Email Preferences - SwipeStats",
};

export default function EmailPreferencesPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-12">
      <Suspense fallback={null}>
        <EmailPreferencesClient />
      </Suspense>
    </main>
  );
}
