"use client";

import { useState } from "react";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { useDomain } from "@/domain/react";

export function LatestPost() {
  const domain = useDomain();
  const queryClient = useQueryClient();
  const { data: latestPost } = useSuspenseQuery(
    domain.post.getLatest.queryOptions(),
  );

  const [name, setName] = useState("");
  const createPost = useMutation(
    domain.post.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          domain.post.getLatest.queryOptions(),
        );
        setName("");
      },
    }),
  );

  return (
    <div className="w-full max-w-xs">
      {latestPost ? (
        <p className="truncate">Your most recent post: {latestPost.name}</p>
      ) : (
        <p>You have no posts yet.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPost.mutate({ name });
        }}
        className="flex flex-col gap-2"
      >
        <input
          type="text"
          placeholder="Title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-full bg-white/10 px-4 py-2 text-white"
        />
        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          disabled={createPost.isPending}
        >
          {createPost.isPending ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
