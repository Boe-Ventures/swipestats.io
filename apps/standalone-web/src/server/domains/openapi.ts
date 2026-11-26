import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { domainRouter } from "./router";

const generator = new OpenAPIGenerator({
  converters: [new ZodToJsonSchemaConverter()],
});
export function generateDomainOpenAPI() {
  return generator.generate(domainRouter, {
    base: {
      info: { title: "SwipeStats domain API", version: "2.0.0" },
      servers: [{ url: "/api/rpc" }],
    },
  });
}
