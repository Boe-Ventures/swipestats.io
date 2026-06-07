"use client";

import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check, Plus, Image as ImageIcon, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { RouterOutputs } from "@/trpc/react";
import type { ProviderConfig } from "./provider-config";

// Shared by the authed edit page and the public share page. The public column
// has no `roastStatus`, and this view doesn't need it, so omit it from the prop.
type ComparisonColumn = Omit<
  RouterOutputs["profileCompare"]["get"]["columns"][number],
  "roastStatus"
>;

interface FlowViewProps {
  column: ComparisonColumn;
  providerConfig: ProviderConfig;
  defaultBio?: string;
  onAddContent?: () => void;
  profileName?: string;
  age?: number;
  onFeedbackClick?: (contentId: string) => void;
  feedbackCounts?: Record<string, number>;
}

export function FlowView({
  column,
  providerConfig,
  defaultBio,
  onAddContent,
  profileName,
  age,
  onFeedbackClick,
  feedbackCounts,
}: FlowViewProps) {
  const content = column.content;
  const _photos = content.filter((c) => c.type === "photo");
  const _prompts = content.filter((c) => c.type === "prompt");
  const displayBio = column.bio || defaultBio || "";

  const hasContent = content.length > 0;

  // Hinge interleaves the bio between photos rather than dumping it at the end.
  // Inject it right after the second photo; if there are fewer than two photos
  // we render it at the end instead (see fallback below).
  const photoContentIndexes = content
    .map((item, i) => (item.type === "photo" && item.attachment ? i : -1))
    .filter((i) => i !== -1);
  const bioAfterIndex = photoContentIndexes[1] ?? -1;

  const bioSection = displayBio ? (
    <div className="bg-white px-4 pb-4">
      <div className="mb-3">
        <h3 className="text-lg font-bold text-gray-900">My bio</h3>
      </div>
      <p className="text-base leading-relaxed text-gray-900">{displayBio}</p>
    </div>
  ) : null;

  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-2xl"
      style={{
        background: `linear-gradient(135deg, ${providerConfig.brandColor}22 0%, ${providerConfig.secondaryColor}11 100%)`,
      }}
    >
      {/* Mock Device Frame. The empty state is rendered directly in the frame
          (not inside ScrollArea) so its h-full stretches to the full aspect
          ratio — content scrolls, but the placeholder should fill the card
          like the stack view does. */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white">
        {hasContent ? (
          <ScrollArea className="h-full">
            <div className="space-y-0">
              {/* Profile Header - Hinge Style. Sits inline at the top of the
                  flow and scrolls away with the content (no longer floats). */}
              <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                <h2 className="text-xl font-bold text-gray-900">
                  {profileName || "Name"}
                  {age && `, ${age}`}
                </h2>
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              </div>

              {/* Content Flow - Photos and Prompts */}
              {content.map((item, index) => {
                if (item.type === "photo" && item.attachment) {
                  return (
                    <Fragment key={item.id}>
                      <div className="px-4 pb-3">
                        <div className="relative overflow-hidden rounded-2xl">
                          <Image
                            src={item.attachment.url}
                            alt={item.caption || `Photo ${index + 1}`}
                            width={400}
                            height={500}
                            className="aspect-[4/5] w-full object-cover"
                          />
                          {/* Caption if present */}
                          {item.caption && (
                            <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/80 to-transparent p-4">
                              <p className="text-sm text-white">
                                {item.caption}
                              </p>
                            </div>
                          )}
                          {/* Photo Number Indicator and Comment Button */}
                          <div className="absolute right-3 bottom-3 flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-sm font-bold text-white">
                              {index + 1}
                            </div>
                            {onFeedbackClick && (
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 border-0 bg-black/70 text-white hover:bg-black/80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onFeedbackClick(item.id);
                                }}
                              >
                                <MessageCircle className="h-4 w-4" />
                                {feedbackCounts?.[item.id] ? (
                                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                                    {(feedbackCounts[item.id] ?? 0) > 9
                                      ? "9+"
                                      : (feedbackCounts[item.id] ?? 0)}
                                  </div>
                                ) : null}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Inject the bio right after the second photo */}
                      {index === bioAfterIndex && bioSection}
                    </Fragment>
                  );
                }

                if (item.type === "prompt") {
                  return (
                    <div key={item.id} className="px-4 pb-3">
                      <div className="relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                        {onFeedbackClick && (
                          <div className="absolute top-3 right-3">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 border-0 bg-gray-100 text-gray-700 hover:bg-gray-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                onFeedbackClick(item.id);
                              }}
                            >
                              <MessageCircle className="h-4 w-4" />
                              {feedbackCounts?.[item.id] ? (
                                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                                  {(feedbackCounts[item.id] ?? 0) > 9
                                    ? "9+"
                                    : (feedbackCounts[item.id] ?? 0)}
                                </div>
                              ) : null}
                            </Button>
                          </div>
                        )}
                        <p className="mb-3 text-sm font-semibold text-gray-600">
                          {item.prompt}
                        </p>
                        <p className="text-base text-gray-900">{item.answer}</p>
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {/* Fallback: with fewer than two photos there's no "second
                  photo" to inject after, so the bio lands here instead. */}
              {bioAfterIndex === -1 && bioSection}

              {/* About me Section - Hinge Style */}
              <div className="bg-white px-4 pb-4">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-900">About me</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
                    <span>📏</span>
                    <span className="text-sm text-gray-900">194 cm</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
                    <span>🏃</span>
                    <span className="text-sm text-gray-900">Active</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
                    <span>🎓</span>
                    <span className="text-sm text-gray-900">
                      Graduate degree
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
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
                onClick={() => onAddContent?.()}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Photos
              </Button>
              <Link
                href="/app/profile-compare/photos"
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
