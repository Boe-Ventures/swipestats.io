"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LayoutGrid, Loader2 } from "lucide-react";

import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useTinderProfile } from "../TinderProfileProvider";

/**
 * CTA promoting the Visual Profile Compare feature.
 *
 * For the profile owner it offers a one-tap path that seeds a comparison from
 * the photos they've already uploaded; everyone else sees the generic promo.
 */
export function ProfileCompareCtaCard() {
  const { tinderId, isOwner, isAnonymous } = useTinderProfile();
  const trpc = useTRPC();
  const router = useRouter();

  const canSeed = isOwner && !isAnonymous;

  const mediaQuery = useQuery(
    trpc.profile.getMedia.queryOptions(
      { tinderId },
      { enabled: canSeed, refetchOnWindowFocus: false },
    ),
  );

  const photos = (mediaQuery.data ?? []).filter((m) => m.url);
  const previewPhotos = photos.slice(0, 5);

  const createMutation = useMutation(
    trpc.profileCompare.createFromTinderMedia.mutationOptions({
      onSuccess: (comparison) => {
        toast.success("Comparison created from your photos");
        router.push(`/app/profile-compare/${comparison.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Couldn't build your comparison");
      },
    }),
  );

  // Owner has photos to seed from → the magic one-tap path.
  const showSeed = canSeed && (mediaQuery.isLoading || photos.length > 0);

  if (!showSeed) {
    // Generic promo for non-owners, anonymous, or owners without photos yet.
    return (
      <Card className="h-full shadow-lg transition-shadow hover:shadow-xl">
        <CardContent className="flex h-full flex-col p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
              <LayoutGrid className="text-muted-foreground h-5 w-5" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">
              Compare Your Dating App Profiles
            </h3>
          </div>
          <p className="text-muted-foreground mb-6 text-base leading-7">
            Create beautiful side-by-side comparisons of your Tinder, Hinge, and
            Bumble profiles. Share with friends or use for feedback.
          </p>
          <div className="mt-auto flex items-center gap-x-4 pt-2">
            <Link href="/app/dashboard">
              <Button>
                Compare My Profiles
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <span className="text-muted-foreground text-sm font-medium">
              Free to use
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg transition-shadow hover:shadow-xl">
      <CardContent className="flex flex-col p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950">
            <LayoutGrid className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">
            Turn your profile into a comparison
          </h3>
        </div>

        <p className="text-muted-foreground mb-5 text-base leading-7">
          Drop your Tinder photos into a shareable, side-by-side profile and get
          honest feedback from friends — no re-uploading.
        </p>

        {/* Live strip of their actual photos */}
        <div className="mb-6 flex items-center gap-2">
          {mediaQuery.isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted h-14 w-14 shrink-0 animate-pulse rounded-lg"
                />
              ))
            : previewPhotos.map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m.id}
                  src={m.url}
                  alt=""
                  className="border-background h-14 w-14 shrink-0 rounded-lg border-2 object-cover shadow-sm"
                />
              ))}
          {photos.length > previewPhotos.length && (
            <span className="text-muted-foreground text-sm font-medium">
              +{photos.length - previewPhotos.length}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center gap-x-4 pt-2">
          <Button
            onClick={() => createMutation.mutate({ tinderId })}
            disabled={createMutation.isPending}
            className="bg-rose-600 text-white hover:bg-rose-500"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Building…
              </>
            ) : (
              <>
                Build my comparison
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <span className="text-muted-foreground text-sm font-medium">
            Free · opens in the editor
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
