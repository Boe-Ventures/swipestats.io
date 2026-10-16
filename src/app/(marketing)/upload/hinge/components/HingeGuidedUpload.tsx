"use client";

import { useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import JSZip from "jszip";
import { CloudArrowUpIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import type { SwipestatsHingeProfilePayload } from "@/lib/interfaces/HingeDataJSON";
import { extractHingeData } from "@/lib/upload/extract-hinge-data";
import {
  extractHingeCsvData,
  getHingeCsvTable,
  type HingeCsvFiles,
} from "@/lib/upload/hinge-csv";
import { HINGE_CSV_ACTIVITY_TABLES } from "@/lib/hinge/csv-activity";
import {
  buildHingeExtractionInput,
  getHingeExportFileKey,
  validateHingeExportFile,
  type HingeExportFileContents,
} from "@/lib/upload/hinge-guided-upload";

interface HingeGuidedUploadProps {
  onComplete: (payload: SwipestatsHingeProfilePayload) => void;
  onUploadStart?: () => void;
}
const MAX_FILE_BYTES = 32 * 1024 * 1024;

export function HingeGuidedUpload({
  onComplete,
  onUploadStart,
}: HingeGuidedUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const processing = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [csvFiles, setCsvFiles] = useState<HingeCsvFiles>({});
  const [jsonFiles, setJsonFiles] = useState<HingeExportFileContents>({});
  const [payload, setPayload] = useState<SwipestatsHingeProfilePayload | null>(
    null,
  );
  const isCsv = Object.keys(csvFiles).length > 0;
  const loaded = isCsv
    ? Object.keys(csvFiles).map((key) => `${key}.csv`)
    : Object.keys(jsonFiles).map((key) => `${key}.json`);

  const processFiles = async (files: File[]) => {
    if (processing.current) return;
    processing.current = true;
    setIsProcessing(true);
    setPayload(null);
    setError(null);
    onUploadStart?.();
    try {
      const nextCsv = { ...csvFiles };
      const nextJson = { ...jsonFiles };
      const claimed = new Set<string>();
      const stage = async (path: string, read: () => Promise<string>) => {
        if (
          path
            .split(/[\\/]/)
            .some((part) => part === "__MACOSX" || part.startsWith("._"))
        )
          return;
        const csvKey = getHingeCsvTable(path);
        const jsonKey = getHingeExportFileKey(path);
        if (!csvKey && !jsonKey) return;
        const name = csvKey ? `${csvKey}.csv` : `${jsonKey}.json`;
        if (claimed.has(name))
          throw new Error(
            "More than one copy of an export table was found. Choose one Hinge export at a time.",
          );
        claimed.add(name);
        const content = await read();
        if (content.length > MAX_FILE_BYTES)
          throw new Error(
            "A Hinge data file is too large to process. Choose the original export files.",
          );
        if (csvKey) nextCsv[csvKey] = content;
        else if (jsonKey) {
          const validation = validateHingeExportFile(jsonKey, content);
          if (!validation.ok) throw new Error(validation.message);
          nextJson[jsonKey] = content;
        }
      };
      for (const file of files) {
        if (file.name.toLowerCase().endsWith(".zip")) {
          const zip = await JSZip.loadAsync(file);
          for (const [path, entry] of Object.entries(zip.files))
            if (!entry.dir) await stage(path, () => entry.async("text"));
        } else {
          if (file.size > MAX_FILE_BYTES)
            throw new Error("A Hinge data file is too large to process.");
          await stage(file.name, () => file.text());
        }
      }
      if (!claimed.size)
        throw new Error(
          "No supported Hinge data files were found. Choose the original ZIP or the CSV files inside it.",
        );
      if (Object.keys(nextCsv).length && Object.keys(nextJson).length)
        throw new Error(
          "CSV and JSON exports cannot be combined. Clear these files and choose one export.",
        );
      setCsvFiles(nextCsv);
      setJsonFiles(nextJson);
      if (Object.keys(nextCsv).length) {
        if (
          nextCsv.user &&
          HINGE_CSV_ACTIVITY_TABLES.some(
            (table) => nextCsv[table] !== undefined,
          )
        )
          setPayload(await extractHingeCsvData(nextCsv));
      } else if (nextJson.user && nextJson.matches) {
        const { jsonStrings, filePresence } =
          buildHingeExtractionInput(nextJson);
        setPayload(await extractHingeData(jsonStrings, filePresence));
      }
    } catch {
      // Never reflect parse errors, filenames, or cell values from personal exports.
      setError(
        "We couldn't validate these files as one Hinge export. Use the original ZIP, or clear the selection and add user.csv with its activity CSV files. Older exports need user.json and matches.json.",
      );
    } finally {
      processing.current = false;
      setIsProcessing(false);
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      void processFiles(files);
    },
    onDropRejected: () =>
      setError(
        "Choose the original ZIP archive or CSV/JSON data files from your Hinge download.",
      ),
    accept: {
      "application/zip": [".zip"],
      "application/json": [".json"],
      "text/csv": [".csv"],
    },
    disabled: isProcessing,
    multiple: true,
  });
  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`bg-card cursor-pointer rounded-xl border-2 border-dashed px-6 py-14 text-center ${isDragActive ? "border-primary" : "border-border"}`}
      >
        <input {...getInputProps()} />
        <CloudArrowUpIcon className="text-muted-foreground mx-auto mb-4 h-14 w-14" />
        <p className="text-lg font-semibold">
          {isProcessing
            ? "Reading your Hinge data..."
            : "Choose your Hinge ZIP archive"}
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Or drop the CSV files from your unzipped download. Older JSON exports
          are also supported.
        </p>
      </div>
      <div className="bg-card rounded-lg border p-4 text-sm">
        <p className="font-semibold">
          {isCsv ? "CSV export" : "Files to include"}
        </p>
        <p className="text-muted-foreground mt-1">
          Include user.csv and your activity tables: chat_message, match_likes,
          match_roses, match_skips, and match_blocks. Prompts and user_media are
          optional.
        </p>
        {loaded.length > 0 && (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {loaded.map((name) => (
              <li key={name} className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-green-600" />
                {name}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="mt-3 underline underline-offset-4"
          disabled={isProcessing}
          onClick={() => {
            setCsvFiles({});
            setJsonFiles({});
            setPayload(null);
            setError(null);
          }}
        >
          Clear files and start again
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}
      {payload && !error && (
        <div className="rounded-lg border border-green-600 p-4">
          <p className="font-semibold">Your data is ready</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Add any optional files before continuing. Review your profile and
            sharing choices next.
          </p>
          <button
            type="button"
            className="mt-4 rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
            onClick={() => onComplete(payload)}
          >
            Continue with these files
          </button>
        </div>
      )}
      <p className="text-muted-foreground text-sm">
        Files are read locally in your browser. Direct identifiers, raw
        conversation IDs, IP logs, and selfie verification files are excluded
        before upload. CSV message text is reduced to character counts.
      </p>
    </div>
  );
}
