import { RPCHandler } from "@orpc/server/fetch";
import { createDomainContext } from "@/server/domains/context";
import { domainRouter } from "@/server/domains/router";

const handler = new RPCHandler(domainRouter);

async function handle(request: Request) {
  const context = await createDomainContext({ headers: request.headers });
  const { response } = await handler.handle(request, {
    prefix: "/api/domain",
    context,
  });
  return response ?? new Response("Not found", { status: 404 });
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
  handle as HEAD,
};

export const maxDuration = 800;
