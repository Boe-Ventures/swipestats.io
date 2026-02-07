"use client";

import { useState, useRef } from "react";
import JSZip from "jszip";
import { FileUploadZone } from "../../_components/FileUploadZone";
import { InfoAlert, PrimaryAlert } from "@/components/ui/alert";
import type { SwipestatsProfilePayload } from "@/lib/interfaces/TinderDataJSON";
import { extractTinderData } from "@/lib/upload/extract-tinder-data";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import { isGenderDataUnknown } from "@/lib/utils/gender";

interface TinderDataExtractorProps {
  onExtracted: (payload: SwipestatsProfilePayload) => void;
  onError: (error: string) => void;
}

export function TinderDataExtractor({
  onExtracted,
  onError,
}: TinderDataExtractorProps) {
  const { trackEvent } = useAnalytics();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  const processFile = async (file: File) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setError(null);

    // Track file processing start
    trackEvent("upload_file_processing_started", {
      provider: "tinder",
      fileSize: file.size,
      fileType: file.name.toLowerCase().endsWith(".zip") ? ".zip" : ".json",
    });

    try {
      let jsonContent: string;

      // Check if it's a ZIP file
      if (
        file.type === "application/zip" ||
        file.type === "application/x-zip-compressed" ||
        file.name.toLowerCase().endsWith(".zip")
      ) {
        // Extract data.json from ZIP
        try {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);

          // Find data.json in the ZIP
          let dataJsonFile = zipContent.file("data.json");
          if (!dataJsonFile) {
            // Try finding it in subdirectories
            const files = Object.keys(zipContent.files);
            const dataJsonPath = files.find((path) =>
              path.toLowerCase().endsWith("data.json"),
            );
            if (dataJsonPath) {
              dataJsonFile = zipContent.file(dataJsonPath);
            }
          }

          if (!dataJsonFile) {
            trackEvent("upload_file_read_failed", {
              provider: "tinder",
              fileSize: file.size,
              fileType: ".zip",
              errorType: "zip_extraction",
              errorMessage: "Could not find data.json in ZIP archive",
              filesInZip: Object.keys(zipContent.files).length,
            });
            throw new Error("Could not find data.json in ZIP archive");
          }

          jsonContent = await dataJsonFile.async("text");
        } catch (zipErr) {
          trackEvent("upload_file_read_failed", {
            provider: "tinder",
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
        // Read as regular JSON file
        jsonContent = await file.text();
      }

      // Extract and anonymize
      const payload = await extractTinderData(jsonContent);

      // Track successful extraction (fires after anonymization completes)
      const photoCount = Array.isArray(payload.anonymizedTinderJson.Photos)
        ? payload.anonymizedTinderJson.Photos.length
        : 0;
      const hasWork = !!payload.anonymizedTinderJson.User.jobs?.[0];

      trackEvent("upload_preview_loaded", {
        provider: "tinder",
        tinderId: payload.tinderId,
        fileSizeMB: jsonContent.length / 1024 / 1024,
        matchCount: payload.anonymizedTinderJson.Messages.length,
        messageCount: payload.anonymizedTinderJson.Messages.reduce(
          (sum, m) => sum + m.messages.length,
          0,
        ),
        photoCount: photoCount,
        hasPhotos: photoCount > 0,
        hasPhotosConsent: true, // Default true at preview stage
        usageDays: Object.keys(payload.anonymizedTinderJson.Usage.app_opens)
          .length,
        hasWork: hasWork,
        hasWorkConsent: true, // Default true at preview stage
        hasUnknownGender: isGenderDataUnknown(
          payload.anonymizedTinderJson.User.gender,
        ),
      });

      onExtracted(payload);
    } catch (err) {
      console.error("Error processing Tinder file:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process Tinder data";

      // Track specific error type
      if (errorMessage.includes("json is invalid")) {
        // Validation failure
        trackEvent("upload_validation_failed", {
          provider: "tinder",
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
          provider: "tinder",
          fileSize: file.size,
          fileType: file.name.toLowerCase().endsWith(".zip") ? ".zip" : ".json",
          errorType: errorType,
          errorMessage: errorMessage.slice(0, 200),
        });
      }

      setError(errorMessage);
      onError(errorMessage);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleFilesAccepted = (files: File[]) => {
    if (files[0]) {
      void processFile(files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <FileUploadZone
        accept={{
          "application/json": [".json"],
          "application/zip": [".zip"],
        }}
        maxFiles={1}
        onFilesAccepted={handleFilesAccepted}
        isProcessing={isProcessing}
        instructions="Select your data.json file or .zip archive"
        providerName="Tinder"
      />

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      )}

      <PrimaryAlert icon={<ShieldCheckIcon />}>
        <p>
          <strong>Your name, email, and phone are stripped first.</strong> We
          remove identifying info in your browser and let you preview the
          anonymized data before uploading and processing it on our servers.
        </p>
      </PrimaryAlert>

      <InfoAlert>
        <p>
          Don&apos;t have your data yet?{" "}
          <a
            href="https://account.gotinder.com/data"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            Request it from Tinder here
          </a>{" "}
          (takes 24-48 hours)
        </p>
      </InfoAlert>
    </div>
  );
}
