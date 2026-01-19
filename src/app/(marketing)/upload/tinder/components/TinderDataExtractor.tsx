"use client";

import { useState } from "react";
import JSZip from "jszip";
import { FileUploadZone } from "../../_components/FileUploadZone";
import { InfoAlert, PrimaryAlert } from "@/components/ui/alert";
import type { SwipestatsProfilePayload } from "@/lib/interfaces/TinderDataJSON";
import { extractTinderData } from "@/lib/upload/extract-tinder-data";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";

interface TinderDataExtractorProps {
  onExtracted: (payload: SwipestatsProfilePayload) => void;
  onError: (error: string) => void;
}

export function TinderDataExtractor({
  onExtracted,
  onError,
}: TinderDataExtractorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      let jsonContent: string;

      // Check if it's a ZIP file
      if (
        file.type === "application/zip" ||
        file.type === "application/x-zip-compressed" ||
        file.name.toLowerCase().endsWith(".zip")
      ) {
        // Extract data.json from ZIP
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
          throw new Error("Could not find data.json in ZIP archive");
        }

        jsonContent = await dataJsonFile.async("text");
      } else {
        // Read as regular JSON file
        jsonContent = await file.text();
      }

      // Extract and anonymize
      const payload = await extractTinderData(jsonContent);
      onExtracted(payload);
    } catch (err) {
      console.error("Error processing Tinder file:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to process Tinder data";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
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
