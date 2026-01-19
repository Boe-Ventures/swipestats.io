import { Suspense } from "react";
import { DownloadClient } from "./DownloadClient";

export default function DatasetDownloadPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white py-24 sm:py-32">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Download Your Dataset
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Enter your license key to access and download your purchased
                dataset.
              </p>
            </div>
            <div className="mt-16">
              <div className="rounded-lg bg-gray-50 p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-rose-600" />
                <p className="mt-4 text-sm text-gray-600">Loading...</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <DownloadClient />
    </Suspense>
  );
}
