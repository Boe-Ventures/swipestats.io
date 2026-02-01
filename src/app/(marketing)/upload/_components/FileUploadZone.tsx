"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";
import { cn } from "@/components/ui";

type FileStatus = "missing" | "loaded" | "error";

interface FileChecklist {
  required: Array<{ key: string; label: string }>;
  optional?: Array<{ key: string; label: string }>;
  status: Record<string, FileStatus>;
}

interface FileUploadZoneProps {
  accept: Record<string, string[]>;
  maxFiles?: number;
  onFilesAccepted: (files: File[]) => void;
  checklist?: FileChecklist;
  isProcessing: boolean;
  disabled?: boolean;
  instructions?: string;
  providerName?: string;
}

export function FileUploadZone({
  accept,
  maxFiles = 1,
  onFilesAccepted,
  checklist,
  isProcessing,
  disabled,
  instructions,
  providerName: _providerName = "your",
}: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles);
      }
    },
    [onFilesAccepted],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    accept,
    disabled: disabled || isProcessing,
    multiple: maxFiles > 1,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed px-6 py-16 transition-all duration-200 sm:px-8 sm:py-20",
          isDragActive
            ? "scale-[1.02] border-rose-500 bg-linear-to-br from-rose-50 to-pink-50 shadow-lg"
            : "border-gray-300 bg-linear-to-br from-gray-50 to-white hover:border-rose-400 hover:shadow-md",
          (isProcessing || disabled) && "cursor-not-allowed opacity-60",
        )}
      >
        <input {...getInputProps()} />

        {/* Decorative background gradient on hover */}
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-rose-100/30 blur-3xl" />
          <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-pink-100/30 blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center justify-center space-y-4 text-center sm:space-y-5">
          {/* Icon */}
          <div
            className={cn(
              "rounded-2xl p-4 transition-all duration-200",
              isDragActive
                ? "bg-rose-100 shadow-md"
                : "bg-gray-100 group-hover:bg-rose-50",
            )}
          >
            <CloudArrowUpIcon
              className={cn(
                "h-16 w-16 transition-colors duration-200 sm:h-20 sm:w-20",
                isDragActive
                  ? "text-rose-600"
                  : "text-gray-400 group-hover:text-rose-500",
              )}
            />
          </div>

          {/* Text content */}
          <div className="space-y-2 sm:space-y-3">
            {instructions ? (
              <p className="text-base font-medium text-gray-700 sm:text-lg">
                {instructions}
              </p>
            ) : (
              <p className="text-base font-medium text-gray-700 sm:text-lg">
                Select your{" "}
                <span className="font-semibold text-rose-600">
                  {maxFiles === 1 ? "data file" : "data files"}
                </span>{" "}
                or{" "}
                <span className="font-semibold text-rose-600">
                  .zip archive
                </span>
              </p>
            )}

            {!isProcessing && (
              <>
                <p className="text-sm text-gray-500 sm:hidden">
                  Tap to browse files
                </p>
                <p className="hidden text-sm text-gray-500 sm:block">
                  or drag and drop your file here
                </p>
              </>
            )}
          </div>

          {/* Drag active state */}
          {isDragActive && (
            <div className="animate-bounce">
              <p className="text-base font-semibold text-rose-600">
                Drop to upload
              </p>
            </div>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
              <p className="text-sm font-medium text-gray-700">
                Processing your data...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File Checklist */}
      {checklist && checklist.required.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Required Files
          </h3>
          <div className="space-y-2">
            {checklist.required.map(({ key, label }) => {
              const status = checklist.status[key] || "missing";
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  {status === "loaded" ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : status === "error" ? (
                    <XCircleIcon className="h-5 w-5 text-red-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                  )}
                  <span
                    className={cn(
                      status === "loaded"
                        ? "text-green-700"
                        : status === "error"
                          ? "text-red-700"
                          : "text-gray-600",
                    )}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {checklist.optional && checklist.optional.length > 0 && (
            <>
              <h4 className="mt-4 mb-2 text-sm font-semibold text-gray-700">
                Optional Files
              </h4>
              <div className="space-y-2">
                {checklist.optional.map(({ key, label }) => {
                  const status = checklist.status[key] || "missing";
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {status === "loaded" ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                      <span className="text-gray-500">{label}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
