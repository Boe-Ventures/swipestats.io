import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { createDomainContext } from "@/server/domains/context";
import { domainRouter } from "@/server/domains/router";
import { generateDomainOpenAPI } from "@/server/domains/openapi";

const handler = new OpenAPIHandler(domainRouter, {
  plugins: [
    new OpenAPIReferenceHandlerPlugin({
      spec: generateDomainOpenAPI,
      docsPath: "/docs",
      specPath: "/openapi.json",
    }),
  ],
});

async function handle(request: Request) {
  const context = await createDomainContext({ headers: request.headers });
  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
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
