"use client";

import { useState, useCallback } from "react";
import JSZip from "jszip";
import { FileUploadZone } from "../../_components/FileUploadZone";
import { InfoAlert, PrimaryAlert } from "@/components/ui/alert";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import { extractHingeData } from "@/lib/upload/extract-hinge-data";
import { useAnalytics } from "@/contexts/AnalyticsProvider";

interface HingeDataExtractorProps {
  onExtracted: (payload: SwipestatsHingeProfilePayload) => void;
  onError: (error: string) => void;
}

const REQUIRED_FILES = [
  { key: "user", label: "user.json", fileName: "user.json" },
  { key: "matches", label: "matches.json", fileName: "matches.json" },
];

const OPTIONAL_FILES = [
  { key: "prompts", label: "prompts.json", fileName: "prompts.json" },
  { key: "media", label: "media.json", fileName: "media.json" },
];

type FileStatus = "missing" | "loaded" | "error";

export function HingeDataExtractor({
  onExtracted,
  onError,
}: HingeDataExtractorProps) {
  const { trackEvent } = useAnalytics();
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileStatus, setFileStatus] = useState<Record<string, FileStatus>>({});
  const [files, setFiles] = useState<Record<string, string>>({});

  const processFiles = useCallback(
    async (acceptedFiles: File[]) => {
      setIsProcessing(true);
      const newFiles: Record<string, string> = { ...files };
      const newStatus: Record<string, FileStatus> = { ...fileStatus };

      // Track file processing start
      if (acceptedFiles.length > 0) {
        const totalSize = acceptedFiles.reduce((sum, f) => sum + f.size, 0);
        const isZip = acceptedFiles.some((f) =>
          f.name.toLowerCase().endsWith(".zip"),
        );

        trackEvent("upload_file_processing_started", {
          provider: "hinge",
          fileSize: totalSize,
          fileType: isZip ? ".zip" : ".json",
        });
      }

      try {
        for (const file of acceptedFiles) {
          // Check if it's a ZIP
          if (
            file.type === "application/zip" ||
            file.type === "application/x-zip-compressed" ||
            file.name.toLowerCase().endsWith(".zip")
          ) {
            try {
              const zip = new JSZip();
              const zipContent = await zip.loadAsync(file);

              // Extract all relevant JSON files
              const allFiles = [...REQUIRED_FILES, ...OPTIONAL_FILES];
              for (const fileInfo of allFiles) {
                let jsonFile = zipContent.file(fileInfo.fileName);
                if (!jsonFile) {
                  // Try finding in subdirectories
                  const files = Object.keys(zipContent.files);
                  const path = files.find((p) =>
                    p.toLowerCase().endsWith(fileInfo.fileName.toLowerCase()),
                  );
                  if (path) {
                    jsonFile = zipContent.file(path);
                  }
                }

                if (jsonFile) {
                  const content = await jsonFile.async("text");
                  newFiles[fileInfo.key] = content;
                  newStatus[fileInfo.key] = "loaded";
                }
              }
            } catch (zipErr) {
              trackEvent("upload_file_read_failed", {
                provider: "hinge",
                fileSize: file.size,
                fileType: ".zip",
                errorType: "zip_extraction",
                errorMessage:
                  zipErr instanceof Error
                    ? zipErr.message.slice(0, 200)
                    : "ZIP extraction failed",
              });
              throw zipErr;
            }
          } else {
            // Individual JSON file
            const content = await file.text();
            const fileName = file.name.toLowerCase();

            const fileInfo = [...REQUIRED_FILES, ...OPTIONAL_FILES].find((f) =>
              fileName.includes(f.fileName.replace(".json", "")),
            );

            if (fileInfo) {
              newFiles[fileInfo.key] = content;
              newStatus[fileInfo.key] = "loaded";
            }
          }
        }

        setFiles(newFiles);
        setFileStatus(newStatus);

        // Check if all required files are present
        const hasAllRequired = REQUIRED_FILES.every(
          (f) => newStatus[f.key] === "loaded",
        );

        if (hasAllRequired) {
          // Extract and combine data
          const jsonStrings = [
            newFiles.user!,
            newFiles.matches!,
            newFiles.prompts,
            newFiles.likes,
          ].filter((file): file is string => file !== undefined);

          const payload = await extractHingeData(jsonStrings);

          // Track successful extraction (fires after anonymization completes)
          const totalSize = jsonStrings.reduce((sum, s) => sum + s.length, 0);
          const photoCount = payload.anonymizedHingeJson.Media?.length || 0;

          trackEvent("upload_preview_loaded", {
            provider: "hinge",
            hingeId: payload.hingeId,
            fileSizeMB: totalSize / 1024 / 1024,
            matchCount: payload.anonymizedHingeJson.Matches.length,
            messageCount: payload.anonymizedHingeJson.Matches.reduce(
              (sum, m) => sum + (m.chats?.length || 0),
              0,
            ),
            photoCount: photoCount,
            hasPhotos: photoCount > 0,
            hasPhotosConsent: true, // Default true at preview stage
            promptCount: payload.anonymizedHingeJson.Prompts?.length || 0,
          });

          onExtracted(payload);
        }
      } catch (err) {
        console.error("Error processing Hinge files:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to process Hinge data";

        // Track specific error type
        const totalSize = acceptedFiles.reduce((sum, f) => sum + f.size, 0);
        if (errorMessage.includes("json is invalid")) {
          // Validation failure
          trackEvent("upload_validation_failed", {
            provider: "hinge",
            missingFields: [], // Would need to export from extraction function
            errorMessage: errorMessage.slice(0, 200),
          });
        } else {
          // File read/extraction/parse failure - consolidated
          const errorType = errorMessage.includes("ZIP")
            ? "zip_extraction"
            : errorMessage.includes("JSON")
              ? "json_parse"
              : "file_read";

          trackEvent("upload_file_read_failed", {
            provider: "hinge",
            fileSize: totalSize,
            fileType: acceptedFiles.some((f) =>
              f.name.toLowerCase().endsWith(".zip"),
            )
              ? ".zip"
              : ".json",
            errorType: errorType,
            errorMessage: errorMessage.slice(0, 200),
          });
        }

        onError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [files, fileStatus, onExtracted, onError, trackEvent],
  );

  return (
    <div className="space-y-4">
      <FileUploadZone
        accept={{
          "application/json": [".json"],
          "application/zip": [".zip"],
        }}
        maxFiles={10}
        onFilesAccepted={processFiles}
        isProcessing={isProcessing}
        instructions="Upload your Hinge data files (user.json, matches.json, etc.) or a ZIP archive"
        providerName="Hinge"
        checklist={{
          required: REQUIRED_FILES,
          optional: OPTIONAL_FILES,
          status: fileStatus,
        }}
      />

      <PrimaryAlert>
        <p>
          <strong>Your name, email, and phone are stripped first.</strong> We
          remove identifying info in your browser before sending anonymized data
          to our servers.
        </p>
      </PrimaryAlert>

      <InfoAlert>
        <p>
          Don&apos;t have your data yet? Go to Hinge Settings → Account →
          Download My Data (takes 24-48 hours).
        </p>
      </InfoAlert>
    </div>
  );
}
