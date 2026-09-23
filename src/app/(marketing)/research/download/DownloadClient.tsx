"use client";

import { useEffect, useRef, useState } from "react";
import { consumeResearchReceipt } from "@/lib/research/receipt-access";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useTRPC, useTRPCClient, type RouterOutputs } from "@/trpc/react";
import type { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@/server/api/root";
import {
  createNativeDownload,
  type DownloadState,
} from "@/lib/research/native-download";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/components/ui/lib/utils";

export function DownloadClient() {
  const [licenseKey, setLicenseKey] = useState("");
  const [inputValue, setInputValue] = useState("");
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  useEffect(() => {
    const key = consumeResearchReceipt();
    if (key) {
      setLicenseKey(key);
      setInputValue(key);
    }
  }, []);

  const lookup = useQuery<
    RouterOutputs["research"]["getExportByLicenseKey"],
    TRPCClientError<AppRouter>
  >({
    queryKey: ["research-export", licenseKey],
    queryFn: ({ signal }) =>
      client.research.getExportByLicenseKey.mutate({ licenseKey }, { signal }),
    enabled: Boolean(licenseKey),
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (query.state.error) return false;
      const status = query.state.data?.export?.status;
      return status === "PENDING" || status === "GENERATING" ? 3000 : false;
    },
  });
  const exportData = lookup.data;
  const isLoading = lookup.isPending;
  const error = lookup.error;
  const validationUnavailable = Boolean(
    error &&
    !["FORBIDDEN", "BAD_REQUEST", "NOT_FOUND"].includes(error.data?.code ?? ""),
  );
  const refetch = () => lookup.refetch({ cancelRefetch: false });
  const [downloadState, setDownloadState] = useState<DownloadState>({
    phase: "idle",
  });
  const downloader = useRef<ReturnType<typeof createNativeDownload> | null>(
    null,
  );
  useEffect(() => {
    const download = createNativeDownload(setDownloadState, (key) => {
      void queryClient.invalidateQueries(
        { queryKey: ["research-export", key] },
        { cancelRefetch: false },
      );
    });
    downloader.current = download;
    return () => {
      download.dispose();
      downloader.current = null;
    };
  }, [queryClient]);
  useEffect(() => {
    downloader.current?.cancel();
  }, [licenseKey]);
  const isDownloading = downloadState.phase === "requesting";
  const downloadError =
    downloadState.phase === "error" ? downloadState.message : null;

  const retryGenerationMutation = useMutation(
    trpc.research.retryGeneration.mutationOptions({
      onSuccess: (_data, variables) =>
        queryClient.invalidateQueries(
          { queryKey: ["research-export", variables.licenseKey] },
          { cancelRefetch: false },
        ),
    }),
  );
  const activeRetry =
    retryGenerationMutation.variables?.licenseKey === licenseKey;
  const handleRetry = () => retryGenerationMutation.mutate({ licenseKey });
  const changeKey = () => {
    setLicenseKey("");
    setInputValue("");
    retryGenerationMutation.reset();
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const key = inputValue.trim();
    if (key === licenseKey) void refetch();
    else setLicenseKey(key);
  };
  const handleDownload = () => {
    if (exportData?.export?.downloadAvailable)
      downloader.current?.start(licenseKey);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", text: "Pending" },
      GENERATING: {
        color: "bg-blue-100 text-blue-800",
        text: "Generating...",
      },
      READY: { color: "bg-green-100 text-green-800", text: "Ready" },
      FAILED: { color: "bg-red-100 text-red-800", text: "Failed" },
    };
    const badge = badges[status as keyof typeof badges] || badges.PENDING;
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
          badge.color,
        )}
      >
        {badge.text}
      </span>
    );
  };

  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Download Your Dataset
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Enter your license key from the LemonSqueezy email to access and
            download your purchased dataset.
          </p>
        </div>

        <aside className="mt-8 rounded-lg border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900">
            Academic database access
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            If we prepared a database snapshot for your study, use the
            connection details sent to you by email. Your research package has
            its own agreed dataset and delivery date. For access help or a
            refreshed snapshot,{" "}
            <a
              href="mailto:kris@swipestats.io?subject=Academic%20database%20access"
              className="font-medium text-rose-600 hover:text-rose-500"
            >
              email kris@swipestats.io
            </a>
            .
          </p>
        </aside>

        <div className="mt-16">
          {!licenseKey ? (
            // License key input form
            <div className="rounded-lg bg-gray-50 p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="license-key"
                    className="block text-sm leading-6 font-medium text-gray-900"
                  >
                    License Key
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      name="license-key"
                      id="license-key"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      className="block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-rose-600 focus:ring-inset sm:text-sm sm:leading-6"
                      placeholder="Enter your license key"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Your license key was sent to your email from LemonSqueezy
                    after purchase.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className={cn(
                    "w-full rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
                    inputValue.trim()
                      ? "cursor-pointer bg-rose-600 hover:bg-rose-500"
                      : "cursor-not-allowed bg-gray-300",
                  )}
                >
                  Validate License Key
                </button>
              </form>
            </div>
          ) : isLoading ? (
            // Loading state
            <div className="rounded-lg bg-gray-50 p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-rose-600" />
              <p className="mt-4 text-sm text-gray-600">
                Validating license key...
              </p>
            </div>
          ) : error && (!exportData || !validationUnavailable) ? (
            // Error state
            <div className="rounded-lg bg-red-50 p-8">
              <div className="flex">
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    {validationUnavailable
                      ? "Unable to validate right now"
                      : "Invalid License Key"}
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      {validationUnavailable
                        ? "We could not reach the validation service. Please try again shortly."
                        : "The license key is invalid or no longer active. Check your email or contact us for help."}
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() =>
                        validationUnavailable ? void refetch() : changeKey()
                      }
                      className="cursor-pointer text-sm font-medium text-red-800 hover:text-red-700"
                    >
                      {validationUnavailable
                        ? "Try again"
                        : "Try a different key →"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : exportData?.found && exportData.export ? (
            // Export details and download
            <div className="space-y-6">
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  Status refresh failed.{" "}
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="underline"
                  >
                    Try again
                  </button>
                </p>
              )}
              <div className="overflow-hidden rounded-lg bg-white shadow">
                <div className="px-4 py-5 sm:p-6">
                  <div className="sm:flex sm:items-center sm:justify-between">
                    <div className="sm:flex sm:space-x-5">
                      <div className="flex-shrink-0">
                        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                      </div>
                      <div className="mt-4 text-center sm:mt-0 sm:pt-1 sm:text-left">
                        <p className="text-sm font-medium text-gray-600">
                          Dataset Tier
                        </p>
                        <p className="text-xl font-bold text-gray-900 sm:text-2xl">
                          {exportData.export.tier}
                        </p>
                        <p className="text-sm text-gray-500">
                          {exportData.export.profileCount.toLocaleString()}{" "}
                          profiles
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 sm:mt-0">
                      {getStatusBadge(exportData.export.status)}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          File Size
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {exportData.export.blobSize
                            ? `${(exportData.export.blobSize / 1024 / 1024).toFixed(2)} MB`
                            : "Calculating..."}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Generated At
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {exportData.export.generatedAt
                            ? new Date(
                                exportData.export.generatedAt,
                              ).toLocaleDateString()
                            : "Processing..."}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Price
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          ${(exportData.export.price / 100).toFixed(2)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Downloads Remaining
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {exportData.export.downloadsRemaining} of{" "}
                          {exportData.export.maxDownloads}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>

              {exportData.export.status === "READY" ? (
                <>
                  <button
                    onClick={handleDownload}
                    disabled={
                      isDownloading ||
                      exportData.export.downloadsRemaining === 0
                    }
                    className={cn(
                      "flex w-full items-center justify-center gap-x-2 rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
                      !isDownloading && exportData.export.downloadsRemaining > 0
                        ? "cursor-pointer bg-rose-600 hover:bg-rose-500"
                        : "cursor-not-allowed bg-gray-300",
                    )}
                  >
                    <ArrowDownTrayIcon className="h-5 w-5" />
                    {isDownloading
                      ? "Starting download..."
                      : exportData.export.downloadsRemaining === 0
                        ? "Download Limit Reached"
                        : "Download Dataset"}
                  </button>

                  {isDownloading && (
                    <p className="text-sm text-gray-600" role="status">
                      Waiting for the download response.{" "}
                      <button
                        type="button"
                        onClick={() => downloader.current?.cancel()}
                        className="underline"
                      >
                        Cancel request
                      </button>
                    </p>
                  )}
                  {downloadState.phase === "initiated" && (
                    <p className="text-sm text-gray-600" role="status">
                      Download requested. Check your browser&apos;s downloads
                      for progress.
                    </p>
                  )}

                  {/* Error message */}
                  {downloadError && (
                    <div className="rounded-lg bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-800">
                        {downloadError}
                      </p>
                    </div>
                  )}

                  {/* Download limit info */}
                  {exportData.export.downloadsRemaining === 0 && (
                    <div className="rounded-lg bg-yellow-50 p-4">
                      <p className="text-sm font-medium text-yellow-800">
                        Download limit reached for this license key
                      </p>
                      <p className="mt-1 text-sm text-yellow-700">
                        You have used all {exportData.export.maxDownloads}{" "}
                        allowed downloads. Please contact support if you need
                        additional downloads.
                      </p>
                    </div>
                  )}
                </>
              ) : exportData.export.status === "GENERATING" ||
                exportData.export.status === "PENDING" ? (
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-300 border-t-blue-600" />
                  <p className="mt-4 text-sm font-medium text-blue-800">
                    Generating your dataset...
                  </p>
                  <p className="mt-1 text-sm text-blue-600">
                    This may take a few minutes. The page will update
                    automatically when ready.
                  </p>
                </div>
              ) : exportData.export.status === "FAILED" ? (
                <div className="space-y-4">
                  <div className="rounded-lg bg-red-50 p-4 text-center">
                    <p className="text-sm font-medium text-red-800">
                      Dataset generation failed
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      This can happen due to temporary server issues. You can
                      try again or contact support at kris@swipestats.io.
                    </p>
                  </div>
                  <button
                    onClick={handleRetry}
                    disabled={activeRetry && retryGenerationMutation.isPending}
                    className={cn(
                      "flex w-full items-center justify-center gap-x-2 rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600",
                      !(activeRetry && retryGenerationMutation.isPending)
                        ? "cursor-pointer bg-rose-600 hover:bg-rose-500"
                        : "cursor-not-allowed bg-gray-300",
                    )}
                  >
                    {activeRetry && retryGenerationMutation.isPending
                      ? "Retrying..."
                      : "Retry Generation"}
                  </button>
                  {activeRetry && retryGenerationMutation.isError && (
                    <div className="rounded-lg bg-red-50 p-4">
                      <p className="text-sm font-medium text-red-800">
                        {retryGenerationMutation.error instanceof Error
                          ? retryGenerationMutation.error.message
                          : "Failed to retry. Please try again."}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="text-center">
                <button
                  onClick={changeKey}
                  className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Use a different license key →
                </button>
              </div>
            </div>
          ) : (
            // License valid but not in DB yet
            <div className="rounded-lg bg-yellow-50 p-8">
              <div className="flex">
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Processing Your Order
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Your license key is valid, but your dataset is still being
                      set up. This usually takes less than a minute. Please
                      refresh this page in a few moments.
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => void refetch()}
                      className="cursor-pointer text-sm font-medium text-yellow-800 hover:text-yellow-700"
                    >
                      Refresh now →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help section */}
        <div className="mt-16 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-900">Need Help?</h2>
          <p className="mt-2 text-sm text-gray-600">
            If you&apos;re having trouble accessing your dataset, please contact
            us at{" "}
            <a
              href="mailto:kris@swipestats.io"
              className="font-medium text-rose-600 hover:text-rose-500"
            >
              kris@swipestats.io
            </a>{" "}
            with your license key.
          </p>
        </div>
      </div>
    </div>
  );
}
