import { Suspense } from "react";
import { UploadClient } from "./UploadClient";

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-rose-600" />
          </div>
        </div>
      }
    >
      <UploadClient />
    </Suspense>
  );
}
