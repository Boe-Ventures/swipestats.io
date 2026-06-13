"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  GraduationCap,
  House,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EDUCATION_LABELS } from "@/lib/format";

import type { RouterOutputs } from "@/trpc/react";
import type { EducationLevel } from "@/server/db/schema";
import type { ProviderConfig } from "./provider-config";

// Shared by the authed edit page and the public share page. The public column
// has no `roastStatus`, and this view doesn't need it, so omit it from the prop.
type ComparisonColumn = Omit<
  RouterOutputs["profileCompare"]["get"]["columns"][number],
  "roastStatus"
>;

interface StackViewProps {
  column: ComparisonColumn;
  providerConfig: ProviderConfig;
  defaultBio?: string;
  onAddContent?: () => void;
  /** When set, the "Browse photo gallery" link opens the library dialog in
   *  place instead of navigating to the standalone /photos page. */
  onBrowseLibrary?: () => void;
  profileName?: string;
  age?: number;
  city?: string;
  educationLevel?: EducationLevel;
  hometown?: string;
  onFeedbackClick?: (contentId: string) => void;
  feedbackCounts?: Record<string, number>;
}

export function StackView({
  column,
  providerConfig,
  defaultBio,
  onAddContent,
  onBrowseLibrary,
  profileName,
  age,
  city,
  educationLevel,
  hometown,
  onFeedbackClick,
  feedbackCounts,
}: StackViewProps) {
  const [currentContentIndex, setCurrentContentIndex] = useState(0);

  const content = column.content;
  const photos = content.filter((c) => c.type === "photo");
  const displayBio = column.bio || defaultBio || "";

  const hasPhotos = photos.length > 0;
  const currentPhoto = hasPhotos ? photos[currentContentIndex] : null;

  const goToNext = () => {
    if (hasPhotos && currentContentIndex < photos.length - 1) {
      setCurrentContentIndex(currentContentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentContentIndex > 0) {
      setCurrentContentIndex(currentContentIndex - 1);
    }
  };

  // Check if this is Tinder for dark theme
  const isTinder = providerConfig.name === "Tinder";

  // Tinder spreads identity across the card stack: bio on the first photo,
  // info lines (education / lives in / from) on the last. A single photo is
  // both, so it shows everything.
  const isFirstPhoto = currentContentIndex === 0;
  const isLastPhoto = currentContentIndex === photos.length - 1;
  const infoLines = [
    educationLevel
      ? { icon: GraduationCap, label: EDUCATION_LABELS[educationLevel] }
      : null,
    city ? { icon: MapPin, label: `Lives in ${city}` } : null,
    hometown ? { icon: House, label: `From ${hometown}` } : null,
  ].filter((line) => line !== null);

  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-2xl"
      style={{
        background: `linear-gradient(135deg, ${providerConfig.brandColor}22 0%, ${providerConfig.secondaryColor}11 100%)`,
      }}
    >
      {/* Mock Device Frame */}
      <div
        className={`relative aspect-[2/3] overflow-hidden rounded-xl ${isTinder ? "bg-black" : "bg-white"}`}
      >
        {/* Photo Display */}
        {hasPhotos && currentPhoto ? (
          <div className="relative h-full w-full">
            {/* Clickable areas for navigation (like Instagram Stories) */}
            <div className="absolute inset-0 z-10 flex">
              <button
                onClick={goToPrevious}
                disabled={currentContentIndex === 0}
                className="flex-1 cursor-pointer disabled:cursor-default"
                aria-label="Previous photo"
              />
              <button
                onClick={goToNext}
                disabled={currentContentIndex === photos.length - 1}
                className="flex-1 cursor-pointer disabled:cursor-default"
                aria-label="Next photo"
              />
            </div>

            {/* Full-screen carousel image with absolute positioned overlays - img preferred for complex layout */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhoto.attachment?.url}
              alt={currentPhoto.caption || `Photo ${currentContentIndex + 1}`}
              className="h-full w-full object-cover"
            />

            {/* Caption overlay if present */}
            {currentPhoto.caption && (
              <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/70 to-transparent p-4">
                <p className="text-sm text-white">{currentPhoto.caption}</p>
              </div>
            )}

            {/* Photo Progress Bars - Tinder/Instagram Stories style */}
            <div className="absolute top-3 right-0 left-0 z-20 flex gap-1 px-3">
              {photos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentContentIndex(index)}
                  className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30 backdrop-blur-sm"
                >
                  <div
                    className="h-full bg-white transition-all duration-200"
                    style={{
                      width:
                        index < currentContentIndex
                          ? "100%"
                          : index === currentContentIndex
                            ? "100%"
                            : "0%",
                    }}
                  />
                </button>
              ))}
            </div>

            {/* Profile Info Overlay - Tinder Style */}
            <div
              className={`absolute inset-x-0 bottom-0 p-5 text-white ${
                isTinder
                  ? "bg-linear-to-t from-black via-black/60 to-transparent"
                  : "bg-linear-to-t from-black/80 via-black/40 to-transparent"
              }`}
            >
              {/* Name and verified badge */}
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-3xl font-bold">
                  {profileName || "Name"}
                  {age && `, ${age}`}
                </h2>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                  <Check className="h-3 w-3 text-white" />
                </div>
              </div>

              {displayBio && isFirstPhoto && (
                <p className="mb-3 line-clamp-2 text-base leading-relaxed">
                  {displayBio}
                </p>
              )}

              {/* Tinder puts job / school / location on the closing photo. */}
              {isLastPhoto && infoLines.length > 0 && (
                <div className="mb-3 space-y-1">
                  {infoLines.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Comment button — z-20 lifts it above the full-photo
                  prev/next nav overlay (z-10) so it stays clickable. */}
              <div className="absolute right-5 bottom-3 z-20 flex items-center gap-2">
                {onFeedbackClick && currentPhoto && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 border-0 bg-black/70 text-white hover:bg-black/80"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFeedbackClick(currentPhoto.id);
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {feedbackCounts?.[currentPhoto.id] ? (
                      <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                        {feedbackCounts[currentPhoto.id]! > 9
                          ? "9+"
                          : feedbackCounts[currentPhoto.id]}
                      </div>
                    ) : null}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-b from-gray-100 to-gray-200 p-6 text-center transition-all hover:from-gray-200 hover:to-gray-300">
            <div className="mb-4 rounded-full bg-white/80 p-4 shadow-sm">
              <Plus className="text-muted-foreground h-8 w-8" />
            </div>
            <p className="mb-2 font-medium text-gray-900">No photos yet</p>
            <p className="text-muted-foreground mb-4 text-sm">
              Click to add photos and preview your {providerConfig.name} profile
            </p>
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddContent?.();
                }}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Photos
              </Button>
              {onBrowseLibrary ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBrowseLibrary();
                  }}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  <ImageIcon className="mr-1 inline h-3 w-3" />
                  Browse photo gallery
                </button>
              ) : (
                <Link
                  href="/app/profile-compare/photos"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  <ImageIcon className="mr-1 inline h-3 w-3" />
                  Browse photo gallery
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
