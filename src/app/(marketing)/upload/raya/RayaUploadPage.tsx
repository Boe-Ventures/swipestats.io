"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircleIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";
import { useMutation } from "@tanstack/react-query";
import { upload } from "@vercel/blob/client";
import JSZip from "jszip";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

import { SubmitButton } from "../_components/SubmitButton";
import { cn } from "@/components/ui";
import { useAnalytics } from "@/contexts/AnalyticsProvider";
import type { SwipestatsRayaProfilePayload } from "@/lib/interfaces/RayaDataJSON";
import { extractRayaData } from "@/lib/upload/extract-raya-data";
import { authClient } from "@/server/better-auth/client";
import { useTRPC } from "@/trpc/react";

const REQUIRED_FILES = [
  "user.json",
  "matches.json",
  "messages.json",
  "social_likes_dislikes.json",
] as const;

export function RayaUploadPage() {
  const [payload, setPayload] = useState<SwipestatsRayaProfilePayload | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [uploadState, setUploadState] = useState<
    "idle" | "session" | "uploading" | "processing"
  >("idle");
  const [photosConsent, setPhotosConsent] = useState(false);
  const [workConsent, setWorkConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const isReadingRef = useRef(false);

  const router = useRouter();
  const trpc = useTRPC();
  const { trackEvent } = useAnalytics();
  const { data: session } = authClient.useSession();

  const saveMutation = useMutation(
    trpc.rayaProfile.saveProfile.mutationOptions({
      onSuccess: ({ rayaId }) => router.push(`/insights/raya/${rayaId}`),
      onError: (mutationError) => {
        setError(mutationError.message || "Could not process the Raya export");
        setUploadState("idle");
      },
    }),
  );

  const processArchive = async (file: File) => {
    if (isReadingRef.current) return;
    isReadingRef.current = true;
    setIsReading(true);
    setError(null);

    try {
      const zip = await JSZip.loadAsync(file);
      const jsonFiles: Record<string, string> = {};

      for (const [fileName, entry] of Object.entries(zip.files)) {
        if (!entry.dir && fileName.toLowerCase().endsWith(".json")) {
          jsonFiles[fileName] = await entry.async("text");
        }
      }

      setPayload(await extractRayaData(jsonFiles));
    } catch (archiveError) {
      setPayload(null);
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Could not read the Raya archive",
      );
    } finally {
      isReadingRef.current = false;
      setIsReading(false);
    }
  };

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (file) void processArchive(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
    },
    maxFiles: 1,
    disabled: isReading || uploadState !== "idle",
  });

  const handleSubmit = async () => {
    if (!payload || !termsAccepted || uploadState !== "idle") return;

    const photoCount = payload.anonymizedRayaJson.User.photos.length;
    trackEvent("upload_submit_clicked", {
      provider: "raya",
      rayaId: payload.rayaId,
      photoCount: photosConsent ? photoCount : 0,
      hasPhotos: photoCount > 0,
      hasPhotosConsent: photosConsent,
      hasWork:
        !!payload.anonymizedRayaJson.User.occupation ||
        !!payload.anonymizedRayaJson.User.company,
      hasWorkConsent: workConsent,
      matchCount: payload.anonymizedRayaJson.Summary.matches,
      scenario: "create_or_refresh",
    });

    try {
      if (!session) {
        setUploadState("session");
        const { error: sessionError } = await authClient.signIn.anonymous({
          fetchOptions: {
            headers: { "X-Anonymous-Source": "upload_flow" },
          },
        });
        if (sessionError) throw new Error("Could not create an upload session");
      }

      setUploadState("uploading");
      const filteredJson = {
        ...payload.anonymizedRayaJson,
        User: {
          ...payload.anonymizedRayaJson.User,
          photos: photosConsent ? payload.anonymizedRayaJson.User.photos : [],
          occupation: workConsent
            ? payload.anonymizedRayaJson.User.occupation
            : undefined,
          company: workConsent
            ? payload.anonymizedRayaJson.User.company
            : undefined,
        },
      };
      const jsonBlob = new Blob([JSON.stringify(filteredJson)], {
        type: "application/json",
      });
      const date = new Date().toISOString().slice(0, 10);
      const blob = await upload(
        `raya-data/${payload.rayaId}/${date}/data.json`,
        jsonBlob,
        {
          access: "public",
          handleUploadUrl: "/api/blob/client-upload",
          clientPayload: JSON.stringify({ resourceType: "raya_data" }),
        },
      );

      setUploadState("processing");
      saveMutation.mutate({ rayaId: payload.rayaId, blobUrl: blob.url });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not upload the Raya archive",
      );
      setUploadState("idle");
    }
  };

  const summary = payload?.anonymizedRayaJson.Summary;
  const isBusy = isReading || uploadState !== "idle" || saveMutation.isPending;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="font-mono text-xs tracking-wider text-gray-500 uppercase">
          New provider
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Upload your Raya data
        </h1>
        <p className="mt-3 text-gray-600">
          Drop the original ZIP. Identifying fields are removed before upload.
        </p>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "cursor-pointer rounded-2xl border-2 border-dashed px-6 py-14 text-center transition",
          isDragActive
            ? "border-gray-900 bg-gray-100"
            : "border-gray-300 bg-white hover:border-gray-500",
          isBusy && "cursor-not-allowed opacity-60",
        )}
      >
        <input {...getInputProps()} />
        {payload ? (
          <CheckCircleIcon className="mx-auto h-14 w-14 text-emerald-600" />
        ) : (
          <CloudArrowUpIcon className="mx-auto h-14 w-14 text-gray-400" />
        )}
        <p className="mt-4 font-medium text-gray-900">
          {isReading
            ? "Reading and anonymizing your archive..."
            : payload
              ? "Raya archive ready"
              : "Choose your Raya ZIP archive"}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Required: {REQUIRED_FILES.join(", ")}
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {payload && summary && (
        <div className="mt-6 space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Archive summary
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {summary.firstActivityAt} to {summary.lastActivityAt}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Likes", summary.likes],
              ["Passes", summary.passes],
              ["Matches", summary.matches],
              ["Messages sent", summary.messagesSent],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-gray-50 p-4">
                <p className="text-2xl font-semibold text-gray-900">
                  {Number(value).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-5 text-sm text-gray-700">
            <ConsentCheckbox
              checked={photosConsent}
              onChange={setPhotosConsent}
              label="Include my profile photo URLs in my private profile"
            />
            <ConsentCheckbox
              checked={workConsent}
              onChange={setWorkConsent}
              label="Include my occupation and company in my private profile"
            />
            <ConsentCheckbox
              checked={termsAccepted}
              onChange={setTermsAccepted}
              label="I agree to the terms and privacy policy"
            />
          </div>

          <SubmitButton
            onClick={handleSubmit}
            disabled={!termsAccepted || isBusy}
            isLoading={isBusy}
            className="bg-gray-950 hover:bg-gray-800"
          >
            Upload &amp; view Raya insights
          </SubmitButton>
        </div>
      )}
    </div>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-gray-950"
      />
      <span>{label}</span>
    </label>
  );
}
