"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { useTRPC } from "@/trpc/react";
import { useHingeInsights } from "../HingeInsightsProvider";
import { Button, ButtonLink } from "@/components/ui/button";
import { ShareButton } from "@/components/ShareButton";
import { getProfileColor } from "@/lib/charts/profile-colors";
import { HingeComparisonView } from "./HingeComparisonView";
import {
  isHingeProfileId,
  parseHingeComparisonInput,
} from "@/lib/hinge/comparison-input";

export function HingeComparePage() {
  const { hingeId, isOwner } = useHingeInsights();
  const trpc = useTRPC();
  const [urlIds, setIds] = useQueryState(
    "compare",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const comparisonIds = useMemo(
    () =>
      [
        ...new Set(
          urlIds.filter((id) => isHingeProfileId(id) && id !== hingeId),
        ),
      ].slice(0, 3),
    [urlIds, hingeId],
  );
  const ids = useMemo(
    () => [hingeId, ...comparisonIds],
    [hingeId, comparisonIds],
  );
  const query = useQuery(
    trpc.hingeProfile.getComparison.queryOptions(
      { hingeIds: ids },
      { refetchOnWindowFocus: false },
    ),
  );
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = (value: string) => {
    const id = parseHingeComparisonInput(value);
    if (!id) {
      setError("Enter a Hinge insights link or a 64-character profile ID.");
      return;
    }
    if (ids.includes(id)) {
      setError("That profile is already in this comparison.");
      return;
    }
    if (comparisonIds.length >= 3) {
      setError("You can compare up to four profiles. Remove one first.");
      return;
    }
    void setIds([...comparisonIds, id]);
    setInput("");
    setError(null);
  };
  const remove = (id: string) => {
    void setIds(comparisonIds.filter((other) => other !== id));
  };
  const [browse, setBrowse] = useState(false);
  const directory = useQuery(
    trpc.directory.list.queryOptions(
      { page: 1, limit: 10, platform: "hinge", sortBy: "newest" },
      { enabled: browse },
    ),
  );
  const profiles = ids.flatMap((id) => {
    const profile = query.data?.profiles.find((p) => p.hingeId === id);
    return profile ? [profile] : [];
  });
  return (
    <main className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Compare Hinge profiles
            </h1>
            <p className="text-muted-foreground mt-2">
              See recorded activity on one shared calendar timeline.
            </p>
          </div>
          <div className="flex gap-2">
            <ShareButton
              title="Hinge profile comparison"
              text="Compare our recorded Hinge activity"
            />
            <ButtonLink variant="outline" href={`/insights/hinge/${hingeId}`}>
              Main insights
            </ButtonLink>
          </div>
        </header>
        <section className="bg-card rounded-xl border p-5">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              add(input);
            }}
          >
            <label className="min-w-0 basis-full text-sm font-medium sm:flex-1 sm:basis-0">
              Hinge profile link or ID
              <input
                className="bg-background mt-2 block w-full rounded-md border p-2.5 text-sm"
                placeholder="Paste a friend's Hinge insights link"
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
            </label>
            <Button type="submit" disabled={comparisonIds.length >= 3}>
              Add comparison
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBrowse(!browse)}
            >
              {browse ? "Close directory" : "Browse profiles"}
            </Button>
          </form>
          {error && (
            <p
              role="alert"
              className="mt-3 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}
          {urlIds.length !== comparisonIds.length && (
            <p className="text-muted-foreground mt-3 text-sm">
              Invalid, duplicate, or excess profile IDs in the link were
              ignored. Comparisons support four profiles.
            </p>
          )}
          {browse && (
            <div className="mt-4 space-y-3">
              <p className="text-muted-foreground text-sm">
                Or paste a link directly. Each person should upload under their
                own account.
              </p>
              {directory.isLoading ? (
                <p>Loading profiles...</p>
              ) : directory.isError ? (
                <p>
                  Could not load the directory. You can still add a profile
                  link.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {directory.data?.profiles
                    .filter((p) => !ids.includes(p.id))
                    .map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        className="hover:bg-muted rounded-lg border p-3 text-left text-sm"
                        disabled={comparisonIds.length >= 3}
                        onClick={() => add(profile.id)}
                      >
                        {profile.ageAtUpload ?? "N/A"} · {profile.gender} ·{" "}
                        {profile.country || "N/A"}
                        <span className="text-muted-foreground mt-1 block font-mono text-xs">
                          {profile.id.slice(0, 12)}…
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </section>
        <div className="flex flex-wrap gap-2">
          {ids.map((id, index) => (
            <div
              className="bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              key={id}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: getProfileColor(index) }}
              />
              <span>
                {index === 0
                  ? isOwner
                    ? "You"
                    : "Base profile"
                  : `Profile ${index + 1}`}
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                {id.slice(0, 8)}
              </span>
              {index > 0 && (
                <button
                  type="button"
                  aria-label={`Remove profile ${index + 1}`}
                  className="ml-2 underline"
                  onClick={() => remove(id)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        {query.isLoading ? (
          <p role="status">Loading comparison...</p>
        ) : query.isError ? (
          <div role="alert" className="rounded-xl border p-5">
            <p>Could not load this comparison.</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                void query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : (
          <>
            {!!query.data?.missingIds.length && (
              <p
                role="alert"
                className="text-muted-foreground rounded-lg border p-4 text-sm"
              >
                Some profiles were not found. Check their links or remove them.
                Available profiles are shown below.
              </p>
            )}
            {profiles.length > 0 && (
              <HingeComparisonView
                profiles={profiles}
                baseId={hingeId}
                baseIsOwner={isOwner}
                order={ids}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
