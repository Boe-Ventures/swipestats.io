"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  Plus,
  Image as ImageIcon,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { RouterOutputs } from "@/trpc/react";
import type { ProviderConfig } from "./provider-config";

type ComparisonColumn =
  RouterOutputs["profileCompare"]["get"]["columns"][number];

interface StackViewProps {
  column: ComparisonColumn;
  providerConfig: ProviderConfig;
  defaultBio?: string;
  onAddContent?: () => void;
  profileName?: string;
  age?: number;
  onFeedbackClick?: (contentId: string) => void;
  feedbackCounts?: Record<string, number>;
}

export function StackView({
  column,
  providerConfig,
  defaultBio,
  onAddContent,
  profileName,
  age,
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

            <img
              src={currentPhoto.attachment?.url}
              alt={currentPhoto.caption || `Photo ${currentContentIndex + 1}`}
              className="h-full w-full object-cover"
            />

            {/* Caption overlay if present */}
            {currentPhoto.caption && (
              <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/70 to-transparent p-4">
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
                  ? "bg-gradient-to-t from-black via-black/60 to-transparent"
                  : "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
              }`}
            >
              {/* Name and verified badge */}
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-3xl font-bold">
                  {profileName || "Name"}
                  {age && `, ${age}`}
                </h2>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500">
                  <Check className="h-4 w-4 text-white" />
                </div>
              </div>

              {displayBio && (
                <p className="mb-3 line-clamp-2 text-base leading-relaxed">
                  {displayBio}
                </p>
              )}

              {/* Info pills - Tinder style */}
              {isTinder && (
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
                    <span className="text-sm">📍</span>
                    <span className="text-sm">Less than a mile away</span>
                  </div>
                </div>
              )}

              {/* Provider badge and comment button */}
              <div className="absolute right-5 bottom-3 flex items-center gap-2">
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
                <Badge
                  variant="secondary"
                  className="text-xs font-semibold opacity-60"
                  style={{
                    backgroundColor: providerConfig.brandColor,
                    color: "white",
                  }}
                >
                  {providerConfig.name}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-6 text-center transition-all hover:from-gray-200 hover:to-gray-300">
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
              <Link
                href="/app/profile-compare/photos"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-foreground text-xs underline"
              >
                <ImageIcon className="mr-1 inline h-3 w-3" />
                Browse photo gallery
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
