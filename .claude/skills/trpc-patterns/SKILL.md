---
name: trpc-patterns
description: tRPC v11 with React Query integration patterns. Use when implementing tRPC queries, mutations, or server-side calls. Triggers on tasks involving tRPC client hooks, server components, or data fetching.
allowed-tools: Read, Write, Edit
---

# tRPC Patterns

**CRITICAL**: Projects using tRPC v11 with React Query integration must use the correct patterns below.

## ❌ WRONG Pattern (Old tRPC v10)

```typescript
// DON'T USE THIS - This is the OLD pattern
const { data } = trpc.brand.getById.useQuery({ brandId: "..." });
```

## ✅ CORRECT Patterns

### Client-Side Queries (in "use client" components)

```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/react";

export function MyComponent() {
  const trpc = useTRPC();

  // ✅ CORRECT: Use useQuery with queryOptions
  const { data, isLoading } = useQuery(
    trpc.brand.getById.queryOptions({ brandId: "brand_123" })
  );

  return <div>{data?.name}</div>;
}
```

### Client-Side Mutations (in "use client" components)

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/react";

export function MyComponent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // ✅ CORRECT: Use useMutation with mutationOptions
  const createBrand = useMutation(
    trpc.brand.create.mutationOptions({
      onSuccess: async () => {
        // Invalidate queries after mutation
        await queryClient.invalidateQueries(
          trpc.brand.list.queryOptions()
        );
      },
    })
  );

  return (
    <button onClick={() => createBrand.mutate({ name: "New Brand" })}>
      Create
    </button>
  );
}
```

### Server-Side Usage (in Server Components or API routes)

```typescript
import { trpcApi } from "@/trpc/server";

export default async function MyServerComponent() {
  const caller = await trpcApi();

  // ✅ CORRECT: Direct server-side call
  const brand = await caller.brand.getById({ brandId: "brand_123" });

  return <div>{brand.name}</div>;
}
```

### Server-Side Prefetching (for hydration)

```typescript
import { trpc, HydrateClient, prefetch } from "@/trpc/server";

export default async function Page() {
  // ✅ CORRECT: Prefetch data for client-side hydration
  prefetch(trpc.brand.list.queryOptions());

  return (
    <HydrateClient>
      <MyClientComponent />
    </HydrateClient>
  );
}
```

## Quick Reference

| Context | Import | Pattern |
|---------|--------|---------|
| Client Query | `useQuery` from `@tanstack/react-query` | `useQuery(trpc.proc.queryOptions(input))` |
| Client Mutation | `useMutation` from `@tanstack/react-query` | `useMutation(trpc.proc.mutationOptions(opts))` |
| Server Component | `trpcApi` from `@/trpc/server` | `const caller = await trpcApi(); await caller.proc(input)` |
| Server Prefetch | `prefetch` from `@/trpc/server` | `prefetch(trpc.proc.queryOptions(input))` |

## Common Imports

```typescript
// Client components ("use client")
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/react";

// Server components (no "use client")
import { trpcApi, trpc, HydrateClient, prefetch } from "@/trpc/server";
```

## Why This Pattern?

tRPC v11's new React Query integration:
- Provides better type safety
- Enables proper SSR hydration
- Follows React Query best practices
- Allows fine-grained control over caching

**Never use the old `.useQuery()` / `.useMutation()` methods directly on tRPC procedures!**
