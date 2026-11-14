import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import {
  dehydrate,
  HydrationBoundary,
  type QueryKey,
  type FetchQueryOptions,
} from "@tanstack/react-query";
import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createDomainContext } from "@/server/domains/context";
import { domainRouter } from "@/server/domains/router";
import { createQueryClient } from "./query-client";

const createContext = cache(async () =>
  createDomainContext({ headers: new Headers(await headers()) }),
);
const client = createRouterClient(domainRouter, { context: createContext });
const getQueryClient = cache(createQueryClient);
export const domain = createTanstackQueryUtils(client);
export const domainApi = cache(async () => client);

export function HydrateClient({ children }: { children: React.ReactNode }) {
  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {children}
    </HydrationBoundary>
  );
}

export function prefetch<TData, TError, TKey extends QueryKey>(
  options: FetchQueryOptions<TData, TError, TData, TKey>,
) {
  return getQueryClient().prefetchQuery(options);
}
