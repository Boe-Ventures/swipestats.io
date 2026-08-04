"use client";

import { useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";
import { cn } from "@/components/ui";
import { InfoAlert, PrimaryAlert } from "@/components/ui/alert";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import { extractHingeData } from "@/lib/upload/extract-hinge-data";
import {
  buildHingeExtractionInput,
  claimHingeExportFileCandidate,
  EMPTY_HINGE_CHECKLIST_STATE,
  hasRequiredHingeExportFiles,
  HINGE_OPTIONAL_EXPORT_FILES,
  HINGE_REQUIRED_EXPORT_FILES,
  hingeExtractionErrorMessage,
  validateHingeExportFile,
  type HingeChecklistState,
  type HingeExportFileContents,
  type HingeExportFileKey,
} from "@/lib/upload/hinge-guided-upload";

interface HingeGuidedUploadProps {
  onComplete: (payload: SwipestatsHingeProfilePayload) => void;
  onUploadStart?: () => void;
}

class HingeUploadInputError extends Error {}

export function HingeGuidedUpload({
  onComplete,
  onUploadStart,
}: HingeGuidedUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileState, setFileState] = useState<HingeChecklistState>({
    ...EMPTY_HINGE_CHECKLIST_STATE,
  });
  const [fileContents, setFileContents] = useState<HingeExportFileContents>({});
  const [extractedPayload, setExtractedPayload] =
    useState<SwipestatsHingeProfilePayload | null>(null);
  const isProcessingRef = useRef(false);

  const processFiles = async (files: File[]) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setError(null);
    onUploadStart?.(); // Notify parent that upload has started

    try {
      const nextContents: HingeExportFileContents = { ...fileContents };
      const nextFileState: HingeChecklistState = { ...fileState };
      const validationErrors: Partial<Record<HingeExportFileKey, string>> = {};
      const claimedKeys = new Set<HingeExportFileKey>();
      let recognizedFileCount = 0;

      const claimFile = (fileName: string): HingeExportFileKey | undefined => {
        const candidate = claimHingeExportFileCandidate(fileName, claimedKeys);
        if (!candidate) return undefined;
        recognizedFileCount += 1;
        if (!candidate.duplicate) return candidate.key;

        delete nextContents[candidate.key];
        nextFileState[candidate.key] = "error";
        validationErrors[candidate.key] =
          `More than one ${candidate.key}.json was found in the same selection. Upload one Hinge export at a time.`;
        return undefined;
      };

      const stageFile = (key: HingeExportFileKey, content: string) => {
        const result = validateHingeExportFile(key, content);
        if (!result.ok) {
          delete nextContents[key];
          nextFileState[key] = "error";
          validationErrors[key] = result.message;
          return;
        }

        nextContents[key] = content;
        nextFileState[key] = "loaded";
        delete validationErrors[key];
      };

      const markFileReadError = (key: HingeExportFileKey, fileName: string) => {
        delete nextContents[key];
        nextFileState[key] = "error";
        validationErrors[key] =
          `${fileName.split(/[\\/]/).pop()?.toLowerCase() ?? "This file"} could not be read. Replace it with the original file from your Hinge download.`;
      };

      for (const file of files) {
        const isZip =
          file.type === "application/zip" ||
          file.type === "application/x-zip-compressed" ||
          file.name.toLowerCase().endsWith(".zip");

        if (isZip) {
          let zipContent: JSZip;
          try {
            zipContent = await JSZip.loadAsync(file);
          } catch {
            throw new HingeUploadInputError(
              "We couldn't open that ZIP archive. Download a fresh copy from Hinge and try again.",
            );
          }

          for (const [fileName, zipEntry] of Object.entries(zipContent.files)) {
            if (zipEntry.dir) continue;
            const key = claimFile(fileName);
            if (!key) continue;
            try {
              stageFile(key, await zipEntry.async("text"));
            } catch {
              markFileReadError(key, fileName);
            }
          }
        } else {
          const key = claimFile(file.name);
          if (!key) continue;
          try {
            stageFile(key, await file.text());
          } catch {
            markFileReadError(key, file.name);
          }
        }
      }

      if (recognizedFileCount === 0) {
        throw new HingeUploadInputError(
          "No recognized Hinge export files were found. Add user.json and matches.json, or upload the original ZIP archive.",
        );
      }

      setFileContents(nextContents);
      setFileState(nextFileState);

      const currentValidationErrors = Object.values(validationErrors);
      if (currentValidationErrors.length > 0) {
        setExtractedPayload(null);
        setError(
          currentValidationErrors[0] ??
            "A Hinge export file could not be read.",
        );
        return;
      }

      if (Object.values(nextFileState).includes("error")) {
        setExtractedPayload(null);
        setError("Replace the export files marked in red before continuing.");
        return;
      }

      if (!hasRequiredHingeExportFiles(nextFileState)) {
        return;
      }

      const { jsonStrings, filePresence } =
        buildHingeExtractionInput(nextContents);

      try {
        const payload = await extractHingeData(jsonStrings, filePresence);
        setExtractedPayload(payload);
      } catch {
        setExtractedPayload(null);
        setError(hingeExtractionErrorMessage());
      }
    } catch (err) {
      setError(
        err instanceof HingeUploadInputError
          ? err.message
          : "We couldn't read those files. Download a fresh copy from Hinge and try again.",
      );
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      void processFiles(acceptedFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/json": [".json"],
      "application/zip": [".zip"],
    },
    disabled: isProcessing,
    multiple: true,
  });

  const allRequiredFilesLoaded = hasRequiredHingeExportFiles(fileState);
  const isReady =
    allRequiredFilesLoaded &&
    !Object.values(fileState).includes("error") &&
    !error;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div
        {...getRootProps()}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed px-6 py-16 transition-all duration-200 sm:px-8 sm:py-20",
          isDragActive
            ? "scale-[1.02] border-purple-500 bg-linear-to-br from-purple-50 to-indigo-50 shadow-lg"
            : isReady
              ? "border-green-500 bg-linear-to-br from-green-50 to-emerald-50"
              : "border-gray-300 bg-linear-to-br from-gray-50 to-white hover:border-purple-400 hover:shadow-md",
          isProcessing && "cursor-not-allowed opacity-60",
        )}
      >
        <input {...getInputProps()} />

        {/* Decorative background gradient on hover */}
        {!isReady && (
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
                : isReady
                  ? "bg-green-100"
                  : "bg-gray-100 group-hover:bg-purple-50",
            )}
          >
            <CloudArrowUpIcon
              className={cn(
                "h-16 w-16 transition-colors duration-200 sm:h-20 sm:w-20",
                isDragActive
                  ? "text-purple-600"
                  : isReady
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
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">
          Required Files
        </h3>
        <div className="space-y-2">
          {HINGE_REQUIRED_EXPORT_FILES.map(({ key, fileName }) => {
            const status = fileState[key];
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

        <h4 className="mt-4 mb-2 text-sm font-semibold text-gray-700">
          Optional Files
        </h4>
        <div className="space-y-2">
          {HINGE_OPTIONAL_EXPORT_FILES.map(({ key, fileName }) => {
            const status = fileState[key];
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
                        : "text-gray-500",
                  )}
                >
                  {fileName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      )}

      {extractedPayload && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-green-900">
                Required data is ready
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Add prompts.json or media.json now if you want them included,
                then continue.
              </p>
              <button
                type="button"
                onClick={() => onComplete(extractedPayload)}
                className="mt-4 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Continue with these files
              </button>
            </div>
          </div>
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
          and matches.json. prompts.json and media.json are optional.
        </p>
      </InfoAlert>
    </div>
  );
}
