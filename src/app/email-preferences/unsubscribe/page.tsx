import { Suspense } from "react";

import { UnsubscribeClient } from "./UnsubscribeClient";

export const metadata = {
  title: "Unsubscribe - SwipeStats",
};

export default function UnsubscribePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-12">
      <Suspense fallback={null}>
        <UnsubscribeClient />
      </Suspense>
    </main>
  );
}
