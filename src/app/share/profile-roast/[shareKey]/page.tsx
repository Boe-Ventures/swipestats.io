"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Flame, CircleDot, Layers, MessageSquareText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/components/ui/lib/utils";

import { useTRPC, type RouterOutputs } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { getProviderConfig } from "@/app/app/profile-compare/[id]/provider-config";
import { StackView } from "@/app/app/profile-compare/[id]/stack-view";

type PublicRoast = RouterOutputs["roast"]["getPublicProfileRoast"];

const KEEP_CUT_STYLES: Record<string, string> = {
  keep: "bg-green-500/15 text-green-600 dark:text-green-400",
  maybe: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  cut: "bg-red-500/15 text-red-600 dark:text-red-400",
};

const SECTION_HEADER =
  "text-muted-foreground text-xs font-semibold tracking-widest uppercase";

export default function SharedProfileRoastPage() {
  const params = useParams<{ shareKey: string }>();
  const shareKey = params.shareKey;
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.roast.getPublicProfileRoast.queryOptions({ shareKey }),
  );

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="container mx-auto max-w-2xl space-y-6 px-4 py-10">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Roast not found</h2>
          <p className="text-muted-foreground mt-2">
            This roast may have been deleted or is no longer shared.
          </p>
          <Link href="https://www.swipestats.io" className="mt-4 inline-block">
            <Button>Go to SwipeStats</Button>
          </Link>
        </div>
      </div>
    );
  }

  const subject = data.profileName || data.comparisonName || "this profile";
  const hasPreview = data.column !== null && data.column.content.length > 0;

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="from-muted/30 to-background border-b bg-linear-to-b">
        <div className="container mx-auto max-w-2xl px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
                <Flame className="h-6 w-6 text-rose-500" />
                Roast of {subject}
              </h1>
              <p className="text-muted-foreground text-sm">
                Shared via SwipeStats ·{" "}
                {formatDistanceToNow(new Date(data.updatedAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <Link href="https://www.swipestats.io" target="_blank">
              <Button size="sm" className="whitespace-nowrap">
                <ExternalLink className="mr-2 h-4 w-4" />
                Roast yours
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8">
        <Tabs defaultValue="roast">
          <TabsList className="mb-6">
            <TabsTrigger value="roast">
              <Flame className="mr-1.5 h-4 w-4" />
              Roast
            </TabsTrigger>
            <TabsTrigger value="profile" disabled={!hasPreview}>
              <Layers className="mr-1.5 h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roast">
            <RoastView data={data} />
          </TabsContent>

          <TabsContent value="profile">
            {data.column && data.providerKey ? (
              <div className="mx-auto max-w-sm">
                <StackView
                  column={data.column}
                  providerConfig={getProviderConfig(data.providerKey)}
                  defaultBio={data.defaultBio ?? undefined}
                  profileName={data.profileName ?? undefined}
                  age={data.age ?? undefined}
                />
              </div>
            ) : (
              <p className="text-muted-foreground py-12 text-center text-sm">
                The profile behind this roast is no longer available.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground text-sm">
            Roasted with{" "}
            <Link
              href="https://www.swipestats.io"
              className="font-semibold hover:underline"
            >
              SwipeStats
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function RoastView({ data }: { data: PublicRoast }) {
  const photos = data.photos.filter((p) => p.url);
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-5 text-white sm:p-6">
        <div className="space-y-3">
          <Badge
            variant="secondary"
            className="border-0 bg-white/10 font-medium text-white"
          >
            {data.overall.tagline}
          </Badge>
          <p className="font-serif text-2xl leading-snug italic sm:text-3xl">
            {data.overall.headline}
          </p>
          <p className="text-sm text-zinc-300">{data.overall.verdict}</p>
        </div>
      </div>

      {/* Photo verdicts */}
      {photos.length > 0 && (
        <section className="space-y-3">
          <h3 className={SECTION_HEADER}>Photo verdicts</h3>
          {photos.map((p, i) => (
            <div key={p.contentId ?? i} className="flex gap-3">
              <div className="bg-muted relative h-24 w-20 shrink-0 overflow-hidden rounded-lg">
                {p.url && (
                  <Image
                    src={p.url}
                    alt={`Photo ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                )}
                <span className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <Badge
                  className={cn(
                    "mb-1 border-0 capitalize",
                    KEEP_CUT_STYLES[p.keepOrCut],
                  )}
                >
                  {p.keepOrCut}
                </Badge>
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Prompt verdicts */}
      {data.prompts.length > 0 && (
        <section className="space-y-3">
          <h3 className={SECTION_HEADER}>Prompts</h3>
          {data.prompts.map((p, i) => (
            <div key={p.contentId ?? i} className="space-y-2 rounded-xl border p-3">
              {p.prompt && (
                <p className="text-muted-foreground text-xs font-medium">
                  {p.prompt}
                </p>
              )}
              {p.answer && (
                <p className="text-sm leading-relaxed italic">
                  &ldquo;{p.answer}&rdquo;
                </p>
              )}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {p.roast}
              </p>
              {p.rewrite && (
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 dark:border-rose-900/40 dark:bg-rose-950/20">
                  <span className="text-sm font-semibold">Try this instead</span>
                  <p className="mt-1 text-sm leading-relaxed italic">
                    &ldquo;{p.rewrite}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Bio */}
      {data.bio && (
        <section className="space-y-3">
          <h3 className={SECTION_HEADER}>The bio</h3>
          {data.bio.text && (
            <div className="rounded-xl border p-3">
              <p className="text-sm leading-relaxed italic">
                &ldquo;{data.bio.text}&rdquo;
              </p>
            </div>
          )}
          <p className="text-muted-foreground text-sm leading-relaxed">
            {data.bio.roast}
          </p>
        </section>
      )}

      {/* What to change */}
      {data.realTalk.length > 0 && (
        <section className="space-y-3">
          <h3 className={SECTION_HEADER}>What to change</h3>
          <ul className="space-y-2.5">
            {data.realTalk.map((item, i) => (
              <li key={i} className="flex gap-2.5">
                <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.detail && (
                    <p className="text-muted-foreground text-xs">
                      {item.detail}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Footer CTA inside the roast */}
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 text-center dark:border-rose-900/40 dark:from-rose-950/30 dark:to-transparent">
        <MessageSquareText className="mx-auto mb-2 h-6 w-6 text-rose-500" />
        <p className="font-semibold">Want yours roasted like this?</p>
        <Link href="https://www.swipestats.io" target="_blank">
          <Button className="mt-3 bg-rose-600 text-white hover:bg-rose-500">
            Roast my profile 🔥
          </Button>
        </Link>
      </div>
    </div>
  );
}
