"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";
import { cn } from "@/components/ui";
import { InfoAlert, PrimaryAlert } from "@/components/ui/alert";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import { extractHingeData } from "@/lib/upload/extract-hinge-data";

interface HingeGuidedUploadProps {
  onComplete: (payload: SwipestatsHingeProfilePayload) => void;
  onUploadStart?: () => void;
}

type FileStatus = "missing" | "loaded" | "error";

interface HingeFileState {
  user: FileStatus;
  matches: FileStatus;
  prompts: FileStatus;
}

const REQUIRED_FILES = {
  user: "user.json",
  matches: "matches.json",
  prompts: "prompts.json",
} as const;

export function HingeGuidedUpload({
  onComplete,
  onUploadStart,
}: HingeGuidedUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileState, setFileState] = useState<HingeFileState>({
    user: "missing",
    matches: "missing",
    prompts: "missing",
  });
  const [jsonContents, setJsonContents] = useState<string[]>([]);
  const [extractedPayload, setExtractedPayload] =
    useState<SwipestatsHingeProfilePayload | null>(null);

  const processFiles = async (files: File[]) => {
    setIsProcessing(true);
    setError(null);
    onUploadStart?.(); // Notify parent that upload has started

    try {
      // Start with existing contents and state - MERGE instead of REPLACE
      const newContents: string[] = [...jsonContents];
      const newFileState: HingeFileState = { ...fileState };

      // Check if any file is a ZIP
      const zipFile = files.find(
        (f) =>
          f.type === "application/zip" ||
          f.type === "application/x-zip-compressed" ||
          f.name.toLowerCase().endsWith(".zip"),
      );

      if (zipFile) {
        // Extract all JSON files from ZIP
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipFile);

        for (const [fileName, file] of Object.entries(zipContent.files)) {
          if (file.dir || !fileName.toLowerCase().endsWith(".json")) continue;

          const content = await file.async("text");
          newContents.push(content);

          // Check which file it is (exact match to avoid confusion with prompt_feedback.json, etc.)
          const baseName = fileName.split("/").pop()?.toLowerCase();
          if (baseName === "user.json") newFileState.user = "loaded";
          if (baseName === "matches.json") newFileState.matches = "loaded";
          if (baseName === "prompts.json") newFileState.prompts = "loaded";
        }
      } else {
        // Process individual files
        for (const file of files) {
          if (!file.name.toLowerCase().endsWith(".json")) continue;

          const content = await file.text();
          newContents.push(content);

          // Detect file type from name (exact match to avoid confusion with prompt_feedback.json, etc.)
          const baseName = file.name.toLowerCase();
          if (baseName === "user.json") newFileState.user = "loaded";
          if (baseName === "matches.json") newFileState.matches = "loaded";
          if (baseName === "prompts.json") newFileState.prompts = "loaded";
        }
      }

      if (newContents.length === jsonContents.length) {
        throw new Error("No new JSON files found");
      }

      // Merge with existing state
      setJsonContents(newContents);
      setFileState(newFileState);

      // Try to extract immediately with ALL accumulated contents
      try {
        const payload = await extractHingeData(newContents);
        setExtractedPayload(payload);
        // Immediately notify parent to show preview
        onComplete(payload);
      } catch (extractError) {
        // If extraction fails, just show the file status
        console.warn("Could not extract Hinge data yet:", extractError);
      }
    } catch (err) {
      console.error("Error processing Hinge files:", err);
      setError(
        err instanceof Error ? err.message : "Failed to process Hinge files",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        void processFiles(acceptedFiles);
      }
    },
    [jsonContents, fileState],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/json": [".json"],
      "application/zip": [".zip"],
    },
    disabled: isProcessing || !!extractedPayload,
    multiple: true,
  });

  const allFilesLoaded =
    fileState.user === "loaded" &&
    fileState.matches === "loaded" &&
    fileState.prompts === "loaded";

  if (extractedPayload) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-green-900">
                Data Extracted Successfully
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Your Hinge data has been anonymized and is ready to upload.
              </p>
            </div>
          </div>
        </div>

        {/* File checklist - showing what was uploaded */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Files Uploaded
          </h3>
          <div className="space-y-2">
            {Object.entries(REQUIRED_FILES).map(([key, fileName]) => {
              const _status = fileState[key as keyof HingeFileState];
              return (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-green-700">{fileName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div
        {...getRootProps()}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed px-6 py-16 transition-all duration-200 sm:px-8 sm:py-20",
          isDragActive
            ? "scale-[1.02] border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg"
            : allFilesLoaded
              ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50"
              : "border-gray-300 bg-gradient-to-br from-gray-50 to-white hover:border-purple-400 hover:shadow-md",
          isProcessing && "cursor-not-allowed opacity-60",
        )}
      >
        <input {...getInputProps()} />

        {/* Decorative background gradient on hover */}
        {!allFilesLoaded && (
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-purple-100/30 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-indigo-100/30 blur-3xl" />
          </div>
        )}

        <div className="relative flex flex-col items-center justify-center space-y-4 text-center sm:space-y-5">
          {/* Icon */}
          <div
            className={cn(
              "rounded-2xl p-4 transition-all duration-200",
              isDragActive
                ? "bg-purple-100 shadow-md"
                : allFilesLoaded
                  ? "bg-green-100"
                  : "bg-gray-100 group-hover:bg-purple-50",
            )}
          >
            <CloudArrowUpIcon
              className={cn(
                "h-16 w-16 transition-colors duration-200 sm:h-20 sm:w-20",
                isDragActive
                  ? "text-purple-600"
                  : allFilesLoaded
                    ? "text-green-600"
                    : "text-gray-400 group-hover:text-purple-500",
              )}
            />
          </div>

          {/* Text content */}
          <div className="space-y-2 sm:space-y-3">
            <p className="text-base font-medium text-gray-700 sm:text-lg">
              Select your{" "}
              <span className="font-semibold text-purple-600">.json files</span>{" "}
              or{" "}
              <span className="font-semibold text-purple-600">
                .zip archive
              </span>
            </p>

            {!isProcessing && (
              <>
                <p className="text-sm text-gray-500 sm:hidden">
                  Tap to browse files
                </p>
                <p className="hidden text-sm text-gray-500 sm:block">
                  or drag and drop your files here
                </p>
              </>
            )}
          </div>

          {/* Drag active state */}
          {isDragActive && (
            <div className="animate-bounce">
              <p className="text-base font-semibold text-purple-600">
                Drop to upload
              </p>
            </div>
          )}

          {/* Processing state */}
          {isProcessing && (
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <p className="text-sm font-medium text-gray-700">
                Processing your data...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* File checklist */}
      {(jsonContents.length > 0 || error) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Required Files
          </h3>
          <div className="space-y-2">
            {Object.entries(REQUIRED_FILES).map(([key, fileName]) => {
              const status = fileState[key as keyof HingeFileState];
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
                    {fileName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      )}

      <PrimaryAlert>
        <p>
          Your files are NOT uploaded to a server. They&apos;re processed
          locally in your browser to extract only the anonymous statistical
          data.
        </p>
      </PrimaryAlert>

      <InfoAlert>
        <p>
          Hinge provides your data in multiple JSON files. You can upload them
          individually or as a ZIP archive. The required files are: user.json,
          matches.json, and prompts.json.
        </p>
      </InfoAlert>
    </div>
  );
}
