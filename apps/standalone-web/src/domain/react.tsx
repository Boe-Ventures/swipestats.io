"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import type { DomainClient, DomainRouter } from "@/server/domains/router";
import { createQueryClient } from "./query-client";

export const domainClient: DomainClient = createORPCClient(
  new RPCLink({
    url: "/api/domain",
  }),
);
export const domain = createTanstackQueryUtils(domainClient);
export function useDomainClient() {
  return domainClient;
}

export type RouterInputs = InferRouterInputs<DomainRouter>;
export type RouterOutputs = InferRouterOutputs<DomainRouter>;

export function useDomain() {
  return domain;
}

export function DomainProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
