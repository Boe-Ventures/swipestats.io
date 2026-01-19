"use client";

import Link from "next/link";
import {
  Info,
  Check,
  Plus,
  Image as ImageIcon,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { RouterOutputs } from "@/trpc/react";
import type { ProviderConfig } from "./provider-config";

type ComparisonColumn =
  RouterOutputs["profileCompare"]["get"]["columns"][number];

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
  const photos = content.filter((c) => c.type === "photo");
  const prompts = content.filter((c) => c.type === "prompt");
  const displayBio = column.bio || defaultBio || "";

  const hasContent = content.length > 0;

  return (
    <div
      className="relative overflow-hidden rounded-xl shadow-2xl"
      style={{
        background: `linear-gradient(135deg, ${providerConfig.brandColor}22 0%, ${providerConfig.secondaryColor}11 100%)`,
      }}
    >
      {/* Mock Device Frame */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white">
        <ScrollArea className="h-full">
          {hasContent ? (
            <div className="space-y-0">
              {/* Profile Header - Hinge Style */}
              <div className="sticky top-0 z-10 bg-white px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">
                      {profileName || "Name"}
                      {age && `, ${age}`}
                    </h2>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${providerConfig.brandColor}22`,
                      color: providerConfig.brandColor,
                    }}
                  >
                    {providerConfig.name}
                  </Badge>
                </div>
              </div>

              {/* Content Flow - Photos and Prompts */}
              {content.map((item, index) => {
                if (item.type === "photo" && item.attachment) {
                  return (
                    <div key={item.id} className="px-4 pb-3">
                      <div className="relative overflow-hidden rounded-2xl">
                        <img
                          src={item.attachment.url}
                          alt={item.caption || `Photo ${index + 1}`}
                          className="aspect-[4/5] w-full object-cover"
                        />
                        {/* Caption if present */}
                        {item.caption && (
                          <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                            <p className="text-sm text-white">{item.caption}</p>
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

              {/* My bio Section - Hinge Style */}
              {displayBio && (
                <div className="bg-white px-4 pb-4">
                  <div className="mb-3">
                    <h3 className="text-lg font-bold text-gray-900">My bio</h3>
                  </div>
                  <p className="text-base leading-relaxed text-gray-900">
                    {displayBio}
                  </p>
                </div>
              )}

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

              {/* Prompts Section Placeholder (V2) */}
              <div className="bg-gray-50 px-4 pt-4 pb-6">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-900">Prompts</h3>
                </div>
                <div className="bg-muted/50 flex items-center justify-center rounded-xl border border-dashed py-8">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-1 text-sm font-medium">
                      Coming in V2
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Add Hinge-style prompts with answers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-white p-6 text-center">
              <div className="mb-4 rounded-full bg-gray-100 p-4">
                <Plus className="text-muted-foreground h-8 w-8" />
              </div>
              <p className="mb-2 font-medium text-gray-900">No content yet</p>
              <p className="text-muted-foreground mb-4 text-sm">
                Click to add photos and preview your {providerConfig.name}{" "}
                profile
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
        </ScrollArea>
      </div>
    </div>
  );
}
